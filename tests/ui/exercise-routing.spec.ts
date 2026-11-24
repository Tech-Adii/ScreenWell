import { test, expect, _electron as electron } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store } from '../../data/store';
import { defaults } from '../../shared/defaults';
import { defaultStudyConfig } from '../../shared/study';
import { createStudy } from '../../engine/study';
const require = createRequire(import.meta.url);
async function launch(session: 'rest' | 'exercise' | null = null) {
  const data = await mkdtemp(path.join(tmpdir(), 'screenwell-routing-'));
  const store = new Store(path.join(data, 'screenwell.sqlite'));
  store.set('settings', {
    ...defaults,
    onboarded: true,
    name: 'Exercise check',
    quietEnabled: false,
    theme: 'dark',
  });
  if (session) {
    const study = createStudy(
      { ...defaultStudyConfig, studyMinutes: 60, exerciseEveryMinutes: 30 },
      'routing',
      Date.now(),
    );
    study.index =
      session === 'rest' ? 0 : study.steps.findIndex((step) => step.kind === 'exercise') - 1;
    study.remainingMs = 1000;
    study.status = 'paused';
    study.deadline = null;
    store.set('study', study);
  }
  store.close();
  const app = await electron.launch({
    executablePath: require('electron') as string,
    args: ['.', '--test'],
    env: { ...process.env, SCREENWELL_DATA_DIR: data },
  });
  const page = await app.firstWindow();
  await expect(page.getByRole('heading', { name: /Exercise check/ })).toBeVisible();
  return { app, page };
}
test('foreground eye reminder opens Eye Rest and starts an animated routine; stretch popup restores and starts stretches', async () => {
  const { app, page } = await launch();
  try {
    await page.evaluate(() => window.screenwell.demo(true));
    await page.evaluate(() => window.screenwell.demoReminder('eyes'));
    await page.getByRole('button', { name: 'Start eye exercises', exact: true }).click();
    const player = page.getByRole('dialog', { name: 'Guided exercise' });
    await expect(
      player.getByRole('heading', { name: 'Look into the distance', exact: true }),
    ).toBeVisible();
    await expect(player).toContainText('STEP 1 OF 6');
    await expect(player.locator('.exercise-art')).toBeVisible();
    await expect
      .poll(() => player.locator('.eye-guide').evaluate((el) => getComputedStyle(el).animationName))
      .not.toBe('none');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect
      .poll(() => player.locator('.eye-guide').evaluate((el) => getComputedStyle(el).animationName))
      .toBe('none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await player.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(player.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
    await player.getByRole('button', { name: 'Skip step', exact: true }).click();
    await expect(
      player.getByRole('heading', { name: 'Slow, soft blinks', exact: true }),
    ).toBeVisible();
    await player.getByRole('button', { name: 'Close exercise', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Eye Rest', exact: true })).toBeVisible();
    await expect(page.locator('.exercise-grid .exercise-card')).toHaveCount(6);
    await mkdir('release/previews/1.9', { recursive: true });
    await page.screenshot({
      path: 'release/previews/1.9/eye-rest.png',
      animations: 'disabled',
      fullPage: true,
    });
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].minimize());
    await page.evaluate(() => window.screenwell.demoReminder('stretch'));
    await expect.poll(() => app.windows().some((w) => w.url().endsWith('#reminder'))).toBe(true);
    const popup = app.windows().find((w) => w.url().endsWith('#reminder'))!;
    await popup.getByRole('button', { name: 'Do it now', exact: true }).click();
    await expect(
      player.getByRole('heading', { name: 'Shoulder reset', exact: true }),
    ).toBeVisible();
    await expect(player).toContainText('STEP 1 OF 6');
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()
            .find((w) => !w.webContents.getURL().endsWith('#reminder'))!
            .isMinimized(),
        ),
      )
      .toBe(false);
    await player.getByRole('button', { name: 'Close exercise', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Move a little. Reset a little.', exact: true }),
    ).toBeVisible();
  } finally {
    await app.close();
  }
});
for (const phase of ['rest', 'exercise'] as const) {
  test(`accepting session ${phase} reminder pauses the plan and starts the correct guide`, async () => {
    const { app, page } = await launch(phase);
    try {
      await page.getByRole('button', { name: 'Resume study session', exact: true }).click();
      await page
        .getByRole('button', {
          name: phase === 'rest' ? 'Start eye exercises' : 'Do it now',
          exact: true,
        })
        .click();
      const player = page.getByRole('dialog', { name: 'Guided exercise' });
      await expect(
        player.getByRole('heading', {
          name: phase === 'rest' ? 'Look into the distance' : 'Shoulder reset',
          exact: true,
        }),
      ).toBeVisible();
      const paused = await page.evaluate(() => window.screenwell.snapshot());
      expect(paused.study?.status).toBe('paused');
      expect(paused.privacy.cameraOn).toBe(false);
      await player.getByRole('button', { name: 'Close exercise', exact: true }).click();
    } finally {
      await app.close();
    }
  });
}
