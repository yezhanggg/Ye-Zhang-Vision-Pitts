"""Sun and shadow over Pittsburgh: sun position, the GPU shadow kernel, and the map files the app replays.

Method (MUSA 6950 Lab 05 / Assignment 3, scaled from one tile to the city): every cell of a lidar surface model marches
toward the sun; the cell is in shadow when a cell on the way is higher than the sun ray. The march runs as a CUDA
kernel on a Colab GPU (PyCUDA); `shadow_reference` is the same march in NumPy for tests and for the notebook's
self-check. Results are packed one bit per time step and cut into web-map chunks for the Explore tab.

Surface: PASDA "Allegheny County / Pittsburgh LiDAR 2015" terrain products, raster DSM6ft (first-return surface,
6 ft cells, Pennsylvania South State Plane in US feet, heights NAVD88 feet).

This file imports nothing from the rest of the package and needs only numpy (pyproj and pyogrio where a function says
so), so the Colab notebook embeds it as it is. Display only; nothing here enters a score.
"""
from __future__ import annotations

import json
import math
import struct
import zlib
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np

try:  # inside the package, or as a loose file next to remotezip.py in the notebook
    from . import remotezip
except ImportError:  # pragma: no cover
    import remotezip  # type: ignore[no-redef]

PASDA_ZIP = "https://www.pasda.psu.edu/download/alleghenycountyimagery2015/LiDAR/TerrainProducts/PAPittsburgh_TerrainProducts.zip"
PASDA_PAGE = "https://www.pasda.psu.edu/uci/DataSummary.aspx?dataset=1705"
GDB = "PAPittsburgh_TerrainProducts.gdb"
# Table numbers of the DSM6ft raster inside the geodatabase (GDB_SystemCatalog): its pixel blocks and its band record.
DSM_BLOCKS, DSM_BAND = 0x62, 0x63
DSM_CRS = "EPSG:2272"   # the geodatabase says Esri 102729, the same State Plane grid in US survey feet
NODATA = -9999.0
CEILING_FT = 2300.0     # NAVD88 feet; nothing real in the city is higher (the tallest broadcast mast is about 2,210)

TZ = "America/New_York"
SUN_AT = (40.4406, -79.9959)   # one sun position for the whole city (lat, lon): Downtown
DAYS = [("jun21", "June 21", date(2026, 6, 21)), ("sep22", "September 22", date(2026, 9, 22)), ("dec21", "December 21", date(2026, 12, 21))]
STEP_MIN = 30
MIN_ELEV = 2.0          # steps with the sun lower than this are left out
BITS = 8                # time steps per page (one 8-bit grayscale PNG)
GRID_Z = 13             # chunks are web-map tiles of this zoom ...
CHUNK_PX = 2048         # ... drawn at this many pixels, about 6 ft per pixel in Pittsburgh
OVERVIEW_FACTOR = 8     # the citywide overview keeps one pixel in 8 each way
HOURS_NODATA = 255
MERC = 20037508.342789244

# ---------------------------------------------------------------------------------------------------------------------
# Sun position


