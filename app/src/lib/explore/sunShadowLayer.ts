// Sun and shadow: the drawing half. One custom WebGL layer in the map's own context. Each chunk in view is one
// square; the fragment shader reads the bit for the current half hour and the next from the chunk's page texture and
// mixes them, so playing or scrubbing costs one draw per chunk and no uploads. Pages are fetched and decoded off the
// frame, and uploaded as textures one per frame inside render() (the only place the map lets a layer touch GL state).
import type { CustomLayerInterface, CustomRenderMethodInput, Map as MLMap } from 'maplibre-gl';
import { HOURS_ALPHA, HOURS_RAMP, SHADOW_ALPHA, SHADOW_COLOR, bitAddress, decodeGrayPng, evict, hexRgb, lodFor, pageUrl, quadMatrix, stepAt, tileBox, visibleChunks, type FineLevel, type ShadowManifest } from './sunShadow';
import type { SunView } from './sunShadowStore';

export const SUN_LAYER_ID = 'sun-shadow';
const MAX_HOLES = 12;
const MAX_FETCHES = 4;

const VERT = `#version 300 es
uniform mat4 u_matrix;
in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos;
  gl_Position = u_matrix * vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
precision highp int;
uniform highp sampler2D u_a;
uniform highp sampler2D u_b;
uniform int u_bit_a;
uniform int u_bit_b;
uniform float u_frac;
uniform int u_mode;            // 0 = shadow at one moment, 1 = hours of direct sun
uniform vec2 u_size;           // page size in pixels
uniform vec3 u_color;
uniform float u_alpha;
uniform float u_steps;         // steps in the day (hours view)
uniform float u_nodata;
uniform vec3 u_ramp[5];
uniform vec4 u_holes[${MAX_HOLES}]; // parts of this square that a sharper chunk already covers (x0, y0, x1, y1)
uniform int u_nholes;
in vec2 v_uv;
out vec4 o;

int texel(highp sampler2D s, ivec2 p) {
  return int(texelFetch(s, clamp(p, ivec2(0), ivec2(u_size) - 1), 0).r * 255.0 + 0.5);
}
float bitAt(highp sampler2D s, ivec2 p, int b) {
  return float((texel(s, p) >> b) & 1);
}
// Smooth (cubic B-spline) weights for the four cells around a point.
vec4 cubic(float f) {
  float f2 = f * f, f3 = f2 * f;
  return vec4((1.0 - f) * (1.0 - f) * (1.0 - f), 3.0 * f3 - 6.0 * f2 + 4.0, -3.0 * f3 + 3.0 * f2 + 3.0 * f + 1.0, f3) / 6.0;
}
// How much of the 4 x 4 cells around this point is in shadow at one step, 0..1, weighted smoothly.
float field(highp sampler2D s, int b, ivec2 i, vec4 wx, vec4 wy) {
  float v = 0.0;
  for (int y = 0; y < 4; y++) {
    float row = 0.0;
    for (int x = 0; x < 4; x++) row += wx[x] * bitAt(s, i + ivec2(x - 1, y - 1), b);
    v += wy[y] * row;
  }
  return v;
}
// Closer than the data, the smooth field is cut at one half: the shadow gets a clean curved edge about a screen
// pixel wide instead of a staircase of square cells. Farther out than the data, the field itself is the answer
// (the share of each screen pixel in shadow), which keeps tree-covered slopes from flickering.
float edge(float v, float cellsPerPixel) {
  float w = clamp(fwidth(v) * 0.8, 0.03, 0.5);
  return mix(smoothstep(0.5 - w, 0.5 + w, v), v, smoothstep(0.5, 1.1, cellsPerPixel));
}
void main() {
  for (int k = 0; k < u_nholes; k++) {
    vec4 h = u_holes[k];
    if (v_uv.x >= h.x && v_uv.x < h.z && v_uv.y >= h.y && v_uv.y < h.w) discard;
  }
  vec2 st = v_uv * u_size - 0.5;
  ivec2 i = ivec2(floor(st));
  vec2 f = fract(st);
  vec4 wx = cubic(f.x), wy = cubic(f.y);
  float cellsPerPixel = max(fwidth(st.x), fwidth(st.y));
  if (u_mode == 0) {
    float a = mix(edge(field(u_a, u_bit_a, i, wx, wy), cellsPerPixel), edge(field(u_b, u_bit_b, i, wx, wy), cellsPerPixel), u_frac) * u_alpha;
    o = vec4(u_color * a, a);
  } else {
    // Sunlit steps, averaged smoothly over the cells that have data.
    float sum = 0.0, wsum = 0.0;
    for (int y = 0; y < 4; y++) {
      for (int x = 0; x < 4; x++) {
        float v = float(texel(u_a, i + ivec2(x - 1, y - 1)));
        float w = wx[x] * wy[y] * step(v, u_nodata - 0.5);
        sum += w * v;
        wsum += w;
      }
    }
    if (wsum < 0.5) discard;
    float x = clamp(sum / wsum / max(u_steps, 1.0), 0.0, 1.0) * 4.0;
    int j = int(min(floor(x), 3.0));
    vec3 c = mix(u_ramp[j], u_ramp[j + 1], x - float(j));
    o = vec4(c * u_alpha, u_alpha);
  }
}`;

