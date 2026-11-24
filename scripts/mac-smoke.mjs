import { _electron as electron, expect } from '@playwright/test';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
if (process.platform !== 'darwin') throw new Error('Run on the target Mac.');
const arch = process.argv[2] ?? process.arch;
if (!['arm64', 'x64'].includes(arch) || arch !== process.arch)
  throw new Error('Run on a Mac of the target architecture.');
const data = await mkdtemp(path.join(tmpdir(), 'screenwell-mac-smoke-'));
const app = await electron.launch({
  executablePath: path.resolve(
    'release',
    arch === 'arm64' ? 'mac-arm64' : 'mac',
    'ScreenWell.app/Contents/MacOS/ScreenWell',
  ),
  args: ['--test'],
  env: { ...process.env, SCREENWELL_DATA_DIR: data },
  timeout: 60000,
});
try {
  const page = await app.firstWindow();
  await page.waitForFunction(() => !!window.screenwell);
  if ((await page.evaluate(() => window.screenwell.platform)) !== 'darwin')
    throw new Error('Wrong runtime platform');
  await page.evaluate(async () => {
    const s = await window.screenwell.snapshot();
    await window.screenwell.settings({
      ...s.settings,
      onboarded: true,
      name: 'Mac preview',
      quietEnabled: false,
    });
  });
  await expect(page.getByRole('button', { name: 'Start session', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause session', exact: true })).toBeVisible();
  const snapshot = await page.evaluate(() => window.screenwell.snapshot());
  if (snapshot.privacy.cameraOn || !snapshot.privacy.modelReady)
    throw new Error('Camera privacy/model check failed');
  await page.screenshot({ path: `release/mac-smoke-${arch}.png`, animations: 'disabled' });
  const recordFile = `release/MAC-VALIDATION-${arch}.json`;
  const record = JSON.parse(await readFile(recordFile, 'utf8'));
  record.nativeUiVerified = true;
  record.physicalCameraVerified = false;
  record.voicePlaybackVerified = false;
  await writeFile(recordFile, JSON.stringify(record, null, 2));
} finally {
  await app.close();
}
