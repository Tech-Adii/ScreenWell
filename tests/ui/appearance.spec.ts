import { test, expect, _electron as electron } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store } from '../../data/store';
import { defaults } from '../../shared/defaults';
const require = createRequire(import.meta.url);
test('themes, custom colours, accessible motion, preview isolation and persistence', async () => {
  const data = await mkdtemp(path.join(tmpdir(), 'screenwell-appearance-')),
    store = new Store(path.join(data, 'screenwell.sqlite'));
  store.set('settings', { ...defaults, name: 'Nova', onboarded: true, quietEnabled: false });
  store.close();
  const app = await electron.launch({
    executablePath: require('electron') as string,
    args: ['.', '--test'],
    env: { ...process.env, SCREENWELL_DATA_DIR: data },
  });
  try {
    const page = await app.firstWindow();
    const capture = async (name: string) => {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: 'test-results/' + name + '.png',
        fullPage: true,
        animations: 'disabled',
      });
    };
    await expect(page.getByRole('heading', { name: /Nova/ })).toBeVisible();
    await capture('appearance-aurora-light');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'Dark', exact: true }).click();
    await page.getByRole('button', { name: 'Sunset palette' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('.theme-preview')).toHaveAttribute('data-preview-theme', 'dark');
    await page.getByRole('combobox', { name: 'Motion level' }).selectOption('expressive');
    await page.evaluate(async () => {
      const { settings } = await window.screenwell.snapshot();
      await window.screenwell.settings({ ...settings, distanceHoldSeconds: 16 });
    });
    await page.getByRole('button', { name: 'Apply appearance', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'sunset');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await app.evaluate(({ nativeTheme }) => nativeTheme.themeSource)).toBe('dark');
    expect(
      (await page.evaluate(() => window.screenwell.snapshot())).settings.distanceHoldSeconds,
    ).toBe(16);
    await expect(page.locator('html')).toHaveAttribute('data-motion-level', 'expressive');
    await capture('appearance-studio-dark');
    await page.getByRole('button', { name: 'Overview', exact: true }).click();
    await capture('appearance-sunset-dark');
    await expect
      .poll(() => page.locator('.hero').evaluate((el) => getComputedStyle(el).backgroundImage))
      .toContain('linear-gradient');
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].hide());
    await expect(page.locator('html')).toHaveAttribute('data-active', 'false');
    expect(
      await page.locator('.orbit-rotor').evaluate((el) => getComputedStyle(el).animationPlayState),
    ).toBe('paused');
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].show());
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('textbox', { name: 'Primary colour hex', exact: true }).fill('#ff8a66');
    await page.getByRole('textbox', { name: 'Companion colour hex', exact: true }).fill('#5bded0');
    await page.getByRole('combobox', { name: 'Motion level' }).selectOption('off');
    await page.getByRole('checkbox', { name: 'Ambient colour glows', exact: true }).uncheck();
    await page.getByRole('button', { name: 'Apply appearance', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'custom');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'false');
    expect(
      await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--accent'),
      ),
    ).toBe('#ff8a66');
    await expect(page.locator('.ambient-scene')).toBeHidden();
    await expect
      .poll(() =>
        page.evaluate(
          () => document.getAnimations().filter((a) => a.playState === 'running').length,
        ),
      )
      .toBe(0);
    await page.getByRole('textbox', { name: 'Primary colour hex', exact: true }).fill('#12');
    await expect(
      page.getByRole('button', { name: 'Apply appearance', exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole('button', { name: 'Save preferences', exact: true }),
    ).toBeDisabled();
    await page.getByRole('button', { name: 'Lagoon palette' }).click();
    await expect(page.getByRole('button', { name: 'Apply appearance', exact: true })).toBeEnabled();
    await page.getByRole('combobox', { name: 'Motion level' }).selectOption('expressive');
    await page.getByRole('button', { name: 'Apply appearance', exact: true }).click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('html')).toHaveAttribute('data-motion-level', 'off');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(page.locator('html')).toHaveAttribute('data-motion-level', 'expressive');
    await page.getByRole('button', { name: 'Windows', exact: true }).click();
    await page.getByRole('button', { name: 'Apply appearance', exact: true }).click();
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: 'Dark', exact: true }).click();
    await page.getByRole('textbox', { name: 'Primary colour hex', exact: true }).fill('#ff8a66');
    await page.getByRole('textbox', { name: 'Companion colour hex', exact: true }).fill('#5bded0');
    await page.getByRole('checkbox', { name: 'Ambient colour glows', exact: true }).check();
    await page.getByRole('button', { name: 'Apply appearance', exact: true }).click();
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1060, 800));
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await capture('appearance-studio-compact');
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 1000));
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'custom');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const persisted = (await page.evaluate(() => window.screenwell.snapshot())).settings;
    expect(persisted).toMatchObject({
      primaryColor: '#ff8a66',
      companionColor: '#5bded0',
      motionLevel: 'expressive',
      ambientEffects: true,
      distanceHoldSeconds: 16,
    });
    await capture('appearance-custom-dark');
    for (const [section, saveButton] of [
      ['Hydration', 'Save water rhythm'],
      ['Breaks & focus', 'Save rhythm'],
      ['Edit profile', 'Save profile'],
    ] as const) {
      await page.getByRole('button', { name: section, exact: true }).click();
      await page.getByRole('button', { name: 'Switch theme', exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      await page.getByRole('button', { name: saveButton, exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      expect((await page.evaluate(() => window.screenwell.snapshot())).settings).toMatchObject({
        theme: 'light',
        palette: 'custom',
        primaryColor: '#ff8a66',
      });
      await page.getByRole('button', { name: 'Switch theme', exact: true }).click();
    }
  } finally {
    await app.close();
  }
});
