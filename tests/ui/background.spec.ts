import { test, expect, _electron as electron } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store } from '../../data/store';
import { defaults } from '../../shared/defaults';
import { defaultStudyConfig } from '../../shared/study';
import { useTestCamera } from './camera-fixture';
const require = createRequire(import.meta.url);
async function launch() {
  const dir = await mkdtemp(path.join(tmpdir(), 'screenwell-background-')),
    store = new Store(path.join(dir, 'screenwell.sqlite'));
  store.set('settings', { ...defaults, onboarded: true, name: 'Sky', quietEnabled: false });
  store.close();
  const packagedExecutable = process.env.SCREENWELL_E2E_EXECUTABLE;
  const app = await electron.launch({
      executablePath: packagedExecutable ?? (require('electron') as string),
      args: packagedExecutable ? ['--test'] : ['.', '--test'],
      env: { ...process.env, SCREENWELL_DATA_DIR: dir },
    }),
    page = await app.firstWindow();
  await expect(page.getByRole('heading', { name: /Sky/ })).toBeVisible();
  return { app, page };
}
test('selected study checks continue real offline inference when minimized and stop on pause', async () => {
  const { app, page } = await launch();
  const logs: string[] = [];
  page.on('console', (m) => logs.push(m.text()));
  try {
    await page.context().setOffline(true);
    await useTestCamera(page);
    await page.evaluate(() => {
      const Original = window.Worker;
      let count = 0;
      window.Worker = class extends Original {
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options);
          this.addEventListener('message', (e) => {
            if (e.data.kind === 'result') count++;
          });
        }
      };
      Object.defineProperty(window, '__backgroundFrames', { get: () => count });
    });
    await page.getByRole('checkbox', { name: 'Count my blinks' }).check();
    await page.locator('.session-camera-consent input').check();
    await page.getByRole('button', { name: 'Start session', exact: true }).click();
    await expect(page.locator('.session-camera-badge')).toHaveText('Camera ON', { timeout: 45000 });
    // Numeric calibration fixture starts the timer; synthetic media proves continuing inference, not blink accuracy.
    await page.evaluate(async () => {
      await window.screenwell.calibration({ blinkThreshold: 0.2 });
      await window.screenwell.studyAction({ type: 'begin' });
    });
    const frames = await page.evaluate(() => Reflect.get(window, '__backgroundFrames') as number);
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].minimize());
    await expect
      .poll(
        async () => await page.evaluate(() => Reflect.get(window, '__backgroundFrames') as number),
        { timeout: 10000 },
      )
      .toBeGreaterThan(frames + 3);
    await page.waitForTimeout(5000);
    const s = await page.evaluate(() => window.screenwell.snapshot());
    expect(s.study?.status).toBe('running');
    expect(s.privacy.cameraOn).toBe(true);
    expect(s.monitor?.fresh).toBe(true);
    expect(s.monitor?.background).toBe(true);
    await page.evaluate(() => window.screenwell.studyAction({ type: 'pause' }));
    await expect
      .poll(async () => (await page.evaluate(() => window.screenwell.snapshot())).privacy.cameraOn)
      .toBe(false);
    expect(
      (await page.evaluate(() => window.screenwell.snapshot())).monitor?.confidence,
    ).toBeNull();
  } catch (error) {
    console.log(
      'Background camera diagnostics',
      logs,
      await page.locator('.session-tracking-message').allTextContents(),
      await page.evaluate(() => window.screenwell.snapshot()).catch(() => null),
    );
    throw error;
  } finally {
    await app.close();
  }
});
test('background distance alert stays above a separate window and shows live scoped readings and delivery status', async () => {
  const { app, page } = await launch();
  let feed: ReturnType<typeof setInterval> | undefined;
  try {
    const packet = {
      blinksPerMinute: 18,
      totalBlinks: 10,
      posture: 65,
      present: true,
      message: 'Continuing numeric fixture',
      issues: ['head tilt'],
      ear: 0.3,
      baseline: null,
      ready: true,
      quality: 'clear' as const,
      faceMeasurement: null,
      distanceRatio: 1.25,
      distanceState: 'close' as const,
      closeSeconds: 10,
      inferenceMs: 10,
      confidence: 86,
    };
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = () => new Promise<MediaStream>(() => {});
    });
    await page.evaluate(
      (config) =>
        window.screenwell.startStudy({
          ...config,
          distance: true,
          posture: true,
          blinks: true,
          cameraConsent: true,
        }),
      defaultStudyConfig,
    );
    await expect
      .poll(async () => (await page.evaluate(() => window.screenwell.snapshot())).privacy.cameraOn)
      .toBe(true);
    await page.evaluate(async () => {
      await window.screenwell.calibration({
        blinkThreshold: 0.2,
        baseline: {
          version: 2,
          model: 'full',
          calibratedAt: 1000,
          faceSize: 0.3,
          headOffset: 0,
          shoulderY: 0.5,
          tilt: 0,
          lean: 0,
        },
        distanceBaseline: {
          version: 2,
          calibratedAt: 1000,
          faceSize: 0.3,
          eyeSpan: 0.2,
          faceHeight: 0.4,
          yaw: 0,
          pitch: 0,
          roll: 0,
        },
      });
      await window.screenwell.studyAction({ type: 'begin' });
    });
    const otherReady = app.waitForEvent('window');
    await app.evaluate(async ({ BrowserWindow }) => {
      const main = BrowserWindow.getAllWindows()[0];
      main.minimize();
      const other = new BrowserWindow({ width: 440, height: 320, show: true });
      await other.loadURL('data:text/html,<h1>Another workspace</h1>');
      other.focus();
    });
    await expect(
      (await otherReady).getByRole('heading', { name: 'Another workspace' }),
    ).toBeVisible();
    const popupReady = app.waitForEvent('window');
    for (let i = 0; i <= 10; i++) {
      await app.evaluate(() => {
        const original = Date.now;
        Date.now = () => original() + 1000;
      });
      await page.evaluate(
        (i) =>
          window.screenwell.vision({
            blinksPerMinute: 18,
            totalBlinks: i,
            posture: 65,
            present: true,
            message: 'Numeric integration fixture',
            issues: ['head tilt'],
            ear: 0.3,
            baseline: null,
            ready: true,
            quality: 'clear',
            faceMeasurement: null,
            distanceRatio: 1.25,
            distanceState: 'close',
            closeSeconds: i,
            inferenceMs: 10,
            confidence: 86,
          }),
        i,
      );
    }
    feed = setInterval(
      () =>
        void page.evaluate((packet) => window.screenwell.vision(packet), packet).catch(() => {}),
      200,
    );
    const popup = await popupReady;
    await expect(popup.getByRole('heading', { name: 'Move back a little' })).toBeVisible();
    await expect(popup.getByRole('region', { name: 'Live camera readings' })).toContainText('86%');
    await expect(popup.getByText(/20% closer than baseline/)).toBeVisible();
    await expect(popup.getByText('head tilt', { exact: true })).toBeVisible();
    const windows = await app.evaluate(({ BrowserWindow }) => {
      const popup = BrowserWindow.getAllWindows().find((w) =>
        w.webContents.getURL().endsWith('#reminder'),
      )!;
      return { top: popup.isAlwaysOnTop(), focused: popup.isFocused(), visible: popup.isVisible() };
    });
    expect(windows).toEqual({ top: true, focused: false, visible: true });
    await expect(popup.locator('.delivery-note')).toContainText(/Windows|ScreenWell/);
    await popup.getByRole('button', { name: 'Dismiss reminder' }).click();
    clearInterval(feed);
    expect((await page.evaluate(() => window.screenwell.snapshot())).engine.pending).toBeNull();
  } finally {
    clearInterval(feed);
    await app.close();
  }
});
