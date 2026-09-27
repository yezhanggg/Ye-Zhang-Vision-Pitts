import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** In `vite dev`, serve api/*.ts the way Vercel does, reading keys from the repo-root .env. */
function devApi(): Plugin {
  return {
    name: 'dev-api',
    configureServer(server) {
      try {
        const env = readFileSync(resolve(__dirname, '../.env'), 'utf8');
        for (const line of env.split('\n')) {
          const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
          if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2];
        }
      } catch {
        /* no root .env */
      }
      for (const name of ['explain', 'chat']) {
        server.middlewares.use(`/api/${name}`, async (req, res) => {
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const mod = await server.ssrLoadModule(`/api/${name}.ts`);
          const shim = {
            status: (code: number) => ({
              json: (b: unknown) => {
                res.statusCode = code;
                res.setHeader('content-type', 'application/json');
                res.end(JSON.stringify(b));
              },
            }),
          };
          await mod.default({ method: req.method, body: Buffer.concat(chunks).toString('utf8') }, shim);
        });
      }
    },
  };
}

// `npm run export` (mode=export) writes ONE self-contained file to ../export/index.html that opens over file://.
export default defineConfig(({ mode }) => {
  const single = mode === 'export';
  return {
    base: './',
    plugins: [react(), tailwindcss(), devApi(), ...(single ? [viteSingleFile({ removeViteModuleLoader: true })] : [])],
    // Read the repo-root .env so VITE_SUPABASE_* reach the browser bundle (only VITE_-prefixed keys are exposed).
    envDir: resolve(__dirname, '..'),
    server: { port: 5173 },
    build: {
      target: 'es2022',
      sourcemap: false,
      outDir: single ? '../export' : 'dist',
      emptyOutDir: !single,
      assetsInlineLimit: single ? 100_000_000 : 4096,
      cssCodeSplit: !single,
      chunkSizeWarningLimit: 20_000,
    },
    test: { environment: 'node', include: ['src/**/*.test.ts', 'api/**/*.test.ts'] },
  } as never;
});