def solar_position(when: datetime, lat: float, lon: float) -> tuple[float, float]:
    """(elevation, azimuth) in degrees, the equations behind the NOAA solar calculator (Meeus).

    Azimuth runs clockwise from true north. Elevation includes NOAA's correction for atmospheric refraction, since
    that is the direction the light arrives from. `when` must carry a time zone.
    """
    utc = when.astimezone(UTC)
    day_frac = (utc.hour + utc.minute / 60 + utc.second / 3600) / 24
    y, m = utc.year, utc.month
    if m <= 2:
        y, m = y - 1, m + 12
    a = y // 100
    jd = math.floor(365.25 * (y + 4716)) + math.floor(30.6001 * (m + 1)) + utc.day + (2 - a + a // 4) - 1524.5 + day_frac
    t = (jd - 2451545.0) / 36525.0
    rad, deg = math.radians, math.degrees
    l0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360
    anom = 357.52911 + t * (35999.05029 - 0.0001537 * t)
    ecc = 0.016708634 - t * (0.000042037 + 0.0000001267 * t)
    center = (math.sin(rad(anom)) * (1.914602 - t * (0.004817 + 0.000014 * t))
              + math.sin(rad(2 * anom)) * (0.019993 - 0.000101 * t) + math.sin(rad(3 * anom)) * 0.000289)
    omega = 125.04 - 1934.136 * t
    app_long = l0 + center - 0.00569 - 0.00478 * math.sin(rad(omega))
    obliq = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60 + 0.00256 * math.cos(rad(omega))
    decl = math.asin(math.sin(rad(obliq)) * math.sin(rad(app_long)))
    vy = math.tan(rad(obliq / 2)) ** 2
    eq_time = 4 * deg(vy * math.sin(2 * rad(l0)) - 2 * ecc * math.sin(rad(anom))
                      + 4 * ecc * vy * math.sin(rad(anom)) * math.cos(2 * rad(l0))
                      - 0.5 * vy * vy * math.sin(4 * rad(l0)) - 1.25 * ecc * ecc * math.sin(2 * rad(anom)))
    solar_min = (day_frac * 1440 + eq_time + 4 * lon) % 1440
    hour_angle = solar_min / 4 - 180 if solar_min / 4 >= 0 else solar_min / 4 + 180
    la = rad(lat)
    cos_zen = math.sin(la) * math.sin(decl) + math.cos(la) * math.cos(decl) * math.cos(rad(hour_angle))
    zen = math.acos(max(-1.0, min(1.0, cos_zen)))
    elev = 90 - deg(zen)
    if elev > 85:
        refr = 0.0
    elif elev > 5:
        te = math.tan(rad(elev))
        refr = 58.1 / te - 0.07 / te**3 + 0.000086 / te**5
    elif elev > -0.575:
        refr = 1735 + elev * (-518.2 + elev * (103.4 + elev * (-12.79 + elev * 0.711)))
    else:
        refr = -20.772 / math.tan(rad(elev))
    cos_az = (math.sin(la) * math.cos(zen) - math.sin(decl)) / (math.cos(la) * math.sin(zen))
    az = deg(math.acos(max(-1.0, min(1.0, cos_az))))
    az = (az + 180) % 360 if hour_angle > 0 else (540 - az) % 360
    return elev + refr / 3600, az


def clock_label(minutes: int) -> str:
    h, m = divmod(minutes, 60)
    return f"{(h - 1) % 12 + 1}:{m:02d} {'AM' if h < 12 else 'PM'}"


def day_steps(day: date, lat: float = SUN_AT[0], lon: float = SUN_AT[1], tz: str = TZ, step_min: int = STEP_MIN, min_elev: float = MIN_ELEV) -> list[dict]:
    """The day's time steps with the sun at least `min_elev` degrees up: clock minutes, label, azimuth, elevation."""
    zone = ZoneInfo(tz)
    start = datetime(day.year, day.month, day.day, tzinfo=zone)
    out = []
    for minutes in range(0, 1440, step_min):
        el, az = solar_position(start + timedelta(minutes=minutes), lat, lon)
        if el >= min_elev:
            out.append({"min": minutes, "label": clock_label(minutes), "az": round(az, 2), "el": round(el, 2)})
    return out


def true_north_bearing(crs: str, lon: float, lat: float) -> float:
    """Bearing of true north on the map grid at a point, degrees clockwise from grid north (pyproj).

    A State Plane grid is not lined up with true north away from its central meridian (about 1.5 degrees in
    Pittsburgh), and the sun's azimuth is measured from true north: grid azimuth = sun azimuth + this bearing.
    """
    from pyproj import Transformer

    tr = Transformer.from_crs("EPSG:4326", crs, always_xy=True)
    e0, n0 = tr.transform(lon, lat)
    e1, n1 = tr.transform(lon, lat + 0.01)
    return math.degrees(math.atan2(e1 - e0, n1 - n0))


def sun_vector(grid_azimuth: float, elevation: float) -> tuple[np.float32, np.float32, np.float32]:
    """Step toward the sun per unit of ground distance: (columns east, rows south, rise), as the kernel takes them."""
    az, el = math.radians(grid_azimuth), math.radians(elevation)
    return np.float32(math.sin(az)), np.float32(-math.cos(az)), np.float32(math.tan(el))


# ---------------------------------------------------------------------------------------------------------------------
# The shadow march: CUDA kernel and its NumPy twin

KERNEL_SRC = r"""
// One thread per cell. March from the cell toward the sun one cell length at a time; the cell is in shadow as soon as
// a cell on the way is higher than the sun ray. The march ends when the ray is above the highest cell in the raster
// (nothing can block it any more) or leaves the raster.
__global__ void calculate_shadow(const float *dsm, unsigned char *shadow, int width, int height, float cell_size,
                                 float dx, float dy, float dz, float dsm_max, float nodata)
{
    int x = blockIdx.x * blockDim.x + threadIdx.x;
    int y = blockIdx.y * blockDim.y + threadIdx.y;
    if (x >= width || y >= height)
        return;

    int idx = y * width + x;
    float h0 = dsm[idx];
    unsigned char in_shadow = 0;

    if (h0 > nodata) {
        for (int i = 1; ; i++) {
            float fi = (float)i;
            float ray = h0 + dz * (fi * cell_size);      // height of the sun ray i cells away
            if (ray > dsm_max)
                break;
            int xo = x + (int)rintf(dx * fi);            // dx east, dy south (rows grow southward)
            int yo = y + (int)rintf(dy * fi);
            if (xo < 0 || xo >= width || yo < 0 || yo >= height)
                break;
            if (dsm[yo * width + xo] > ray) {
                in_shadow = 1;
                break;
            }
        }
    }
    shadow[idx] = in_shadow;
}
"""


def shadow_reference(dsm: np.ndarray, cell: float, dx, dy, dz, dsm_max: float | None = None, nodata: float = NODATA) -> np.ndarray:
    """The kernel's march in NumPy (float32 like the GPU): 1 where a cell is in shadow, 0 elsewhere and for NoData."""
    dsm = np.ascontiguousarray(dsm, dtype=np.float32)
    h, w = dsm.shape
    flat = dsm.ravel()
    out = np.zeros(h * w, dtype=np.uint8)
    dx, dy, dz, cell = np.float32(dx), np.float32(dy), np.float32(dz), np.float32(cell)
    top = np.float32(np.max(flat) if dsm_max is None else dsm_max)
    if not dz > 0:
        raise ValueError("the sun has to be above the horizon")
    active = np.flatnonzero(flat > np.float32(nodata))
    x = (active % w).astype(np.int64)
    y = (active // w).astype(np.int64)
    h0 = flat[active]
    i = 1
    while active.size:
        fi = np.float32(i)
        ray = h0 + dz * (fi * cell)
        xo = x + int(np.rint(dx * fi))
        yo = y + int(np.rint(dy * fi))
        keep = (ray <= top) & (xo >= 0) & (xo < w) & (yo >= 0) & (yo < h)
        active, x, y, h0, ray, xo, yo = active[keep], x[keep], y[keep], h0[keep], ray[keep], xo[keep], yo[keep]
        hit = flat[yo * w + xo] > ray
        out[active[hit]] = 1
        go = ~hit
        active, x, y, h0 = active[go], x[go], y[go], h0[go]
        i += 1
    return out.reshape(h, w)


class ReferenceCaster:
    """Shadow for one sun direction on the CPU. Slow; for tests and small dry runs."""

    name = "NumPy reference"

    def __init__(self, dsm: np.ndarray, cell: float):
        self.dsm, self.cell = np.ascontiguousarray(dsm, dtype=np.float32), cell
        self.top = float(self.dsm.max())

    def __call__(self, dx, dy, dz) -> np.ndarray:
        return shadow_reference(self.dsm, self.cell, dx, dy, dz, self.top)


class CudaCaster:
    """Shadow for one sun direction on the GPU (PyCUDA). The surface is uploaded once and reused for every step."""

    name = "PyCUDA"

    def __init__(self, dsm: np.ndarray, cell: float):
        import pycuda.autoinit  # noqa: F401  (creates the GPU context)
        import pycuda.driver as cuda
        from pycuda.compiler import SourceModule

        self.cuda = cuda
        dsm = np.ascontiguousarray(dsm, dtype=np.float32)
        self.h, self.w = dsm.shape
        self.cell, self.top = cell, float(dsm.max())
        self.fn = SourceModule(KERNEL_SRC).get_function("calculate_shadow")
        self.dsm_gpu = cuda.mem_alloc(dsm.nbytes)
        cuda.memcpy_htod(self.dsm_gpu, dsm)
        self.out_gpu = cuda.mem_alloc(self.h * self.w)
        self.block = (16, 16, 1)
        self.grid = (math.ceil(self.w / 16), math.ceil(self.h / 16))

    def __call__(self, dx, dy, dz) -> np.ndarray:
        self.fn(self.dsm_gpu, self.out_gpu, np.int32(self.w), np.int32(self.h), np.float32(self.cell),
                np.float32(dx), np.float32(dy), np.float32(dz), np.float32(self.top), np.float32(NODATA),
                block=self.block, grid=self.grid)
        self.cuda.Context.synchronize()
        out = np.empty((self.h, self.w), dtype=np.uint8)
        self.cuda.memcpy_dtoh(out, self.out_gpu)
        return out


# ---------------------------------------------------------------------------------------------------------------------
# Bit pages


def page_count(steps: int, bits: int = BITS) -> int:
    return (steps + bits - 1) // bits


def pack_steps(stack: np.ndarray, bits: int = BITS) -> np.ndarray:
    """(steps, h, w) of 0/1 → (pages, h, w) uint8; bit b of page p is step p * bits + b."""
    n = stack.shape[0]
    pages = np.zeros((page_count(n, bits),) + stack.shape[1:], dtype=np.uint8)
    for k in range(n):
        pages[k // bits] |= (stack[k] != 0).astype(np.uint8) << np.uint8(k % bits)
    return pages


def unpack_step(pages: np.ndarray, k: int, bits: int = BITS) -> np.ndarray:
    return (pages[k // bits] >> np.uint8(k % bits)) & np.uint8(1)


def png_gray(arr: np.ndarray) -> bytes:
    """An 8-bit grayscale PNG with nothing but the pixels (no gamma or color-profile chunks), so the bits a browser
    reads back are the bits written."""
    arr = np.ascontiguousarray(arr, dtype=np.uint8)
    h, w = arr.shape
    rows = np.zeros((h, w + 1), dtype=np.uint8)   # each row starts with filter type 0 (none)
    rows[:, 1:] = arr

    def chunk(kind: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)

    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 0, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(rows.tobytes(), 9)) + chunk(b"IEND", b""))


def read_png_gray(data: bytes) -> np.ndarray:
    """Inverse of png_gray (only reads what png_gray writes)."""
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    pos, w, h, idat = 8, 0, 0, b""
    while pos < len(data):
        (n,), kind = struct.unpack(">I", data[pos : pos + 4]), data[pos + 4 : pos + 8]
        body = data[pos + 8 : pos + 8 + n]
        if kind == b"IHDR":
            w, h = struct.unpack(">II", body[:8])
        elif kind == b"IDAT":
            idat += body
        pos += 12 + n
    return np.frombuffer(zlib.decompress(idat), dtype=np.uint8).reshape(h, w + 1)[:, 1:].copy()


# ---------------------------------------------------------------------------------------------------------------------
# The surface model


def fetch_dsm(dest: Path, log=print) -> Path:
    """Download only the DSM6ft tables out of PASDA's 9 GB zip (about 220 MB). Returns the geodatabase folder."""
    folder = Path(dest) / GDB
    index = remotezip.index(PASDA_ZIP)
    wanted = {f"a{n:08x}" for n in (DSM_BLOCKS, DSM_BAND)}
    for name, info in index.items():
        base = name.rsplit("/", 1)[-1]
        if base.split(".")[0] in wanted and base.endswith((".gdbtable", ".gdbtablx", ".gdbindexes")):
            size = remotezip.fetch(PASDA_ZIP, info, folder / base)
            log(f"  {base}  {size:,} bytes")
    return folder


def read_dsm(folder: Path) -> tuple[np.ndarray, float, float, float]:
    """The DSM6ft raster as float32 (NoData = NODATA), with its left edge, top edge and cell size in feet.

    The raster sits in the geodatabase as uncompressed 128 x 128 blocks of big-endian float32, some followed by a
    bit mask of valid cells. The tables are read as plain rows (pyogrio), so no raster driver is needed.
    """
    import pyogrio

    folder = Path(folder)
    band = pyogrio.read_dataframe(folder / f"a{DSM_BAND:08x}.gdbtable", read_geometry=False).iloc[0]
    w, h, bw, bh = int(band["band_width"]), int(band["band_height"]), int(band["block_width"]), int(band["block_height"])
    if (int(band["band_types"]) >> 8) & 0xFF:
        raise ValueError("the raster blocks are compressed; this reader only handles uncompressed blocks")
    # The band record gives the centers of the corner cells; the raster's outer edge is half a cell further out
    # (this matches the extent written in the geodatabase's own item record).
    cell = (float(band["emaxx"]) - float(band["eminx"])) / (w - 1)
    x0, y0 = float(band["block_origin_x"]) - cell / 2, float(band["block_origin_y"]) + cell / 2
    blocks = pyogrio.read_dataframe(folder / f"a{DSM_BLOCKS:08x}.gdbtable", read_geometry=False)
    blocks = blocks[blocks["rrd_factor"] == 0]
    cols, rows = math.ceil(w / bw), math.ceil(h / bh)
    out = np.full((rows * bh, cols * bw), NODATA, dtype=np.float32)
    n = bw * bh
    for r, c, data in zip(blocks["row_nbr"], blocks["col_nbr"], blocks["block_data"]):
        px = np.frombuffer(data, dtype=">f4", count=n).astype(np.float32).reshape(bh, bw)
        if len(data) >= 4 * n + n // 8:   # a mask follows: one bit per cell, first cell in the high bit, 1 = valid
            valid = np.unpackbits(np.frombuffer(data, dtype=np.uint8, count=n // 8, offset=4 * n)).reshape(bh, bw).astype(bool)
            px = np.where(valid, px, np.float32(NODATA))
        out[r * bh : (r + 1) * bh, c * bw : (c + 1) * bw] = px
    out = out[:h, :w]
    out[~np.isfinite(out)] = NODATA
    return np.ascontiguousarray(out), x0, y0, cell


def despike(dsm: np.ndarray, ceiling: float = CEILING_FT, margin: float = 10.0, window: int = 40, max_cells: int = 4000) -> tuple[np.ndarray, int]:
    """Remove lidar spikes: cells higher than any real structure, with the cone the surface was interpolated into
    around them. Each spike and its flanks are set to the lowest level nearby. Returns the cleaned copy and the
    number of cells changed.

    The 2015 surface has one: 4,225 ft over the river at the Point (the tallest mast in the city tops out near
    2,210 ft). Left in, it would cast a shadow across Downtown and lengthen every sun ray's march.
    """
    out = dsm.copy()
    changed = 0
    h, w = dsm.shape
    todo = np.argwhere(dsm > ceiling)
    while len(todo):
        r, c = todo[np.argmax(out[todo[:, 0], todo[:, 1]])]
        r0, r1, c0, c1 = max(0, r - window), min(h, r + window + 1), max(0, c - window), min(w, c + window + 1)
        win = out[r0:r1, c0:c1]
        base = float(win[win > NODATA].min())
        # flood out from the peak over everything that stands above the base
        flank = np.zeros(win.shape, dtype=bool)
        flank[r - r0, c - c0] = True
        above = win > base + margin
        while True:
            grown = flank.copy()
            grown[1:, :] |= flank[:-1, :]
            grown[:-1, :] |= flank[1:, :]
            grown[:, 1:] |= flank[:, :-1]
            grown[:, :-1] |= flank[:, 1:]
            grown &= above
            if grown.sum() == flank.sum():
                break
            flank = grown
        if flank.sum() > max_cells:   # the flood ran into real ground or buildings: only cut the tip
            flank = win > ceiling
        win[flank] = base
        changed += int(flank.sum())
        todo = np.argwhere(out > ceiling)
    return out, changed


# ---------------------------------------------------------------------------------------------------------------------
# Web-map chunks


def tile_bounds(z: int, x: int, y: int) -> tuple[float, float, float, float]:
    """Web Mercator (minx, miny, maxx, maxy) of a map tile, meters."""
    size = 2 * MERC / (1 << z)
    return -MERC + x * size, MERC - (y + 1) * size, -MERC + (x + 1) * size, MERC - y * size


def tile_lonlat(z: int, x: int, y: int) -> tuple[float, float, float, float]:
    """(west, south, east, north) of a map tile, degrees."""
    n = 1 << z

    def lat(yy: float) -> float:
        return math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * yy / n))))

    return x / n * 360 - 180, lat(y + 1), (x + 1) / n * 360 - 180, lat(y)


def tile_range(bounds_2272: tuple[float, float, float, float], z: int = GRID_Z, crs: str = DSM_CRS) -> tuple[int, int, int, int]:
    """(x0, y0, x1, y1), inclusive: the tiles that cover a box given in the surface model's grid."""
    from pyproj import Transformer

    tr = Transformer.from_crs(crs, "EPSG:3857", always_xy=True)
    minx, miny, maxx, maxy = bounds_2272
    xs = np.linspace(minx, maxx, 33)
    ys = np.linspace(miny, maxy, 33)
    ex = np.concatenate([xs, xs, np.full(33, minx), np.full(33, maxx)])
    ey = np.concatenate([np.full(33, miny), np.full(33, maxy), ys, ys])
    mx, my = tr.transform(ex, ey)
    size = 2 * MERC / (1 << z)
    return (int((mx.min() + MERC) // size), int((MERC - my.max()) // size), int((mx.max() + MERC) // size), int((MERC - my.min()) // size))


def sample_index(merc_bounds, width: int, height: int, x0: float, y0: float, cell: float, shape: tuple[int, int], crs: str = DSM_CRS):
    """For every pixel of a web-map image, the row and column of the surface cell under its center, and whether there is one."""
    from pyproj import Transformer

    tr = Transformer.from_crs("EPSG:3857", crs, always_xy=True)
    minx, miny, maxx, maxy = merc_bounds
    px = minx + (np.arange(width) + 0.5) * (maxx - minx) / width
    py = maxy - (np.arange(height) + 0.5) * (maxy - miny) / height
    gx, gy = np.meshgrid(px, py)
    e, n = tr.transform(gx.ravel(), gy.ravel())
    col = np.floor((e - x0) / cell).astype(np.int32).reshape(height, width)
    row = np.floor((y0 - n) / cell).astype(np.int32).reshape(height, width)
    inside = (row >= 0) & (row < shape[0]) & (col >= 0) & (col < shape[1])
    return np.where(inside, row, 0), np.where(inside, col, 0), inside


def block_reduce_sum(a: np.ndarray, f: int) -> np.ndarray:
    """Sum over f x f blocks (the ragged edge is dropped)."""
    h, w = (a.shape[0] // f) * f, (a.shape[1] // f) * f
    return a[:h, :w].reshape(h // f, f, w // f, f).sum(axis=(1, 3), dtype=np.uint32)


# ---------------------------------------------------------------------------------------------------------------------
# The whole run


def build(dsm: np.ndarray, x0: float, y0: float, cell: float, caster, out_dir: Path, days=DAYS, step_min: int = STEP_MIN,
          min_elev: float = MIN_ELEV, chunk_px: int = CHUNK_PX, overview_factor: int = OVERVIEW_FACTOR, z: int = GRID_Z,
          crs: str = DSM_CRS, engine: str | None = None, keep: dict | None = None, log=print) -> dict:
    """Cast every step of every day, write the chunk pages, the hours pages, the overview and manifest.json.

    Layout under out_dir: <day>/<x>_<y>_p<page>.png (shadow bits), <day>/<x>_<y>_h.png (sunlit steps, 255 = no data),
    <day>/ov_p<page>.png and <day>/ov_h.png (the same for the citywide overview), qa/ (one small frame per step),
    manifest.json. Returns the manifest. `keep`, when given, receives each day's count of sunlit steps per cell.
    """
    import time

    out_dir = Path(out_dir)
    h, w = dsm.shape
    valid = dsm > NODATA
    # The overview shows one pixel for every `overview_factor` chunk pixels; the surface is reduced to about that size.
    chunk_px_ft = 2 * MERC / (1 << z) / chunk_px * math.cos(math.radians(SUN_AT[0])) * 3.28084
    f = max(1, round(chunk_px_ft * overview_factor / cell))
    valid_lo = block_reduce_sum(valid, f)
    north = true_north_bearing(crs, SUN_AT[1], SUN_AT[0])
    log(f"surface {w:,} x {h:,} cells of {cell:g} ft, {valid.mean():.1%} with data; true north is {north:+.2f} degrees on the grid")

    results = []
    for day_id, day_label, day in days:
        steps = day_steps(day, step_min=step_min, min_elev=min_elev)
        n = len(steps)
        pages = np.zeros((page_count(n), h, w), dtype=np.uint8)
        lit = np.zeros((h, w), dtype=np.uint8)
        pages_lo = np.zeros((page_count(n),) + valid_lo.shape, dtype=np.uint8)
        lit_lo = np.zeros(valid_lo.shape, dtype=np.float32)
        (out_dir / "qa").mkdir(parents=True, exist_ok=True)
        for k, step in enumerate(steps):
            t0 = time.time()
            shadow = caster(*sun_vector(step["az"] + north, step["el"]))
            shadow &= valid
            pages[k // BITS] |= shadow << np.uint8(k % BITS)
            lit += valid & (shadow == 0)
            share_lo = block_reduce_sum(shadow, f) / np.maximum(valid_lo, 1)
            shadow_lo = (share_lo >= 0.5) & (valid_lo > 0)
            pages_lo[k // BITS] |= shadow_lo.astype(np.uint8) << np.uint8(k % BITS)
            lit_lo += 1 - share_lo
            step["shade"] = round(float(shadow[valid].mean()), 4)
            (out_dir / "qa" / f"{day_id}_{step['min']:04d}.png").write_bytes(png_gray(np.where(valid_lo > 0, np.where(shadow_lo, 70, 235), 150).astype(np.uint8)))
            log(f"  {day_label} {step['label']:>8}  sun {step['el']:5.1f} up at {step['az']:5.1f}  in shadow {step['shade']:6.1%}  {time.time() - t0:6.1f} s")
        results.append({"id": day_id, "label": day_label, "date": day.isoformat(), "steps": steps, "pages": pages, "lit": lit,
                        "pages_lo": pages_lo, "lit_lo": np.where(valid_lo > 0, np.rint(lit_lo), HOURS_NODATA).astype(np.uint8)})

    # Chunks: one web-map tile each, sampled from the surface grid by nearest cell.
    tx0, ty0, tx1, ty1 = tile_range((x0, y0 - h * cell, x0 + w * cell, y0), z, crs)
    chunks, total = [], 0
    for ty in range(ty0, ty1 + 1):
        for tx in range(tx0, tx1 + 1):
            row, col, inside = sample_index(tile_bounds(z, tx, ty), chunk_px, chunk_px, x0, y0, cell, (h, w), crs)
            ok = inside & valid[row, col]
            if not ok.any():
                continue
            chunks.append([tx, ty])
            for r in results:
                d = out_dir / r["id"]
                d.mkdir(parents=True, exist_ok=True)
                for p in range(r["pages"].shape[0]):
                    total += (d / f"{tx}_{ty}_p{p}.png").write_bytes(png_gray(np.where(ok, r["pages"][p][row, col], 0)))
                total += (d / f"{tx}_{ty}_h.png").write_bytes(png_gray(np.where(ok, r["lit"][row, col], HOURS_NODATA)))
            log(f"  chunk {tx}_{ty} written ({ok.mean():.0%} with data)")

    # Overview: the whole tile range in one image, from the reduced grid.
    nx, ny = tx1 - tx0 + 1, ty1 - ty0 + 1
    ow, oh = nx * chunk_px // overview_factor, ny * chunk_px // overview_factor
    west, _, _, top = tile_bounds(z, tx0, ty0)
    _, south, east, _ = tile_bounds(z, tx1, ty1)
    row, col, inside = sample_index((west, south, east, top), ow, oh, x0, y0, cell * f, valid_lo.shape, crs)
    ok = inside & (valid_lo[row, col] > 0)
    for r in results:
        d = out_dir / r["id"]
        for p in range(r["pages_lo"].shape[0]):
            total += (d / f"ov_p{p}.png").write_bytes(png_gray(np.where(ok, r["pages_lo"][p][row, col], 0)))
        total += (d / "ov_h.png").write_bytes(png_gray(np.where(ok, r["lit_lo"][row, col], HOURS_NODATA)))

    manifest = {
        "version": 1,
        "source": "PASDA Allegheny County / Pittsburgh LiDAR 2015, DSM6ft (first-return surface, 6 ft cells)",
        "engine": engine or getattr(caster, "name", ""),
        "built": datetime.now(UTC).strftime("%Y-%m-%d"),
        "cellFt": cell,
        "grid": {"z": z, "px": chunk_px},
        "bitsPerPage": BITS,
        "stepMinutes": step_min,
        "hoursNoData": HOURS_NODATA,
        "chunks": chunks,
        "overview": {"x0": tx0, "y0": ty0, "nx": nx, "ny": ny, "w": ow, "h": oh},
        "paths": {"page": "{day}/{x}_{y}_p{p}.png", "hours": "{day}/{x}_{y}_h.png", "overviewPage": "{day}/ov_p{p}.png", "overviewHours": "{day}/ov_h.png"},
        "days": [{"id": r["id"], "label": r["label"], "date": r["date"], "pages": int(r["pages"].shape[0]), "steps": r["steps"]} for r in results],
        "bytes": total,
    }
    (out_dir / "manifest.json").write_text(json.dumps(manifest, separators=(",", ":")))
    log(f"{len(chunks)} chunks, {sum(len(r['steps']) for r in results)} steps, {total / 1e6:.1f} MB of pages")
    if keep is not None:
        keep.update({r["id"]: r["lit"] for r in results})
    return manifest


def self_check(dsm: np.ndarray, cell: float, caster_cls, size: int = 512, log=print) -> float:
    """Run the given engine and the NumPy reference on one crop; returns the share of cells where they differ."""
    h, w = dsm.shape
    valid = dsm > NODATA
    # the crop with the most relief among a few candidates that are fully inside the data
    best, pick = -1.0, (0, 0)
    for r in range(size, h - 2 * size, size):
        for c in range(size, w - 2 * size, size):
            win = dsm[r : r + size, c : c + size]
            if valid[r : r + size, c : c + size].all() and float(win.max() - win.min()) > best:
                best, pick = float(win.max() - win.min()), (r, c)
    r, c = pick
    crop = np.ascontiguousarray(dsm[r : r + size, c : c + size])
    worst = 0.0
    for az, el in ((120.0, 12.0), (181.5, 26.0), (250.0, 45.0)):
        v = sun_vector(az, el)
        a, b = caster_cls(crop, cell)(*v), ReferenceCaster(crop, cell)(*v)
        diff = float((a != b).mean())
        worst = max(worst, diff)
        log(f"  self-check sun {el:.0f} up at {az:.0f}: in shadow {a.mean():.1%} (engine) vs {b.mean():.1%} (reference), cells that differ {diff:.4%}")
    return worst


# ---------------------------------------------------------------------------------------------------------------------
# Checking a finished run and copying it into the app


def check_output(src: Path) -> tuple[dict, list[str], int]:
    """(manifest, problems, bytes of map pages) for a finished run folder. No problems means it can be published."""
    src = Path(src)
    manifest = json.loads((src / "manifest.json").read_text())
    problems: list[str] = []
    total = 0
    px = manifest["grid"]["px"]
    ov = manifest["overview"]

    def page(rel: str, w: int, h: int) -> None:
        nonlocal total
        f = src / rel
        if not f.exists():
            problems.append(f"missing {rel}")
            return
        head = f.read_bytes()[:26]
        if head[:8] != b"\x89PNG\r\n\x1a\n" or struct.unpack(">II", head[16:24]) != (w, h) or head[24:26] != b"\x08\x00":
            problems.append(f"{rel} is not a {w} x {h} 8-bit grayscale PNG")
        total += f.stat().st_size

    for day in manifest["days"]:
        steps = day["steps"]
        if day["pages"] != page_count(len(steps), manifest["bitsPerPage"]):
            problems.append(f"{day['id']}: {day['pages']} pages for {len(steps)} steps")
        for p in range(day["pages"]):
            page(manifest["paths"]["overviewPage"].format(day=day["id"], p=p), ov["w"], ov["h"])
            for x, y in manifest["chunks"]:
                page(manifest["paths"]["page"].format(day=day["id"], x=x, y=y, p=p), px, px)
        page(manifest["paths"]["overviewHours"].format(day=day["id"]), ov["w"], ov["h"])
        for x, y in manifest["chunks"]:
            page(manifest["paths"]["hours"].format(day=day["id"], x=x, y=y), px, px)
        # the least shadow of the day falls within an hour or so of the highest sun
        high = max(range(len(steps)), key=lambda i: steps[i]["el"])
        low = min(range(len(steps)), key=lambda i: steps[i]["shade"])
        if abs(high - low) > 3:
            problems.append(f"{day['id']}: least shadow at {steps[low]['label']} but the sun is highest at {steps[high]['label']}")
        if not steps[0]["shade"] > steps[low]["shade"] < steps[-1]["shade"]:
            problems.append(f"{day['id']}: shadow share does not fall and rise through the day")
    return manifest, problems, total


FINE_MIN_ZOOM = 15.5    # the fine level takes over from this map zoom


def publish(src: Path, dest: Path, fine_from: Path | None = None) -> tuple[int, int]:
    """Copy the map pages and the manifest of a checked run into the app's public folder (replacing what is there).

    `fine_from`, when given, is a finer run of the same days and chunks (the run as it was cast). Its shadow pages go
    into dest/fine/ with a small manifest of their own; the app uses them when the map is zoomed in close and they
    are there, and carries on without them when they are not. Returns (bytes of the main pages, bytes of fine pages).
    """
    import shutil

    src, dest = Path(src), Path(dest)
    manifest = json.loads((src / "manifest.json").read_text())
    if dest.exists():
        shutil.rmtree(dest)
    total = 0
    for day in manifest["days"]:
        (dest / day["id"]).mkdir(parents=True)
        for f in sorted((src / day["id"]).glob("*.png")):
            shutil.copyfile(f, dest / day["id"] / f.name)
            total += f.stat().st_size
    manifest["bytes"] = total
    (dest / "manifest.json").write_text(json.dumps(manifest, separators=(",", ":")))
    fine_total = 0
    if fine_from is not None:
        fine = json.loads((Path(fine_from) / "manifest.json").read_text())
        same = [(d["id"], len(d["steps"])) for d in fine["days"]] == [(d["id"], len(d["steps"])) for d in manifest["days"]]
        if not same or fine["chunks"] != manifest["chunks"] or fine["grid"]["px"] <= manifest["grid"]["px"]:
            raise ValueError("the fine run does not match the published one (days, chunks) or is not finer")
        for day in fine["days"]:
            (dest / "fine" / day["id"]).mkdir(parents=True)
            for f in sorted((Path(fine_from) / day["id"]).glob("*_p*.png")):
                if not f.name.startswith("ov_"):
                    shutil.copyfile(f, dest / "fine" / day["id"] / f.name)
                    fine_total += f.stat().st_size
        (dest / "fine" / "manifest.json").write_text(json.dumps(
            {"version": 1, "px": fine["grid"]["px"], "cellFt": fine["cellFt"], "minZoom": FINE_MIN_ZOOM,
             "page": "fine/{day}/{x}_{y}_p{p}.png", "bytes": fine_total}, separators=(",", ":")))
    return total, fine_total


def reduce_run(src: Path, dest: Path, factor: int = 2) -> int:
    """Write a copy of a finished run with chunk pages `factor` times coarser each way (the overview is copied as is).

    A coarse cell is in shadow at a step when at least half of the cells it covers are; its sunlit count is the
    mean of theirs. Returns the bytes of map pages written. For publishing at a smaller size without a new GPU run.
    """
    import shutil

    src, dest = Path(src), Path(dest)
    manifest = json.loads((src / "manifest.json").read_text())
    px, bits, nodata = manifest["grid"]["px"], manifest["bitsPerPage"], manifest["hoursNoData"]
    if px % factor:
        raise ValueError(f"{px} px chunks do not divide by {factor}")
    small = px // factor

    def blocks(a: np.ndarray) -> np.ndarray:
        return a.reshape(small, factor, small, factor)

    total = 0
    for day in manifest["days"]:
        (dest / day["id"]).mkdir(parents=True, exist_ok=True)
        for f in sorted((src / day["id"]).glob("*.png")):
            out = dest / day["id"] / f.name
            if f.name.startswith("ov_"):
                shutil.copyfile(f, out)
            else:
                page = read_png_gray(f.read_bytes())
                if f.name.endswith("_h.png"):
                    ok = blocks(page != nodata)
                    n = ok.sum(axis=(1, 3))
                    mean = np.rint(blocks(np.where(page != nodata, page, 0)).sum(axis=(1, 3), dtype=np.uint32) / np.maximum(n, 1))
                    res = np.where(n > 0, mean, nodata).astype(np.uint8)
                else:
                    res = np.zeros((small, small), dtype=np.uint8)
                    for b in range(bits):
                        count = blocks((page >> np.uint8(b)) & np.uint8(1)).sum(axis=(1, 3), dtype=np.uint16)
                        res |= (count * 2 >= factor * factor).astype(np.uint8) << np.uint8(b)
                out.write_bytes(png_gray(res))
            total += out.stat().st_size
    manifest["grid"]["px"] = small
    manifest["cellFt"] = manifest["cellFt"] * factor
    manifest["bytes"] = total
    (dest / "manifest.json").write_text(json.dumps(manifest, separators=(",", ":")))
    return total
