import { listPackage, extractFile } from '@electron/asar';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
const archive = path.resolve(process.argv[2] ?? 'release/win-unpacked/resources/app.asar');
const manifest = JSON.parse(await readFile('package.json', 'utf8'));
const packaged = JSON.parse(extractFile(archive, 'package.json').toString());
if (packaged.version !== manifest.version)
  throw new Error('Packaged version does not match the source manifest.');
const files = listPackage(archive).map((file) => file.replaceAll('\\', '/').replace(/^\//, ''));
async function walk(directory) {
  const items = await readdir(directory, { withFileTypes: true }),
    result = [];
  for (const item of items) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) result.push(...(await walk(file)));
    else result.push(file);
  }
  return result;
}
const dist = await walk('dist');
for (const file of dist) {
  const bundled = extractFile(archive, path.normalize(file));
  if (!bundled.equals(await readFile(file))) throw new Error(`Packaged runtime differs: ${file}`);
}
const models = files.filter((file) => file.endsWith('.task'));
if (models.length !== 4 || !models.some((file) => file.endsWith('face_landmarker.task')))
  throw new Error('Expected face and all three pose models.');
if (files.some((file) => file === 'node_modules' || file.startsWith('node_modules/')))
  throw new Error('Unexpected external module tree.');
const result = {
  version: manifest.version,
  distFilesVerified: dist.length,
  allSourceFilesMatch: true,
  models,
  noExternalNodeModules: true,
  packagedUiVerified: false,
};
await writeFile('release/PACKAGE-VALIDATION.json', JSON.stringify(result, null, 2) + '\n');
console.log(
  `Verified ${dist.length} compiled runtime files, four models, version ${manifest.version}, and no external node_modules.`,
);
