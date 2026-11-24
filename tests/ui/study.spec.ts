import { test, expect, _electron as electron } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store } from '../../data/store';
import { defaults } from '../../shared/defaults';
import { defaultStudyConfig } from '../../shared/study';
import { createStudy } from '../../engine/study';
import type { StudySession, TrackingQuality } from '../../shared/types';
import { useTestCamera } from './camera-fixture';
const require = createRequire(import.meta.url);
async function launch(seed: boolean | ((session: StudySession) => void) = false) {
  const dir = await mkdtemp(path.join(tmpdir(), 'screenwell-study-')),
    store = new Store(path.join(dir, 'screenwell.sqlite'));
  store.set('settings', { ...defaults, onboarded: true, name: 'Sam', quietEnabled: false });
  if (seed) {
    const s = createStudy(
      { ...defaultStudyConfig, studyMinutes: 60, exerciseEveryMinutes: 30 },
      'fixture',
      Date.now(),
    );
    s.remainingMs = 1000;
    s.deadline = s.lastTickAt + 1000;
    if (typeof seed === 'function') seed(s);
    store.set('study', s);
  }
  store.close();
  const app = await electron.launch({
      executablePath: require('electron') as string,
      args: ['.', '--test'],
      env: { ...process.env, SCREENWELL_DATA_DIR: dir },
    }),
    page = await app.firstWindow();
  await expect(page.getByRole('heading', { name: /Sam/ })).toBeVisible();
  return { app, page, dir };
}
test('Windows taskbar countdown advances while the study window is minimized', async () => {
  test.skip(process.platform !== 'win32', 'Windows taskbar integration');
  const { app, page } = await launch();
  try {
    const window = await app.browserWindow(page);
    const title = () => window.evaluate((window) => window.getTitle());
    await expect.poll(() => window.evaluate((window) => window.isVisible())).toBe(true);
    await page.getByRole('button', { name: 'Start session', exact: true }).click();
    await expect.poll(title).toMatch(/^ScreenWell · Eye break in \d+:\d\d$/);
    await window.evaluate((window) => window.minimize());
    await expect.poll(() => window.evaluate((window) => window.isMinimized())).toBe(true);
    const before = await title();
    await expect.poll(title).not.toBe(before);
    expect(await window.evaluate((window) => window.isMinimized())).toBe(true);
    await window.evaluate((window) => window.restore());
    await page.getByRole('button', { name: 'Pause session' }).click();
    await expect.poll(title).toMatch(/^ScreenWell · Study paused \d+:\d\d left$/);
  } finally {
    await app.close();
  }
});
test('dim tracking stays on and time out of view only counts as a rest after confirmation', async () => {
  const { app, page, dir } = await launch((session) => {
    session.index = 1;
    session.config.blinks = true;
    session.calibration.blinkThreshold = 0.2;
    session.remainingMs = 30000;
    session.deadline = session.lastTickAt + session.remainingMs;
  });
  try {
    await page.evaluate(async () => {
      navigator.mediaDevices.getUserMedia = () => new Promise<MediaStream>(() => {});
      await window.screenwell.studyAction({ type: 'resume', cameraConsent: true });
      await window.screenwell.camera(true);
    });
    const feed = async (quality: TrackingQuality, frames = 1) => {
      for (let i = 0; i < frames; i++) {
        await app.evaluate(() => {
          const previous = Date.now;
          Date.now = () => previous() + 500;
        });
        await page.evaluate(
          (quality) =>
            window.screenwell.vision({
              blinksPerMinute: null,
              totalBlinks: 0,
              posture: null,
              present: quality === 'clear',
              quality,
              issues: [],
              message: '',
              ear: 0.3,
              baseline: null,
              ready: true,
              faceMeasurement: null,
              distanceRatio: null,
              distanceState: 'unknown',
              closeSeconds: 0,
              inferenceMs: 10,
            }),
          quality,
        );
      }
    };
    const snapshot = () => page.evaluate(() => window.screenwell.snapshot());
    await feed('clear');
    await feed('lighting', 12);
    await expect(page.getByText('Camera check paused', { exact: true })).toBeVisible();
    await expect(page.getByText(/the camera keeps running/i)).toBeVisible();
    expect((await snapshot()).privacy.cameraOn).toBe(true);
    expect((await snapshot()).events.some((event) => event.type === 'study-away')).toBe(false);
    await feed('clear');
    expect((await snapshot()).monitor?.trackingPaused).toBe(true);
    await feed('clear', 2);
    expect((await snapshot()).monitor?.trackingPaused).toBe(false);

    await feed('no-face', 12);
    await feed('clear', 3);
    const unconfirmed = await snapshot();
    expect(unconfirmed.study?.index).toBe(1);
    expect(unconfirmed.study?.awaySeconds).toBeGreaterThanOrEqual(5);
    expect(unconfirmed.events.filter((event) => event.type === 'study-away')).toHaveLength(1);
    expect(unconfirmed.events.some((event) => event.type === 'break-complete')).toBe(false);

    await page.getByRole('button', { name: 'Count as a break' }).click();
    await expect.poll(async () => (await snapshot()).study?.index).toBe(2);
    expect(
      (await snapshot()).events.filter((event) => event.type === 'break-complete'),
    ).toHaveLength(1);
    await expect(page.getByRole('button', { name: 'Count as a break' })).toHaveCount(0);
  } finally {
    await app.close();
  }
  const store = new Store(path.join(dir, 'screenwell.sqlite'));
  try {
    expect(store.events().some((event) => event.type === 'study-away')).toBe(true);
    expect(store.events().filter((event) => event.detail === 'Confirmed away rest')).toHaveLength(
      1,
    );
  } finally {
    store.close();
  }
});
test('study wizard, previewed schedule, camera-free pause/resume, saved recovery and end', async () => {
  let { app, page } = await launch();
  const dataDir = (await page.evaluate(() => window.screenwell.snapshot())).privacy.dataPath;
  try {
    await page
      .getByRole('group', { name: 'Planned study duration' })
      .getByRole('button', { name: '1 hour', exact: true })
      .click();
    await page.getByRole('combobox', { name: 'Session exercise frequency' }).selectOption('30');
    await expect(page.locator('.session-review-facts')).toContainText('3 look-away rests');
    await expect(page.locator('.session-review-facts')).toContainText('2 exercise breaks');
    await expect(page.locator('.session-review-facts')).toContainText(
      '65 min 30 sec including resets',
    );
    await page.screenshot({
      path: 'test-results/study-plan-light.png',
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'Start session', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause session' })).toBeVisible();
    expect((await page.evaluate(() => window.screenwell.snapshot())).privacy.cameraOn).toBe(false);
    await expect(page.getByText('A camera-free session.')).toBeVisible();
    await page.getByRole('button', { name: 'Pause session' }).click();
    const before = (await page.evaluate(() => window.screenwell.snapshot())).study!;
    await page.waitForTimeout(1100);
    expect((await page.evaluate(() => window.screenwell.snapshot())).study?.remainingMs).toBe(
      before.remainingMs,
    );
    await page.getByRole('button', { name: 'Resume study session' }).click();
    await page.getByRole('button', { name: 'Switch theme' }).click();
    await page.screenshot({
      path: 'test-results/study-active-dark.png',
      fullPage: true,
      animations: 'disabled',
    });
    await app.close();
    app = await electron.launch({
      executablePath: require('electron') as string,
      args: ['.', '--test'],
      env: { ...process.env, SCREENWELL_DATA_DIR: path.dirname(dataDir) },
    });
    page = await app.firstWindow();
    await expect(page.getByRole('button', { name: 'Resume study session' })).toBeVisible();
    expect((await page.evaluate(() => window.screenwell.snapshot())).privacy.cameraOn).toBe(false);
    await page.getByRole('button', { name: 'Resume study session' }).click();
    await page.getByRole('button', { name: 'End session', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Your session is saved, Sam.' })).toBeVisible();
    await page.getByRole('button', { name: 'Plan another session' }).click();
    await expect(page.getByRole('heading', { name: /Let’s plan/ })).toBeVisible();
  } finally {
    await app.close();
  }
});
test('study profiles survive restart and require new permission for saved camera checks', async () => {
  const original = await launch();
  const { dir } = original;
  let { app, page } = original;
  const profile = 'Weekend practice';
  try {
    await page.getByRole('button', { name: /Quick Review/ }).click();
    await expect(page.getByRole('spinbutton', { name: 'Custom study hours' })).toHaveValue('0.5');
    await expect(page.getByRole('combobox', { name: 'Session study block length' })).toHaveValue(
      '15',
    );
    await expect(page.locator('.session-review-facts')).toContainText(
      '30 min 40 sec including resets',
    );
    await page.getByRole('button', { name: /Practice Exam/ }).click();
    await expect(page.locator('.session-review-facts')).toContainText(
      '91 min 30 sec including resets',
    );
    await page.getByRole('checkbox', { name: 'Check my screen distance' }).check();
    const consent = page.getByRole('checkbox', { name: /Allow the camera for these checks/ });
    await consent.check();
    await expect(page.getByRole('button', { name: 'Start session', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Save current plan' }).click();
    await page.getByRole('textbox', { name: 'Profile name' }).fill(` ${profile} `);
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await expect(page.getByRole('button', { name: profile, exact: true })).toBeVisible();
    const saved = (await page.evaluate(() => window.screenwell.snapshot())).studyPresets[0];
    expect(saved.config).toMatchObject({ studyMinutes: 90, blockMinutes: 30, distance: true });
    expect(saved.config).not.toHaveProperty('cameraConsent');
    await page.getByRole('button', { name: profile, exact: true }).click();
    await expect(consent).not.toBeChecked();

    await app.close();
    app = await electron.launch({
      executablePath: require('electron') as string,
      args: ['.', '--test'],
      env: { ...process.env, SCREENWELL_DATA_DIR: dir },
    });
    page = await app.firstWindow();
    await page.getByRole('button', { name: profile, exact: true }).click();
    await expect(page.getByRole('checkbox', { name: 'Check my screen distance' })).toBeChecked();
    await expect(
      page.getByRole('checkbox', { name: /Allow the camera for these checks/ }),
    ).not.toBeChecked();
    await expect(page.getByRole('button', { name: 'Start session', exact: true })).toBeDisabled();
    expect((await page.evaluate(() => window.screenwell.snapshot())).privacy.cameraOn).toBe(false);
    await page.getByRole('button', { name: 'Save current plan' }).click();
    await page.getByRole('textbox', { name: 'Profile name' }).fill(profile.toUpperCase());
    await expect(page.getByRole('button', { name: 'Save profile', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.screenshot({ path: 'test-results/study-profiles.png', animations: 'disabled' });
    await page.getByRole('button', { name: `Remove ${profile}` }).click();
    await page.getByRole('button', { name: 'Confirm removal' }).click();
    await expect(page.getByRole('button', { name: profile, exact: true })).toHaveCount(0);
    expect((await page.evaluate(() => window.screenwell.snapshot())).studyPresets).toEqual([]);
    await page.getByRole('checkbox', { name: 'Check my screen distance' }).uncheck();
    await page.getByRole('button', { name: 'Start session', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause session' })).toBeVisible();
    const started = await page.evaluate(() => window.screenwell.snapshot());
    expect(started.study?.config).toMatchObject({
      studyMinutes: 90,
      blockMinutes: 30,
      cameraConsent: false,
    });
    expect(started.privacy.cameraOn).toBe(false);
  } finally {
    await app.close();
  }
});
test('main process rejects unchecked calibration and excludes unselected statistics and alerts', async () => {
  const { app, page } = await launch();
  try {
    // Keep acquisition pending: this exercises IPC authorization with numeric fixtures, never a physical camera.
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = () => new Promise<MediaStream>(() => {});
    });
    const packet = {
      blinksPerMinute: 18,
      totalBlinks: 5,
      posture: 40,
      present: true,
      message: 'Numeric integration fixture',
      issues: ['head tilt'],
      ear: 0.3,
      baseline: null,
      ready: true,
      quality: 'clear' as const,
      faceMeasurement: null,
      distanceRatio: 1.4,
      distanceState: 'close' as const,
      closeSeconds: 30,
      inferenceMs: 10,
    };
    for (const posture of [true, false]) {
      await page.evaluate(
        async ({ posture, config }) => {
          await window.screenwell.startStudy({
            ...config,
            posture,
            blinks: !posture,
            cameraConsent: true,
          });
        },
        { posture, config: defaultStudyConfig },
      );
      await expect
        .poll(
          async () => (await page.evaluate(() => window.screenwell.snapshot())).privacy.cameraOn,
        )
        .toBe(true);
      const before = (await page.evaluate(() => window.screenwell.snapshot())).events.length;
      await page.evaluate(async (posture) => {
        const baseline = {
          version: 2 as const,
          model: 'full' as const,
          calibratedAt: Date.now(),
          faceSize: 0.3,
          headOffset: 0,
          shoulderY: 0.5,
          tilt: 0,
          lean: 0,
        };
        await window.screenwell.calibration(posture ? { baseline } : { blinkThreshold: 0.2 });
        let rejected = false;
        try {
          await window.screenwell.calibration(posture ? { blinkThreshold: 0.2 } : { baseline });
        } catch {
          rejected = true;
        }
        if (!rejected) throw new Error('Unchecked calibration was accepted');
        await window.screenwell.studyAction({ type: 'begin' });
      }, posture);
      for (let index = 0; index <= 25; index++) {
        await app.evaluate(() => {
          const original = Date.now;
          Date.now = () => original() + 1000;
        });
        await page.evaluate((packet) => window.screenwell.vision(packet), packet);
        if (index < 24)
          expect(
            (await page.evaluate(() => window.screenwell.snapshot())).engine.pending,
          ).toBeNull();
      }
      const snapshot = await page.evaluate(() => window.screenwell.snapshot()),
        events = snapshot.events.slice(before);
      expect(snapshot.settings.cameraConsent).toBe(false);
      expect(snapshot.settings.baseline).toBeNull();
      expect(snapshot.settings.blinkThreshold).toBeNull();
      expect(snapshot.study?.blinks).toBe(posture ? 0 : 5);
      expect(events.some((e) => e.type === (posture ? 'blink-rate' : 'posture-score'))).toBe(false);
      expect(snapshot.study?.postureSamples === 0).toBe(!posture);
      expect(snapshot.engine.pending?.reason ?? null).toBe(posture ? 'posture' : null);
      await page.evaluate(() => window.screenwell.studyAction({ type: 'end' }));
    }
  } finally {
    await app.close();
  }
});
test('blink-only camera session initializes the local face worker with pose checks disabled', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'screenwell-study-blink-')),
    store = new Store(path.join(dir, 'screenwell.sqlite'));
  store.set('settings', { ...defaults, onboarded: true, name: 'Sam', quietEnabled: false });
  store.close();
  const app = await electron.launch({
    executablePath: require('electron') as string,
    args: ['.', '--test'],
    env: { ...process.env, SCREENWELL_DATA_DIR: dir },
  });
  try {
    const page = await app.firstWindow();
    await expect(page.getByRole('heading', { name: /Sam/ })).toBeVisible();
    await page.context().setOffline(true);
    await useTestCamera(page, true);
    await page.evaluate(() => {
      const Original = window.Worker,
        seen: { selection: unknown; frame: unknown } = { selection: null, frame: null };
      window.Worker = class extends Original {
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options);
          this.addEventListener('message', (event) => {
            if (event.data.kind === 'result') seen.frame = event.data;
          });
        }
        postMessage(message: unknown, transfer: Transferable[] | StructuredSerializeOptions = []) {
          if (
            message &&
            typeof message === 'object' &&
            'kind' in message &&
            message.kind === 'init' &&
            'selection' in message
          )
            seen.selection = message.selection;
          if (Array.isArray(transfer)) super.postMessage(message, transfer);
          else super.postMessage(message, transfer);
        }
      };
      Object.defineProperty(window, '__studyWorker', { get: () => seen });
    });
    await page.getByRole('checkbox', { name: 'Count my blinks' }).check();
    await page.locator('.session-camera-consent input').check();
    await page.getByRole('button', { name: 'Start session', exact: true }).click();
    await expect(page.locator('.session-camera-badge')).toHaveText('Camera ON', { timeout: 45000 });
    const seen = await page.evaluate(() => Reflect.get(window, '__studyWorker'));
    expect(seen.selection).toEqual({ blinks: true, posture: false, distance: false });
    await expect
      .poll(async () => !!(await page.evaluate(() => Reflect.get(window, '__studyWorker'))).frame, {
        timeout: 15000,
      })
      .toBe(true);
    const frame = (await page.evaluate(() => Reflect.get(window, '__studyWorker'))).frame;
    expect(frame.pose).toEqual([]);
    expect(frame.score).toBeNull();
    expect(frame.baseline).toBeNull();
    expect(frame.quality).toBe('lighting');
    await expect(page.getByText('Camera check paused', { exact: true })).toBeVisible();
    await expect(page.locator('.session-camera-badge')).toHaveText('Camera ON');
    await page.getByRole('button', { name: 'Begin without camera checks', exact: true }).click();
    await expect(page.locator('.session-camera-badge')).toHaveText('Camera OFF');
  } finally {
    await app.close();
  }
});
test('camera permission failure remains usable and unchecked calibrations are rejected for either optional check', async () => {
  const { app, page } = await launch();
  try {
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException('Test permission denied', 'NotAllowedError');
      };
    });
    for (const [blinks, posture] of [
      [true, false],
      [false, true],
      [true, true],
    ]) {
      if (blinks) await page.getByRole('checkbox', { name: 'Count my blinks' }).click();
      if (posture) await page.getByRole('checkbox', { name: 'Check my posture' }).click();
      await expect(page.getByRole('button', { name: 'Start session', exact: true })).toBeDisabled();
      await page.locator('.session-camera-consent input').check();
      await page.getByRole('button', { name: 'Start session', exact: true }).click();
      await expect(
        page.getByRole('button', { name: 'Begin study time', exact: true }),
      ).toBeDisabled();
      await expect(page.locator('.session-tracking-message')).toContainText(
        /permission|access|allowed|camera/i,
      );
      const snapshot = await page.evaluate(() => window.screenwell.snapshot());
      expect(snapshot.settings.cameraConsent).toBe(false);
      expect(snapshot.study?.config).toMatchObject({ blinks, posture });
      const rejected = await page.evaluate(async () => {
        try {
          await window.screenwell.calibration({
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
          return false;
        } catch {
          return true;
        }
      });
      expect(rejected).toBe(true);
      await page.getByRole('button', { name: 'Begin without camera checks', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Pause session' })).toBeVisible();
      const s = await page.evaluate(() => window.screenwell.snapshot());
      expect(s.privacy.cameraOn).toBe(false);
      expect(s.study?.config.blinks).toBe(false);
      expect(s.study?.config.posture).toBe(false);
      await page.getByRole('button', { name: 'End session', exact: true }).click();
      await page.getByRole('button', { name: 'Plan another session' }).click();
    }
  } finally {
    await app.close();
  }
});
test('authoritative rest, animated water, exercise guide and recovery run without a camera', async () => {
  const { app, page } = await launch(true);
  try {
    await expect(page.getByRole('button', { name: 'Resume study session' })).toBeVisible();
    await page.getByRole('button', { name: 'Resume study session' }).click();
    await expect(page.locator('.session-live-hero h2')).toHaveText('Your study block is up.');
    await expect(page.locator('.session-reminder-art.art-rest')).toBeVisible();
    await page.getByRole('button', { name: 'Dismiss reminder' }).click();
    const shift = async (ms: number) => {
      await app.evaluate((_, ms) => {
        const original = Date.now;
        Date.now = () => original() + ms;
      }, ms);
      await page.waitForTimeout(1100);
    };
    await shift(31000);
    await expect(page.locator('.session-reminder-art.art-water')).toBeVisible();
    await page.getByRole('button', { name: 'I drank water', exact: true }).click();
    for (let i = 0; i < 10; i++) await shift(60000);
    await expect(page.getByRole('heading', { name: 'Time for a little movement.' })).toBeVisible();
    await expect(page.locator('.session-exercise')).toBeVisible();
    await expect(
      page.getByText('Camera cues cannot verify every exercise or repetition.'),
    ).toBeVisible();
    await page.screenshot({
      path: 'test-results/study-exercise.png',
      fullPage: true,
      animations: 'disabled',
    });
    expect((await page.evaluate(() => window.screenwell.snapshot())).privacy.cameraOn).toBe(false);
    await page.getByRole('button', { name: 'Pause session', exact: true }).click();
    await app.evaluate(() => {
      const original = Date.now;
      Date.now = () => original() + 120000;
    });
    await page.waitForTimeout(1100);
    expect((await page.evaluate(() => window.screenwell.snapshot())).study?.status).toBe('paused');
  } finally {
    await app.close();
  }
});
test('animated session popup fits the desktop, remains dismissible and does not steal focus', async () => {
  const { app, page } = await launch(true);
  try {
    const popupReady = app.waitForEvent('window');
    await page.evaluate(() =>
      window.screenwell.studyAction({ type: 'resume', cameraConsent: false }),
    );
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].hide());
    const popup = await popupReady;
    await expect(popup.locator('.art-rest')).toBeVisible();
    await expect(popup.locator('html')).toHaveAttribute('data-active', 'true');
    expect(
      await popup
        .locator('.rest-eye-art>span')
        .evaluate((el) => getComputedStyle(el).animationPlayState),
    ).toBe('running');
    expect(
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getFocusedWindow()?.id ?? null),
    ).toBeNull();
    await expect(
      popup.getByRole('button', { name: 'Turn off for today', exact: true }),
    ).toBeVisible();
    const bounds = await popup
      .getByRole('button', { name: 'Turn off for today', exact: true })
      .boundingBox();
    expect(bounds!.y + bounds!.height).toBeLessThan((await popup.evaluate(() => innerHeight)) + 1);
    await popup.screenshot({ path: 'test-results/study-native-rest.png', animations: 'disabled' });
    const popupId = await app.evaluate(
      ({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().endsWith('#reminder'))!.id,
    );
    await app.evaluate(({ BrowserWindow }, id) => BrowserWindow.fromId(id)!.hide(), popupId);
    await expect(popup.locator('html')).toHaveAttribute('data-active', 'false');
    await app.evaluate(
      ({ BrowserWindow }, id) => BrowserWindow.fromId(id)!.showInactive(),
      popupId,
    );
    await expect(popup.locator('html')).toHaveAttribute('data-active', 'true');
    await popup.emulateMedia({ reducedMotion: 'reduce' });
    await expect
      .poll(() =>
        popup.locator('.rest-eye-art>span').evaluate((el) => getComputedStyle(el).animationName),
      )
      .toBe('none');
    await popup.getByRole('button', { name: 'Dismiss reminder' }).click();
    expect((await page.evaluate(() => window.screenwell.snapshot())).engine.pending).toBeNull();
    expect((await page.evaluate(() => window.screenwell.snapshot())).study?.steps[1].kind).toBe(
      'rest',
    );
  } finally {
    await app.close();
  }
});
