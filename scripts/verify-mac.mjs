import { readFile, readdir, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { extractFile, listPackage } from '@electron/asar';
import path from 'node:path';
if (process.platform !== 'darwin') throw new Error('Mac package verification requires macOS.');
const requested = process.argv[2];
const arches = requested ? [requested] : ['arm64', 'x64'];
if (arches.some((a) => !['arm64', 'x64'].includes(a))) throw new Error('Expected arm64 or x64');
const manifest = JSON.parse(await readFile('package.json', 'utf8'));
async function walk(dir) {
  const files = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) files.push(...(await walk(file)));
    else files.push(file);
  }
  return files;
}
for (const arch of arches) {
  const app = path.resolve('release', arch === 'arm64' ? 'mac-arm64' : 'mac', 'ScreenWell.app');
  const archive = path.join(app, 'Contents/Resources/app.asar');
  if (JSON.parse(extractFile(archive, 'package.json').toString()).version !== manifest.version)
    throw new Error('Version mismatch');
  const files = await walk('dist');
  for (const file of files)
    if (!extractFile(archive, file).equals(await readFile(file)))
      throw new Error(`Runtime mismatch: ${file}`);
  const entries = listPackage(archive);
  if (entries.filter((f) => f.endsWith('.task')).length !== 4)
    throw new Error('Missing bundled models');
  const plist = JSON.parse(
    execFileSync(
      '/usr/bin/plutil',
      ['-convert', 'json', '-o', '-', path.join(app, 'Contents/Info.plist')],
      { encoding: 'utf8' },
    ),
  );
  if (!plist.NSCameraUsageDescription || plist.CFBundleIdentifier !== manifest.build.appId)
    throw new Error('Missing camera usage or bundle ID');
  execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' });
  const binary = path.join(app, 'Contents/MacOS/ScreenWell');
  const info = execFileSync('/usr/bin/lipo', ['-archs', binary], { encoding: 'utf8' }).trim();
  if (!info.split(/\s+/).includes(arch === 'x64' ? 'x86_64' : 'arm64'))
    throw new Error('Wrong architecture');
  const artifacts = [];
  for (const ext of ['dmg', 'zip']) {
    const name = `ScreenWell-${manifest.version}-mac-${arch}.${ext}`;
    const file = path.join('release', name);
    artifacts.push({
      name,
      bytes: (await stat(file)).size,
      sha256: createHash('sha256')
        .update(await readFile(file))
        .digest('hex'),
    });
  }
  await writeFile(
    `release/MAC-VALIDATION-${arch}.json`,
    JSON.stringify(
      {
        version: manifest.version,
        arch,
        distFilesVerified: files.length,
        cameraUsagePresent: true,
        signatureVerified: true,
        notarizationVerified: false,
        nativeUiVerified: false,
        artifacts,
      },
      null,
      2,
    ),
  );
  console.log(
    `Verified ${arch}: bundle metadata, architecture, signature, ${files.length} runtime files and four models.`,
  );
}