interface Page {
  key: string;
  state: 'loading' | 'decoded' | 'ready' | 'failed';
  data?: Uint8Array;
  width: number;
  height: number;
  tex?: WebGLTexture;
  bytes: number;
  used: number;
  abort?: AbortController;
}

export interface SunFrame {
  day: string;
  /** Fractional step index. */
  t: number;
  view: Exclude<SunView, 'parcel'>;
  /** No blending between steps (reduced motion). */
  snap: boolean;
  /** From this map zoom up, the chunks named in `skip` (as `x_y`) are not drawn: the lot layer shows them instead. */
  maxZoom?: number | null;
  skip?: ReadonlySet<string>;
}

export interface SunShadowLayer {
  layer: CustomLayerInterface;
  setFrame(f: SunFrame): void;
  /** True while pages the current view needs are still on their way. */
  loading(): boolean;
  dispose(): void;
}

/**
 * The layer for one map. `base` is where the pages live; `budget` is the texture memory to stay under, in bytes.
 * `onChange` fires when loading starts or ends, so the control can show it.
 */
export function createSunShadowLayer(map: MLMap, manifest: ShadowManifest, base: string, opts: { budget: number; maxChunks: number; fine: FineLevel | null; onChange: () => void }): SunShadowLayer {
  let frame: SunFrame = { day: manifest.days[0].id, t: 0, view: 'shadow', snap: false };
  let gl: WebGL2RenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let vao: WebGLVertexArrayObject | null = null;
  let buffer: WebGLBuffer | null = null;
  const uni: Record<string, WebGLUniformLocation | null> = {};
  const pages = new Map<string, Page>();
  let tick = 0;
  let fetching = 0;
  let wanted: string[] = [];
  let wasLoading = false;
  let disposed = false;
  const ramp = new Float32Array(HOURS_RAMP.flatMap(hexRgb));
  const { z } = manifest.grid;
  const ov = manifest.overview;
  const ovBox: [number, number, number, number] = [ov.x0 / 2 ** z, ov.y0 / 2 ** z, ov.nx / 2 ** z, ov.ny / 2 ** z];

  const dayOf = () => manifest.days.find((d) => d.id === frame.day) ?? manifest.days[0];

  const lod = () => lodFor(map.getZoom(), frame.view === 'shadow' ? opts.fine?.minZoom : null);
  const skipped = (x: number, y: number) => frame.maxZoom != null && map.getZoom() >= frame.maxZoom && !!frame.skip?.has(`${x}_${y}`);

  /** The page keys the current frame reads for one square (a chunk, or the overview when null), from the fine level when asked. */
  function keysFor(chunk: [number, number] | null, fine: FineLevel | null = null): { a: string; b: string; bitA: number; bitB: number; frac: number } {
    const day = dayOf();
    if (frame.view === 'hours') {
      const k = pageUrl(manifest, base, day.id, chunk, 'hours');
      return { a: k, b: k, bitA: 0, bitB: 0, frac: 0 };
    }
    const { k, next, frac } = stepAt(frame.t, day.steps.length);
    const A = bitAddress(k, manifest.bitsPerPage), B = bitAddress(next, manifest.bitsPerPage);
    return { a: pageUrl(manifest, base, day.id, chunk, A.page, fine), b: pageUrl(manifest, base, day.id, chunk, B.page, fine), bitA: A.bit, bitB: B.bit, frac: frame.snap ? Math.round(frac) : frac };
  }

  function chunksInView(): [number, number][] {
    const level = lod();
    if (level !== 'chunks' && level !== 'fine') return [];
    const b = map.getBounds();
    const c = map.getCenter();
    return visibleChunks({ west: b.getWest(), south: b.getSouth(), east: b.getEast(), north: b.getNorth() }, [c.lng, c.lat], manifest, opts.maxChunks);
  }

  function request(key: string) {
    if (pages.has(key) || fetching >= MAX_FETCHES || disposed) return;
    const page: Page = { key, state: 'loading', width: 0, height: 0, bytes: 0, used: tick, abort: new AbortController() };
    pages.set(key, page);
    fetching++;
    fetch(key, { signal: page.abort!.signal })
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
      .then(decodeGrayPng)
      .then((img) => {
        Object.assign(page, { state: 'decoded', data: img.data, width: img.width, height: img.height, bytes: img.data.length });
      })
      .catch((e: unknown) => {
        // a cancelled request is forgotten so it can be asked for again; a real failure is remembered so it is not retried every frame
        if ((e as { name?: string })?.name === 'AbortError') pages.delete(key);
        else page.state = 'failed';
      })
      .finally(() => {
        fetching--;
        if (!disposed) map.triggerRepaint();
      });
  }

  /** Ask for what the view needs (nearest first), cancel what it no longer needs, and report loading changes. */
  function plan(chunks: [number, number][]) {
    const level = lod();
    // In order of need: the overview, the regular chunks (small, and what shows while fine pages load), then the fine ones.
    const squares: { chunk: [number, number] | null; fine: FineLevel | null }[] = level === 'none' ? [] : [{ chunk: null, fine: null }, ...chunks.map((chunk) => ({ chunk, fine: null }))];
    if (level === 'fine' && opts.fine) for (const chunk of chunks) squares.push({ chunk, fine: opts.fine });
    wanted = [];
    for (const sq of squares) {
      const k = keysFor(sq.chunk, sq.fine);
      wanted.push(k.a);
      if (k.b !== k.a) wanted.push(k.b);
    }
    // The page after the current one, so playback does not blink when it crosses a page boundary.
    if (frame.view === 'shadow' && level !== 'none') {
      const day = dayOf();
      const ahead = bitAddress(Math.min(stepAt(frame.t, day.steps.length).k + manifest.bitsPerPage, day.steps.length - 1), manifest.bitsPerPage).page;
      for (const sq of squares) {
        const key = pageUrl(manifest, base, day.id, sq.chunk, ahead, sq.fine);
        if (!wanted.includes(key)) wanted.push(key);
      }
    }
    const want = new Set(wanted);
    for (const p of pages.values()) if (p.state === 'loading' && !want.has(p.key)) p.abort?.abort();
    for (const key of wanted) request(key);
  }

  /** Tell the control when pages start or finish arriving. */
  function report() {
    const now = wanted.some((k) => {
      const s = pages.get(k)?.state;
      return s !== 'ready' && s !== 'failed';
    });
    if (now !== wasLoading) {
      wasLoading = now;
      opts.onChange();
    }
  }

  function upload(g: WebGL2RenderingContext) {
    // one texture per frame: a 2048 x 2048 page is 4 MB, and more than one upload in a frame shows as a stutter
    const next = wanted.map((k) => pages.get(k)).find((p) => p?.state === 'decoded') ?? [...pages.values()].find((p) => p.state === 'decoded');
    if (!next || !next.data) return;
    const tex = g.createTexture();
    g.activeTexture(g.TEXTURE0);
    g.bindTexture(g.TEXTURE_2D, tex);
    g.pixelStorei(g.UNPACK_ALIGNMENT, 1);
    g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, false);
    g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    g.texImage2D(g.TEXTURE_2D, 0, g.R8, next.width, next.height, 0, g.RED, g.UNSIGNED_BYTE, next.data);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    Object.assign(next, { tex, state: 'ready', data: undefined });
    if ([...pages.values()].some((p) => p.state === 'decoded')) map.triggerRepaint();
  }

  function trim(g: WebGL2RenderingContext) {
    const ready = [...pages.values()].filter((p) => p.state === 'ready');
    for (const key of evict(ready, opts.budget, new Set(wanted))) {
      const p = pages.get(key);
      if (p?.tex) g.deleteTexture(p.tex);
      pages.delete(key);
    }
  }

  function draw(g: WebGL2RenderingContext, main: ArrayLike<number>, box: [number, number, number, number], chunk: [number, number] | null, holes: number[], fine: FineLevel | null = null): boolean {
    const k = keysFor(chunk, fine);
    const a = pages.get(k.a), b = pages.get(k.b);
    if (a?.state !== 'ready' || b?.state !== 'ready' || !a.tex || !b.tex) return false;
    a.used = b.used = tick;
    const day = dayOf();
    g.uniformMatrix4fv(uni.u_matrix, false, quadMatrix(main, box));
    g.activeTexture(g.TEXTURE0);
    g.bindTexture(g.TEXTURE_2D, a.tex);
    g.activeTexture(g.TEXTURE1);
    g.bindTexture(g.TEXTURE_2D, b.tex);
    g.uniform1i(uni.u_a, 0);
    g.uniform1i(uni.u_b, 1);
    g.uniform1i(uni.u_bit_a, k.bitA);
    g.uniform1i(uni.u_bit_b, k.bitB);
    g.uniform1f(uni.u_frac, k.frac);
    g.uniform1i(uni.u_mode, frame.view === 'hours' ? 1 : 0);
    g.uniform2f(uni.u_size, a.width, a.height);
    g.uniform3fv(uni.u_color, SHADOW_COLOR);
    g.uniform1f(uni.u_alpha, frame.view === 'hours' ? HOURS_ALPHA : SHADOW_ALPHA);
    g.uniform1f(uni.u_steps, day.steps.length);
    g.uniform1f(uni.u_nodata, manifest.hoursNoData);
    g.uniform3fv(uni.u_ramp, ramp);
    const n = Math.min(holes.length / 4, MAX_HOLES);
    g.uniform1i(uni.u_nholes, n);
    if (n) g.uniform4fv(uni['u_holes[0]'], new Float32Array(holes.slice(0, n * 4)));
    g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
    return true;
  }

  const layer: CustomLayerInterface = {
    id: SUN_LAYER_ID,
    type: 'custom',
    renderingMode: '2d',
    onAdd(_map, context) {
      if (typeof WebGL2RenderingContext === 'undefined' || !(context instanceof WebGL2RenderingContext)) return;
      gl = context;
      const compile = (type: number, src: string) => {
        const s = context.createShader(type)!;
        context.shaderSource(s, src);
        context.compileShader(s);
        if (!context.getShaderParameter(s, context.COMPILE_STATUS)) console.warn('[sun-shadow] shader:', context.getShaderInfoLog(s));
        return s;
      };
      program = context.createProgram()!;
      context.attachShader(program, compile(context.VERTEX_SHADER, VERT));
      context.attachShader(program, compile(context.FRAGMENT_SHADER, FRAG));
      context.linkProgram(program);
      if (!context.getProgramParameter(program, context.LINK_STATUS)) {
        console.warn('[sun-shadow] program:', context.getProgramInfoLog(program));
        program = null;
        return;
      }
      for (const name of ['u_matrix', 'u_a', 'u_b', 'u_bit_a', 'u_bit_b', 'u_frac', 'u_mode', 'u_size', 'u_color', 'u_alpha', 'u_steps', 'u_nodata', 'u_ramp', 'u_holes[0]', 'u_nholes']) uni[name] = context.getUniformLocation(program, name);
      vao = context.createVertexArray();
      buffer = context.createBuffer();
      context.bindVertexArray(vao);
      context.bindBuffer(context.ARRAY_BUFFER, buffer);
      context.bufferData(context.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), context.STATIC_DRAW);
      const loc = context.getAttribLocation(program, 'a_pos');
      context.enableVertexAttribArray(loc);
      context.vertexAttribPointer(loc, 2, context.FLOAT, false, 0, 0);
      context.bindVertexArray(null);
    },
    render(_gl, args: CustomRenderMethodInput) {
      const g = gl;
      if (!g || !program || disposed) return;
      tick++;
      const inView = chunksInView();
      const chunks = inView.filter(([x, y]) => !skipped(x, y));
      plan(chunks);
      upload(g);
      trim(g);
      report();
      // Flat ground only: the layer is not draped on 3D terrain, and the globe uses another projection.
      const level = lod();
      if (map.getTerrain() || (args.defaultProjectionData?.projectionTransition ?? 0) > 0 || level === 'none') return;
      const main = args.defaultProjectionData.mainMatrix as ArrayLike<number>;
      g.useProgram(program);
      g.bindVertexArray(vao);
      g.enable(g.BLEND);
      g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
      g.disable(g.DEPTH_TEST);
      g.disable(g.STENCIL_TEST);
      g.disable(g.CULL_FACE);
      // Chunks first (the fine page where it has arrived, else the regular one); the overview then fills everything they did not cover.
      const holes: number[] = [];
      for (const [x, y] of inView) {
        const [bx, by, s] = tileBox(z, x, y);
        const box: [number, number, number, number] = [bx, by, s, s];
        if (skipped(x, y) || (level === 'fine' && opts.fine && draw(g, main, box, [x, y], [], opts.fine)) || draw(g, main, box, [x, y], [])) holes.push((x - ov.x0) / ov.nx, (y - ov.y0) / ov.ny, (x + 1 - ov.x0) / ov.nx, (y + 1 - ov.y0) / ov.ny);
      }
      draw(g, main, ovBox, null, holes);
      g.bindVertexArray(null);
    },
    onRemove() {
      const g = gl;
      disposed = true;
      for (const p of pages.values()) {
        p.abort?.abort();
        if (g && p.tex) g.deleteTexture(p.tex);
      }
      pages.clear();
      if (g) {
        if (program) g.deleteProgram(program);
        if (buffer) g.deleteBuffer(buffer);
        if (vao) g.deleteVertexArray(vao);
      }
      gl = null;
    },
  };

  return {
    layer,
    setFrame(f) {
      frame = f;
      if (!disposed) map.triggerRepaint();
    },
    loading: () => wasLoading,
    dispose() {
      disposed = true;
      if (map.getLayer(SUN_LAYER_ID)) map.removeLayer(SUN_LAYER_ID);
    },
  };
}
