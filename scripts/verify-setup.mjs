import { execFileSync } from 'node:child_process';
import { mkdtempDisposable, readFile, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import path from 'node:path';
const manifest = JSON.parse(await readFile('package.json', 'utf8'));
const signed = process.argv.includes('--signed');
const artifact = `ScreenWell-${manifest.version}${signed ? '-Signed' : ''}-Setup.exe`;
const setup = path.resolve('release', artifact);
const sevenZip = process.env.SCREENWELL_7ZIP ?? path.join(process.env.ProgramFiles, '7-Zip/7z.exe');
await access(sevenZip);
await using inspection = await mkdtempDisposable(
  path.join(tmpdir(), 'screenwell-installer-inspect-'),
);
const output = inspection.path;
// Inspect the self-extracting archive without running the installer or changing the registry.
execFileSync(sevenZip, ['t', setup, '-bso0'], { windowsHide: true, stdio: 'pipe' });
execFileSync(sevenZip, ['x', setup, `-o${output}`, '-y', '-bso0'], {
  windowsHide: true,
  stdio: 'pipe',
});
const payload = JSON.parse(
  await readFile(`release/installer-source/${signed ? 'signed-' : ''}payload.json`, 'utf8'),
);
if (
  payload.version !== manifest.version ||
  payload.artifact !== artifact ||
  payload.signed !== signed
) {
  throw new Error('Installer payload metadata does not match the requested build.');
}
for (const file of payload.files) {
  const actual = await readFile(path.join(output, file.file));
  if (createHash('sha256').update(actual).digest('hex') !== file.sha256)
    throw new Error(`Installer payload differs: ${file.file}`);
}
const executable = await readFile(path.join(output, 'ScreenWell.exe'));
if (
  executable.toString('ascii', 0, 2) !== 'MZ' ||
  executable.readUInt16LE(executable.readUInt32LE(0x3c) + 4) !== 0x8664
)
  throw new Error('Expected a Windows x64 app');
if (signed) {
  const tool = process.env.SCREENWELL_SIGNTOOL;
  if (!tool) throw new Error('Set SCREENWELL_SIGNTOOL to verify the signed package.');
  for (const file of [
    setup,
    ...payload.files
      .filter(({ file }) => /\.(exe|dll|node)$/i.test(file))
      .map(({ file }) => path.join(output, file)),
  ]) {
    execFileSync(tool, ['verify', '/pa', '/tw', file], { windowsHide: true, stdio: 'inherit' });
  }
}
const bytes = await readFile(setup);
const record = {
  version: manifest.version,
  artifact: path.basename(setup),
  bytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  runtimeFilesVerified: payload.files.length,
  archiveIntegrityVerified: true,
  payloadByteMatches: true,
  perUser: true,
  signed,
  nativeInstallationTested: false,
  nativeUninstallationTested: false,
};
await writeFile(
  `release/${signed ? 'SIGNED-' : ''}INSTALLER-VALIDATION.json`,
  JSON.stringify(record, null, 2) + '\n',
);
console.log(JSON.stringify(record, null, 2));
