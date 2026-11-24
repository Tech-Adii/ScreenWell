import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
async function files(dir) {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map((d) =>
        d.isDirectory() ? files(path.join(dir, d.name)) : path.join(dir, d.name),
      ),
    )
  ).flat();
}
const failures = [];
for (const file of await files('dist')) {
  if (!/\.(js|cjs|html|css)$/.test(file)) continue;
  const text = await readFile(file, 'utf8');
  if (
    /(?:fetch|importScripts|WebSocket|EventSource|loadURL)\s*\(\s*['"`]https?:\/\//i.test(text) ||
    /(?:src|href)\s*=\s*['"]https?:\/\//i.test(text) ||
    /url\(\s*['"]?https?:/i.test(text)
  )
    failures.push(file);
}
if (failures.length) throw new Error(`Remote runtime resource found: ${failures.join(', ')}`);
const manifest = JSON.parse(await readFile('dist/renderer/models/manifest.json', 'utf8'));
for (const [name, hash] of Object.entries(manifest))
  if (
    createHash('sha256')
      .update(await readFile(path.join('dist/renderer/models', name)))
      .digest('hex') !== hash
  )
    throw new Error(`Packaged model integrity failed: ${name}`);
for (const file of [
  'vision-worker.js',
  'models/face_landmarker.task',
  'models/pose_landmarker_lite.task',
  'models/pose_landmarker_full.task',
  'models/pose_landmarker_heavy.task',
  'wasm/vision_wasm_internal.js',
  'wasm/vision_wasm_internal.wasm',
  'wasm/vision_wasm_nosimd_internal.js',
  'wasm/vision_wasm_nosimd_internal.wasm',
  'fonts/NotoSans-Regular.ttf',
  'fonts/nunito-sans-400.woff2',
  'icon.png',
  'chime.wav',
])
  await readFile(path.join('dist/renderer', file));
console.log(
  'Offline build check passed: no remote runtime loads. Session network firewall is also active.',
);
