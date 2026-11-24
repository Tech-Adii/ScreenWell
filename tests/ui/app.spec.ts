import { test, expect, _electron as electron, ElectronApplication } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const executablePath = require('electron') as string;
let app: ElectronApplication;
test('onboarding, persistent profile, camera-free features, exports, demo, offline and deletion', async () => {
  const data = await mkdtemp(path.join(tmpdir(), 'screenwell-ui-'));
  app = await electron.launch({
    executablePath,
    args: ['.', '--test', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
    env: { ...process.env, SCREENWELL_DATA_DIR: data },
  });
  try {
    const page = await app.firstWindow();
    await expect(page.getByText('Let’s make this feel like you.')).toBeVisible();
    await page.getByPlaceholder('What should we call you?').fill('Alex');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.getByText('Find your own rhythm.')).toBeVisible();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await expect(page.getByText('Camera is off by default')).toBeVisible();
    await page.getByRole('button', { name: 'Make room for a pause' }).click();
    await expect(page.getByRole('heading', { name: /Alex/ })).toBeVisible();
    expect(
      await page.evaluate(() => window.screenwell.snapshot().then((s) => s.privacy.cameraOn)),
    ).toBe(false);
    await page.getByRole('button', { name: 'Switch theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Switch theme' }).click();
    await page.screenshot({ path: 'test-results/phase-1-overview.png', fullPage: true });
    await app.close();
    app = await electron.launch({
      executablePath,
      args: ['.', '--test', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
      env: { ...process.env, SCREENWELL_DATA_DIR: data },
    });
    const reopened = await app.firstWindow();
    await expect(reopened.getByRole('heading', { name: /Alex/ })).toBeVisible();
    expect(
      await reopened.evaluate(() => window.screenwell.snapshot().then((s) => s.settings.name)),
    ).toBe('Alex');
    await reopened.getByRole('button', { name: 'Breaks & focus', exact: true }).click();
    await expect(reopened.getByRole('heading', { name: 'Breaks & focus' })).toBeVisible();
    await reopened.getByRole('button', { name: '30 min', exact: true }).click();
    await expect(reopened.getByText('30 minutes remaining')).toBeVisible();
    expect(
      await reopened.evaluate(() =>
        window.screenwell.snapshot().then((s) => s.engine.focusUntil !== null),
      ),
    ).toBe(true);
    await reopened.getByRole('button', { name: 'I’m ready for reminders' }).click();
    await reopened.getByRole('button', { name: 'Take a break', exact: true }).click();
    await expect(reopened.getByRole('dialog', { name: 'Guided break' })).toBeVisible();
    await reopened.getByRole('button', { name: 'Close guided break' }).click();
    await reopened.screenshot({ path: 'test-results/phase-2-breaks.png', fullPage: true });
    await reopened.getByRole('button', { name: 'Hydration', exact: true }).click();
    await reopened.getByRole('button', { name: 'I drank water', exact: true }).click();
    await expect(reopened.getByText('A little sip, a little care. Logged.')).toBeVisible();
    expect(
      await reopened.evaluate(() =>
        window.screenwell.snapshot().then((s) => s.events.filter((e) => e.type === 'water').length),
      ),
    ).toBe(1);
    await reopened.screenshot({ path: 'test-results/phase-3-hydration.png', fullPage: true });
    await reopened.getByRole('button', { name: 'Camera', exact: true }).click();
    await expect(
      reopened.getByRole('button', { name: 'Start camera', exact: true }),
    ).toBeDisabled();
    await reopened.getByRole('button', { name: 'I agree · enable camera controls' }).click();
    await reopened.getByRole('button', { name: 'I checked my posture', exact: true }).click();
    expect(
      await reopened.evaluate(() => window.screenwell.snapshot().then((s) => s.privacy.cameraOn)),
    ).toBe(false);
    await reopened.getByRole('button', { name: 'Move & reset', exact: true }).click();
    await expect(
      reopened.getByRole('heading', { name: 'Move a little. Reset a little.' }),
    ).toBeVisible();
    await reopened.getByRole('button', { name: 'Start my reset', exact: true }).click();
    await expect(reopened.getByRole('dialog', { name: 'Guided exercise' })).toBeVisible();
    await reopened.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(reopened.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
    await reopened.screenshot({ path: 'test-results/phase-5-exercise.png', fullPage: true });
    await reopened.getByRole('button', { name: 'Close exercise', exact: true }).click();
    await reopened.getByRole('button', { name: 'Your progress', exact: true }).click();
    await expect(
      reopened.getByRole('heading', { name: 'Your progress, at your pace' }),
    ).toBeVisible();
    const csvPath = path.join(data, 'ScreenWell-test.csv');
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath });
    }, csvPath);
    await reopened.getByRole('button', { name: 'CSV', exact: true }).click();
    await expect(
      reopened.getByRole('status').filter({ hasText: 'Saved on this computer' }),
    ).toBeVisible();
    expect(await readFile(csvPath, 'utf8')).toContain('water');
    const pdfPath = path.join(data, 'ScreenWell-test.pdf');
    await app.evaluate(({ dialog }, filePath) => {
      dialog.showSaveDialog = async () => ({ canceled: false, filePath });
    }, pdfPath);
    const pdfResult = await reopened.evaluate(() => window.screenwell.export('pdf', 7));
    expect(pdfResult).toBe(pdfPath);
    expect((await readFile(pdfPath)).subarray(0, 4).toString()).toBe('%PDF');
    await reopened.screenshot({ path: 'test-results/phase-6-progress.png', fullPage: true });
    await reopened.getByRole('button', { name: 'Desk setup', exact: true }).click();
    await expect(
      reopened.getByRole('heading', { name: 'Make yourself comfortable' }),
    ).toBeVisible();
    await reopened.getByRole('button', { name: 'Mark Bring the screen to you as checked' }).click();
    await expect(reopened.getByText('1 of 5 checked in this visit')).toBeVisible();
    await reopened.getByRole('button', { name: 'Privacy & purpose', exact: true }).click();
    await expect(reopened.getByText('0 frames saved')).toBeVisible();
    const personalEvents = await reopened.evaluate(() =>
      window.screenwell.snapshot().then((s) => s.events.length),
    );
    await reopened.getByRole('button', { name: 'Mentor demo', exact: true }).click();
    await reopened.getByRole('button', { name: 'Enter labelled demo mode' }).click();
    await expect(
      reopened.getByText('DEMO MODE · sample activity · your real data is untouched'),
    ).toBeVisible();
    await reopened.getByRole('button', { name: 'Preview a break reminder' }).click();
    await expect(reopened.getByRole('region', { name: 'Take a breather' })).toBeVisible();
    await reopened.getByRole('button', { name: 'Snooze', exact: true }).click();
    expect(
      await reopened.evaluate(() =>
        window.screenwell
          .snapshot()
          .then((s) => Math.round((s.engine.nextDue.break - Date.now()) / 60000)),
      ),
    ).toBe(5);
    await reopened.getByRole('button', { name: 'Preview a break reminder' }).click();
    await reopened.getByRole('button', { name: 'Skip this one' }).click();
    await reopened.getByRole('button', { name: 'Leave demo mode', exact: true }).first().click();
    expect(
      await reopened.evaluate(() => window.screenwell.snapshot().then((s) => s.events.length)),
    ).toBe(personalEvents);
    const blocked = await app.evaluate(async ({ session }) => {
      try {
        await session.defaultSession.fetch('https://example.com/screenwell-offline-probe');
        return false;
      } catch {
        return true;
      }
    });
    expect(blocked).toBe(true);
    expect(
      await reopened.evaluate(() =>
        window.screenwell.snapshot().then((s) => s.privacy.blockedRequests),
      ),
    ).toBeGreaterThan(0);
    await reopened.context().setOffline(true);
    await reopened.reload();
    await expect(reopened.getByRole('heading', { name: /Alex/ })).toBeVisible();
    await reopened.getByRole('button', { name: 'Hydration', exact: true }).click();
    await expect(reopened.getByRole('heading', { name: 'Stay in your flow' })).toBeVisible();
    await reopened.getByRole('button', { name: 'I drank water', exact: true }).click();
    expect(
      await reopened.evaluate(() =>
        window.screenwell.snapshot().then((s) => s.events.filter((e) => e.type === 'water').length),
      ),
    ).toBe(2);
    const files = await readdir(data, { recursive: true });
    expect(files.filter((f) => /\.(png|jpe?g|webm|mp4|avi)$/i.test(f))).toEqual([]);
    await reopened.getByRole('button', { name: 'Settings', exact: true }).click();
    await reopened.getByRole('checkbox', { name: 'High contrast', exact: true }).check();
    await reopened.getByRole('checkbox', { name: 'Reduce motion', exact: true }).check();
    await reopened.getByRole('button', { name: 'Save preferences' }).click();
    await expect(reopened.locator('html')).toHaveAttribute('data-contrast', 'true');
    await expect(reopened.locator('html')).toHaveAttribute('data-motion', 'false');
    await reopened.getByRole('button', { name: 'Edit profile', exact: true }).click();
    await app.evaluate(({ dialog }) => {
      dialog.showMessageBox = async () => ({ response: 1, checkboxChecked: false });
    });
    await reopened.getByRole('button', { name: 'Delete all my data' }).click();
    await expect(reopened.getByText('Let’s make this feel like you.')).toBeVisible();
    expect(
      await reopened.evaluate(() => window.screenwell.snapshot().then((s) => s.events.length)),
    ).toBe(0);
  } finally {
    await app.close();
  }
});
