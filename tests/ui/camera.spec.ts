import { test, expect, _electron as electron } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store } from '../../data/store';
import { defaults } from '../../shared/defaults';
import { useTestCamera } from './camera-fixture';
const require = createRequire(import.meta.url);
test('all three bundled pose models load offline and stop on request', async () => {
  const data = await mkdtemp(path.join(tmpdir(), 'screenwell-camera-'));
  const store = new Store(path.join(data, 'screenwell.sqlite'));
  store.set('settings', {
    ...defaults,
    name: 'Camera test',
    onboarded: true,
    cameraConsent: true,
    quietEnabled: false,
  });
  store.close();
  const app = await electron.launch({
    executablePath: process.env.SCREENWELL_TEST_EXE ?? (require('electron') as string),
    args: ['.', '--test'],
    env: { ...process.env, SCREENWELL_DATA_DIR: data },
  });
  const logs: string[] = [];
  app.process().stderr?.on('data', (chunk) => logs.push(String(chunk)));
  try {
    const page = await app.firstWindow();
    page.on('console', (m) => logs.push(m.text()));
    page.on('crash', () => logs.push('RENDERER CRASH'));
    page.on('framenavigated', (f) => logs.push(`Navigation: ${f.url()}`));
    await page.getByRole('heading', { name: /Camera test/ }).waitFor();
    await useTestCamera(page);
    await page.evaluate(() => {
      const nativeMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        try {
          const media = await nativeMedia(constraints);
          console.log(
            'Synthetic capture acquired',
            media.getVideoTracks().map((track) => ({
              label: track.label,
              state: track.readyState,
              settings: track.getSettings(),
            })),
          );
          return media;
        } catch (error) {
          console.log(
            'Synthetic capture error',
            error instanceof Error ? { name: error.name, message: error.message } : String(error),
          );
          throw error;
        }
      };
      const nativePlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = async function () {
        try {
          return await nativePlay.call(this);
        } catch (error) {
          console.log(
            'Video playback error',
            error instanceof Error ? { name: error.name, message: error.message } : String(error),
          );
          throw error;
        }
      };
      const NativeWorker = window.Worker;
      let results = 0;
      window.Worker = class extends NativeWorker {
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options);
          this.addEventListener('message', (event) => {
            if (event.data.kind === 'result') results++;
          });
        }
      };
      Object.defineProperty(window, '__screenwellVisionResults', { get: () => results });
    });
    await page
      .getByRole('button', { name: 'Camera', exact: true })
      .evaluate((node) => (node as HTMLButtonElement).click());
    await page.context().setOffline(true);
    // Delay a real synthetic stream to exercise consent revocation during startup.
    await page.evaluate(() => {
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      let release!: () => void;
      const gate = new Promise<void>((resolve) => (release = resolve));
      let acquired: MediaStream | null = null;
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        acquired = await original(constraints);
        await gate;
        return acquired;
      };
      Object.defineProperty(window, '__cameraTrackStates', {
        get: () => acquired?.getTracks().map((t) => t.readyState) ?? [],
      });
      Object.defineProperty(window, '__releaseCameraGate', {
        value: () => {
          navigator.mediaDevices.getUserMedia = original;
          release();
        },
      });
    });
    await page.getByRole('button', { name: 'Start camera', exact: true }).click();
    await expect
      .poll(() => page.evaluate<string[]>('window.__cameraTrackStates'))
      .toContain('live');
    await page.evaluate(async () => {
      const s = await window.screenwell.snapshot();
      await window.screenwell.settings({ ...s.settings, cameraConsent: false });
    });
    expect(
      await page.evaluate(async () => {
        try {
          await window.screenwell.calibration({ blinkThreshold: 0.2 });
          return false;
        } catch {
          return true;
        }
      }),
    ).toBe(true);
    expect(
      await page.evaluate(() => window.screenwell.snapshot().then((s) => s.settings.cameraConsent)),
    ).toBe(false);
    await page.evaluate('window.__releaseCameraGate()');
    await expect
      .poll(() => page.evaluate<string[]>('window.__cameraTrackStates'))
      .toEqual(['ended']);
    expect(await page.evaluate<number>('window.__screenwellVisionResults')).toBe(0);
    await page.evaluate(async () => {
      const s = await window.screenwell.snapshot();
      await window.screenwell.settings({ ...s.settings, cameraConsent: true });
    });
    for (const mode of ['lite', 'full', 'heavy'] as const) {
      // Start in a visible window, like a real user; then verify background inference separately.
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].show());
      await page
        .getByRole('button', { name: 'Camera', exact: true })
        .evaluate((node) => (node as HTMLButtonElement).click());
      await page.getByRole('combobox', { name: 'Pose model', exact: true }).selectOption(mode);
      await expect
        .poll(() =>
          page.evaluate(() => window.screenwell.snapshot().then((s) => s.settings.visionMode)),
        )
        .toBe(mode);
      const previousResults = await page.evaluate<number>('window.__screenwellVisionResults');
      await page.getByRole('button', { name: 'Start camera', exact: true }).click();
      await expect
        .poll(() => page.evaluate<number>('window.__screenwellVisionResults'), { timeout: 40000 })
        .toBeGreaterThan(previousResults);
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].hide());
      const backgroundResults = await page.evaluate<number>('window.__screenwellVisionResults');
      await expect
        .poll(() => page.evaluate<number>('window.__screenwellVisionResults'))
        .toBeGreaterThan(backgroundResults + 3);
      await expect(
        page.getByRole('button', { name: 'Calibrate eyes · 10 seconds', exact: true }),
      ).toBeEnabled({ timeout: 45000 });
      await expect
        .poll(() => page.locator('video').evaluate((v: HTMLVideoElement) => v.readyState))
        .toBeGreaterThan(1);
      await expect(
        page.getByRole('button', { name: 'Calibrate screen distance', exact: true }),
      ).toBeDisabled();
      await page
        .getByRole('button', { name: 'Turn camera off', exact: true })
        .evaluate((node) => (node as HTMLButtonElement).click());
      expect(
        await page.evaluate(() => window.screenwell.snapshot().then((s) => s.privacy.cameraOn)),
      ).toBe(false);
    }
    expect(
      (await readdir(data, { recursive: true })).filter((f) =>
        /\.(png|jpe?g|webm|mp4|avi)$/i.test(f),
      ),
    ).toEqual([]);
  } catch (error) {
    console.log(logs.join('\n'));
    const page = app.windows()[0];
    if (page) {
      console.log(
        await page
          .locator('main')
          .innerText()
          .catch(() => ''),
      );
      console.log(
        await page
          .evaluate(() => ({
            visibility: document.visibilityState,
            video: [...document.querySelectorAll('video')].map((v) => ({
              ready: v.readyState,
              width: v.videoWidth,
              paused: v.paused,
              hasStream: !!v.srcObject,
            })),
          }))
          .catch(() => ({})),
      );
    }
    throw error;
  } finally {
    await app.close();
  }
});
