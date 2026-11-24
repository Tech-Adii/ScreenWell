import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const notices = [
  'ScreenWell bundled JavaScript dependency licenses\nSee Electron LICENSE and LICENSES.chromium.html for runtime notices.\n',
];
for (const [folder, info] of Object.entries(lock.packages)) {
  if (!folder || info.dev || !folder.startsWith('node_modules/')) continue;
  try {
    const pkg = JSON.parse(await readFile(`${folder}/package.json`, 'utf8'));
    const names = (await readdir(folder)).filter((n) =>
      /^(licen[sc]e|copying|notice)(\.|$)/i.test(n),
    );
    notices.push(`\n=== ${pkg.name} ${pkg.version} (${pkg.license ?? 'see upstream'}) ===\n`);
    for (const name of names)
      try {
        notices.push(await readFile(`${folder}/${name}`, 'utf8'));
      } catch {
        /* Some packages expose a license directory. */
      }
  } catch {
    /* Optional platform-specific dependencies may not be installed. */
  }
}
await mkdir('assets/public/licenses', { recursive: true });
await writeFile('assets/public/licenses/THIRD_PARTY_LICENSES.txt', notices.join('\n'));
console.log('Bundled dependency license notices.');
