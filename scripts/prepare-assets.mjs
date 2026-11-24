import { mkdir, writeFile, readdir, copyFile, access, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="70" fill="#2f6a4f"/><path d="M64 141c0-46 38-79 107-81 8 68-16 124-66 124-24 0-41-16-41-43Z" fill="#d8efac"/><path d="m90 166 51-64" fill="none" stroke="#2f6a4f" stroke-width="12" stroke-linecap="round"/><circle cx="113" cy="114" r="6" fill="#2f6a4f"/><circle cx="143" cy="126" r="6" fill="#2f6a4f"/></svg>`;
await mkdir('assets/public', { recursive: true });
const png = await sharp(Buffer.from(svg)).png().toBuffer();
await writeFile('assets/public/icon.png', png);
await writeFile('assets/icon.ico', await pngToIco(png));
// ICNS accepts PNG-backed icon chunks; generate without macOS-only iconutil.
const macPng = await sharp(Buffer.from(svg)).resize(1024, 1024).png().toBuffer();
const icns = Buffer.alloc(16);
icns.write('icns', 0);
icns.writeUInt32BE(16 + macPng.length, 4);
icns.write('ic10', 8);
icns.writeUInt32BE(8 + macPng.length, 12);
await writeFile('assets/icon.icns', Buffer.concat([icns, macPng]));
await mkdir('assets/public/wasm', { recursive: true });
for (const name of await readdir('node_modules/@mediapipe/tasks-vision/wasm'))
  if (/\.(wasm|js)$/.test(name) && !name.includes('_module_'))
    await copyFile(
      `node_modules/@mediapipe/tasks-vision/wasm/${name}`,
      `assets/public/wasm/${name}`,
    );
// This worker uses classic scripts; keep only its SIMD and fallback runtimes.
for (const suffix of ['js', 'wasm'])
  await rm(`assets/public/wasm/vision_wasm_module_internal.${suffix}`, { force: true });
await mkdir('assets/public/models', { recursive: true });
const models = {
  'face_landmarker.task':
    'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  'pose_landmarker_lite.task':
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  'pose_landmarker_full.task':
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
  'pose_landmarker_heavy.task':
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task',
};
for (const [name, url] of Object.entries(models)) {
  try {
    await access(`assets/public/models/${name}`);
  } catch {
    console.log(`Bundling ${name} (build-time download only)…`);
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Model download failed: ${r.status}`);
    await writeFile(`assets/public/models/${name}`, Buffer.from(await r.arrayBuffer()));
  }
}
const expected = {
  'face_landmarker.task': '64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff',
  'pose_landmarker_lite.task': '59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a',
  'pose_landmarker_full.task': '5134a3aad27a58b93da0088d431f366da362b44e3ccfbe3462b3827a839011b1',
  'pose_landmarker_heavy.task': '64437af838a65d18e5ba7a0d39b465540069bc8aae8308de3e318aad31fcbc7b',
};
for (const [name, hash] of Object.entries(expected))
  if (
    createHash('sha256')
      .update(await readFile(`assets/public/models/${name}`))
      .digest('hex') !== hash
  )
    throw new Error(`Model integrity check failed: ${name}`);
await writeFile('assets/public/models/manifest.json', JSON.stringify(expected, null, 2));
// A short, quiet chime synthesized at build time; no runtime synthesis or downloads.
const rate = 22050,
  count = (rate * 0.65) | 0,
  wav = Buffer.alloc(44 + count * 2);
wav.write('RIFF');
wav.writeUInt32LE(36 + count * 2, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24);
wav.writeUInt32LE(rate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(count * 2, 40);
for (let i = 0; i < count; i++) {
  const t = i / rate;
  const gain = Math.min(t * 40, 1) * Math.exp(-t * 7) * 0.12;
  wav.writeInt16LE(
    Math.round(
      (Math.sin(t * 2 * Math.PI * 660) + 0.4 * Math.sin(t * 2 * Math.PI * 880)) * gain * 32767,
    ),
    44 + i * 2,
  );
}
await writeFile('assets/public/chime.wav', wav);
await mkdir('assets/public/fonts', { recursive: true });
for (const weight of [400, 600, 700])
  await copyFile(
    `node_modules/@fontsource/nunito-sans/files/nunito-sans-latin-${weight}-normal.woff2`,
    `assets/public/fonts/nunito-sans-${weight}.woff2`,
  );
try {
  await access('assets/public/fonts/NotoSans-Regular.ttf');
} catch {
  const r = await fetch(
    'https://raw.githubusercontent.com/notofonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf',
  );
  if (!r.ok) throw new Error('PDF font download failed');
  await writeFile('assets/public/fonts/NotoSans-Regular.ttf', Buffer.from(await r.arrayBuffer()));
}
await copyFile(
  'node_modules/@fontsource/nunito-sans/LICENSE',
  'assets/public/fonts/NunitoSans-LICENSE.txt',
);
try {
  await access('assets/public/fonts/NotoSans-LICENSE.txt');
} catch {
  const r = await fetch('https://raw.githubusercontent.com/notofonts/noto-fonts/main/LICENSE');
  if (!r.ok) throw new Error('Noto font license download failed');
  await writeFile('assets/public/fonts/NotoSans-LICENSE.txt', await r.text());
}
console.log('Local icon, chime, MediaPipe WASM, face model, and all three pose models are ready.');
