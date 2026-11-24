import { test, expect, _electron as electron } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store } from '../../data/store';
import { defaults } from '../../shared/defaults';
const require = createRequire(import.meta.url);
test('daily priorities, focus, command navigation, breathing, isolation and keyboard access', async () => {
  const data = await mkdtemp(path.join(tmpdir(), 'screenwell-workspace-')),
    store = new Store(path.join(data, 'screenwell.sqlite'));
  store.set('settings', {
    ...defaults,
    name: 'Nova',
    onboarded: true,
    quietEnabled: false,
    theme: 'dark',
    palette: 'cobalt',
  });
  store.close();
  const app = await electron.launch({
    executablePath: require('electron') as string,
    args: ['.', '--test'],
    env: { ...process.env, SCREENWELL_DATA_DIR: data },
  });
  try {
    const page = await app.firstWindow();
    await expect(page.getByRole('heading', { name: /Nova/ })).toBeVisible();
    await page.getByRole('button', { name: 'Overview', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Session quick start' })).toBeVisible();
    const artworkWidth = await page.locator('.focus-observatory').evaluate(async (stage) => {
      const background = getComputedStyle(stage, '::before').backgroundImage;
      const url = background.match(/url\("([^"]+)"\)/)?.[1];
      if (!url) return 0;
      const artwork = new Image();
      artwork.src = url;
      await artwork.decode();
      return artwork.naturalWidth;
    });
    expect(artworkWidth).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Plan a study session', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Start session', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Overview', exact: true }).click();
    await page.getByRole('textbox', { name: 'New priority' }).fill('Finish my design chapter');
    await page.getByRole('button', { name: 'Add priority', exact: true }).click();
    await expect(
      page.getByRole('checkbox', { name: 'Complete Finish my design chapter' }),
    ).toBeVisible();
    await page.getByRole('checkbox', { name: 'Complete Finish my design chapter' }).check();
    await page.getByRole('combobox', { name: 'Daily focus goal' }).selectOption('120');
    await expect
      .poll(async () => (await page.evaluate(() => window.screenwell.snapshot())).plan.focusGoal)
      .toBe(120);
    await page.reload();
    await page.getByRole('button', { name: 'Overview', exact: true }).click();
    await expect(
      page.getByRole('checkbox', { name: 'Complete Finish my design chapter' }),
    ).toBeChecked();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: 'test-results/lumen-dashboard-dark.png',
      animations: 'disabled',
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Start 25-minute focus', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Finish focus', exact: true })).toBeVisible();
    expect(
      (await page.evaluate(() => window.screenwell.snapshot())).engine.focusUntil,
    ).toBeGreaterThan(Date.now());
    await expect(page.getByText('Some space for your attention.')).toBeVisible();
    await page.getByRole('button', { name: 'Finish focus', exact: true }).click();
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: 'Command menu' });
    await expect(dialog).toBeVisible();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    const search = page.getByRole('combobox', { name: 'Search commands' });
    await expect(search).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'Close command menu' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(search).toBeFocused();
    await search.fill('hydration');
    await expect(page.getByRole('option', { name: /Hydration/ })).toBeVisible();
    await page.screenshot({ path: 'test-results/lumen-command-menu.png', animations: 'disabled' });
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Stay in your flow' })).toBeVisible();
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
    await page.getByRole('button', { name: 'Open command menu' }).click();
    await search.fill('zzznomatch');
    await expect(page.getByText('No matches yet.')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Open command menu' })).toBeFocused();
    await page.getByRole('button', { name: 'Overview', exact: true }).click();
    await page.getByRole('button', { name: 'Try a breathing reset', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Breathing reset', exact: true })).toBeVisible();
    await page.screenshot({ path: 'test-results/lumen-breathing.png', animations: 'disabled' });
    await page.getByRole('button', { name: 'Begin breathing', exact: true }).click();
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Continue breathing', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Close breathing reset' }).click();
    expect(
      (await page.evaluate(() => window.screenwell.snapshot())).events.filter(
        (event) => event.type === 'breathing-complete',
      ),
    ).toHaveLength(0);
    await page.evaluate(() => window.screenwell.demo(true));
    await expect(
      page.getByRole('checkbox', { name: 'Complete Finish my design chapter' }),
    ).toHaveCount(0);
    await page.getByRole('textbox', { name: 'New priority' }).fill('A demo-only priority');
    await page.getByRole('button', { name: 'Add priority', exact: true }).click();
    await expect(
      page.getByRole('checkbox', { name: 'Complete A demo-only priority' }),
    ).toBeVisible();
    await page.evaluate(() => window.screenwell.demo(false));
    await expect(
      page.getByRole('checkbox', { name: 'Complete Finish my design chapter' }),
    ).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Complete A demo-only priority' })).toHaveCount(
      0,
    );
    await page.getByRole('button', { name: 'Switch theme' }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: 'test-results/lumen-dashboard-light.png',
      animations: 'disabled',
      fullPage: true,
    });
    await page.clock.install();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Try a breathing reset', exact: true }).click();
    await page.getByRole('button', { name: 'Begin breathing', exact: true }).click();
    await expect
      .poll(() => page.locator('.breath-disc').evaluate((node) => getComputedStyle(node).transform))
      .toBe('none');
    await page.clock.fastForward(61000);
    await expect(
      page.getByRole('heading', { name: 'A little more room.', exact: true }),
    ).toBeVisible();
    await expect
      .poll(
        async () =>
          (await page.evaluate(() => window.screenwell.snapshot())).events.filter(
            (event) => event.type === 'breathing-complete',
          ).length,
      )
      .toBe(1);
    await page.getByRole('button', { name: 'Back to your day' }).click();
    await expect(page.getByText('1 breathing moment made today.')).toBeVisible();
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1060, 800));
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: 'test-results/lumen-dashboard-compact.png',
      animations: 'disabled',
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Remove Finish my design chapter' }).click();
    await expect(
      page.getByRole('checkbox', { name: 'Complete Finish my design chapter' }),
    ).toHaveCount(0);
  } finally {
    await app.close();
  }
});
