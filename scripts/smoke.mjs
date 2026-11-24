import { _electron as electron, expect } from '@playwright/test';
import { mkdtempDisposable, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const executablePath = path.resolve(process.argv[2] ?? 'release/win-unpacked/ScreenWell.exe');
await using profile = await mkdtempDisposable(path.join(tmpdir(), 'screenwell-packaged-'));
const data = profile.path;
await mkdir('test-results', { recursive: true });
const app = await electron.launch({
  executablePath,
  args: ['--test'],
  env: { ...process.env, SCREENWELL_DATA_DIR: data },
  timeout: 60000,
});
try {
  const page = await app.firstWindow({ timeout: 30000 });
  page.setDefaultTimeout(15000);
  await page.getByText('Let’s make this feel like you.').waitFor();
  await page.context().setOffline(true);
  await page.reload();
  await page.getByPlaceholder('What should we call you?').fill('Packaged check');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Make room for a pause' }).click();
  await page.getByRole('heading', { name: /Packaged check/ }).waitFor();
  const snapshot = await page.evaluate(() => window.screenwell.snapshot());
  if (process.platform === 'linux') {
    expect(await page.evaluate(() => window.screenwell.platform)).toBe('linux');
  }
  if (snapshot.privacy.dataPath !== path.join(data, 'screenwell.sqlite'))
    throw new Error('Packaged smoke did not open its isolated test profile');
  if (!snapshot.privacy.modelReady || snapshot.privacy.cameraOn)
    throw new Error('Packaged local assets/camera default check failed');
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  const mainWindow = await app.browserWindow(page);
  if (process.platform === 'win32' || process.platform === 'linux') {
    await expect.poll(() => mainWindow.evaluate((win) => win.getTitle())).toMatch(/Eye break in/);
  }
  if (process.platform === 'linux') {
    await page.getByRole('button', { name: 'Check Linux status', exact: true }).click();
    const current = await page.evaluate(() => window.screenwell.snapshot());
    expect(current.notificationDelivery.message).toMatch(/Linux notifications are managed/);
  }
  await page.getByRole('button', { name: 'End session', exact: true }).click();
  await page.getByRole('button', { name: 'Hydration', exact: true }).click();
  await page.getByRole('button', { name: 'I drank water', exact: true }).click();
  const after = await page.evaluate(() => window.screenwell.snapshot());
  if (after.events.filter((e) => e.type === 'water').length !== 1)
    throw new Error('Packaged persistence check failed');
  const pdfPath = path.join(data, 'Packaged-report.pdf');
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
  }, pdfPath);
  await page.evaluate(() => window.screenwell.export('pdf', 7));
  if ((await readFile(pdfPath)).subarray(0, 4).toString() !== '%PDF')
    throw new Error('Packaged local PDF export failed');
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await page.screenshot({ path: 'test-results/packaged-overview.png', fullPage: true });
  await mainWindow.evaluate((win) => win.setSize(1060, 800));
  for (const theme of ['light', 'dark']) {
    await page.evaluate(async (theme) => {
      const { settings } = await window.screenwell.snapshot();
      await window.screenwell.settings({ ...settings, theme, fontScale: 1.3, reducedMotion: true });
    }, theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
      .toBeLessThanOrEqual(1);
  }
  const metrics = await app.evaluate(({ app }) =>
    app.getAppMetrics().map((m) => ({
      type: m.type,
      cpu: m.cpu.percentCPUUsage,
      memoryKB: m.memory.workingSetSize,
    })),
  );
  await writeFile(
    'test-results/packaged-smoke.json',
    JSON.stringify(
      {
        executablePath,
        version: snapshot.privacy.version,
        studySession: true,
        compactLightAndDark: true,
        offlineReload: true,
        localModels: true,
        cameraOff: true,
        waterLogged: true,
        pdfExport: true,
        metrics,
      },
      null,
      2,
    ),
  );
  console.log(`Packaged smoke passed: ${executablePath}`);
  console.log(JSON.stringify(metrics));
} finally {
  await app.close();
}
