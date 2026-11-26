import { test, expect, _electron as electron } from '@playwright/test';
import { mkdtempDisposable } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store } from '../../data/store';
import type { StudySession } from '../../shared/types';

const require = createRequire(import.meta.url);

test('Linux window close saves the running session and tolerates an overlapping quit event', async () => {
  test.skip(process.platform !== 'linux', 'Uses the normal Linux window-close path');
  await using profile = await mkdtempDisposable(path.join(tmpdir(), 'screenwell-shutdown-'));
  const packaged = process.env.SCREENWELL_E2E_EXECUTABLE;
  const app = await electron.launch({
    executablePath: packaged ?? (require('electron') as string),
    args: packaged ? [] : ['.'],
    env: { ...process.env, XDG_CONFIG_HOME: profile.path },
  });
  try {
    const page = await app.firstWindow();
    const database = await page.evaluate(async () => {
      const { privacy } = await window.screenwell.snapshot();
      return privacy.dataPath;
    });
    expect(path.relative(profile.path, database)).not.toMatch(/^\.\./);
    expect(path.isAbsolute(path.relative(profile.path, database))).toBe(false);
    await page.evaluate(async () => {
      const { settings } = await window.screenwell.snapshot();
      await window.screenwell.settings({ ...settings, onboarded: true, name: 'Shutdown check' });
      await window.screenwell.water();
    });
    await page.getByRole('button', { name: 'Start session', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause session', exact: true })).toBeVisible();
    const sessionId = await page.evaluate(
      async () => (await window.screenwell.snapshot()).study?.id,
    );
    const appWindow = await app.browserWindow(page);
    const child = app.process();
    await app.evaluate(({ app }) => {
      // Turn a main-process exception into a test failure before Electron can open its dialog.
      process.prependOnceListener('uncaughtException', (error) => {
        console.error(error);
        process.exit(1);
      });
      // Exercise the event sequence in the reported stack even if the host only emits it once.
      app.once('before-quit', () => app.emit('window-all-closed'));
    });
    await appWindow.evaluate((win) => {
      setImmediate(() => win.close());
    });
    await expect.poll(() => child.exitCode, { timeout: 10000 }).toBe(0);

    const saved = new Store(database);
    try {
      expect(saved.get<StudySession>('study')).toMatchObject({
        id: sessionId,
        status: 'paused',
        deadline: null,
        cameraAuthorized: false,
      });
      expect(saved.events().filter((event) => event.type === 'water')).toHaveLength(1);
    } finally {
      saved.close();
    }
  } finally {
    await app.close();
  }
});
