import { test, expect, _electron as electron, Page } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store } from '../../data/store';
import { defaults } from '../../shared/defaults';
const require = createRequire(import.meta.url);
async function launch(hold = 10) {
  const data = await mkdtemp(path.join(tmpdir(), 'screenwell-distance-'));
  const store = new Store(path.join(data, 'screenwell.sqlite'));
  store.set('settings', {
    ...defaults,
    name: 'Distance test',
    onboarded: true,
    cameraConsent: true,
    quietEnabled: false,
    distanceHoldSeconds: hold,
    distanceBaseline: {
      version: 2,
      calibratedAt: 100,
      faceSize: 0.3,
      eyeSpan: 0.2,
      faceHeight: 0.4,
      yaw: 0,
      pitch: 0,
      roll: 0,
    },
  });
  store.close();
  const app = await electron.launch({
    executablePath: require('electron') as string,
    args: ['.', '--test'],
    env: { ...process.env, SCREENWELL_DATA_DIR: data },
  });
  const page = await app.firstWindow();
  await page.getByRole('heading', { name: /Distance test/ }).waitFor();
  await page.evaluate(() => window.screenwell.camera(true));
  await page.evaluate(async () => {
    const s = await window.screenwell.snapshot();
    await window.screenwell.calibration({ distanceBaseline: s.settings.distanceBaseline! });
  });
  return { app, page };
}
async function feed(page: Page, duration: number, state: 'close' | 'comfortable') {
  await page.evaluate(
    async ({ duration, state }) => {
      const end = Date.now() + duration;
      do {
        await window.screenwell.vision({
          blinksPerMinute: null,
          totalBlinks: 0,
          posture: null,
          present: true,
          message: 'Synthetic distance fixture',
          issues: [],
          ear: 0.3,
          baseline: null,
          ready: true,
          quality: 'clear',
          faceMeasurement: null,
          distanceRatio: state === 'close' ? 1.3 : 1,
          distanceState: state,
          closeSeconds: 0,
          inferenceMs: 10,
        });
        await new Promise((resolve) => setTimeout(resolve, 200));
      } while (Date.now() < end);
    },
    { duration, state },
  );
}
test('a face-only near-screen alert waits ten seconds and honours snooze', async () => {
  const { app, page } = await launch();
  try {
    await page.getByRole('button', { name: 'Camera', exact: true }).click();
    await expect(page.getByLabel('Too-close alert after (seconds)')).toHaveValue('10');
    await feed(page, 2500, 'close');
    expect((await page.evaluate(() => window.screenwell.snapshot())).engine.pending).toBeNull();
    await feed(page, 250, 'comfortable');
    await feed(page, 10500, 'close');
    await expect(page.getByRole('region', { name: 'Move back a little' })).toBeVisible();
    await page.getByRole('button', { name: 'Snooze', exact: true }).click();
    const snapshot = await page.evaluate(() => window.screenwell.snapshot());
    expect(snapshot.engine.visionSnoozeUntil?.posture).toBeGreaterThan(Date.now() + 290000);
    await feed(page, 1500, 'close');
    expect((await page.evaluate(() => window.screenwell.snapshot())).engine.pending).toBeNull();
    await page.evaluate(() => window.screenwell.camera(false));
  } finally {
    await app.close();
  }
});
test('returning to a comfortable distance clears an active distance alert', async () => {
  const { app, page } = await launch(3);
  try {
    await feed(page, 3500, 'close');
    await expect(page.getByRole('region', { name: 'Move back a little' })).toBeVisible();
    await feed(page, 2500, 'comfortable');
    await expect(page.getByRole('region', { name: 'Move back a little' })).toHaveCount(0);
    await page.evaluate(() => window.screenwell.camera(false));
  } finally {
    await app.close();
  }
});
