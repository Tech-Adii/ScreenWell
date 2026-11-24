import { build } from 'esbuild';
import { build as vite } from 'vite';
import { existsSync } from 'node:fs';
if (!existsSync('assets/public/icon.png')) throw new Error('Run npm run assets first.');
await vite();
await build({
  entryPoints: ['main/index.ts'],
  outfile: 'dist/main/index.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['electron'],
  sourcemap: false,
});
await build({
  entryPoints: ['main/preload.ts'],
  outfile: 'dist/main/preload.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  external: ['electron'],
  sourcemap: false,
});
if (existsSync('vision/worker.ts'))
  await build({
    entryPoints: ['vision/worker.ts'],
    outfile: 'dist/renderer/vision-worker.js',
    bundle: true,
    platform: 'browser',
    format: 'iife',
    sourcemap: false,
  });
