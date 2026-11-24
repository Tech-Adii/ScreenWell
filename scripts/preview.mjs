import { _electron as electron, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const data = await mkdtemp(path.join(tmpdir(), 'screenwell-design-preview-'));
const { version } = JSON.parse(await readFile('package.json', 'utf8'));
const output = `release/previews/${version}`;
await mkdir(output, { recursive: true });
const app = await electron.launch({
  executablePath: require('electron'),
  args: ['.', '--test'],
  env: { ...process.env, SCREENWELL_DATA_DIR: data },
});
try {
  const page = await app.firstWindow();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.evaluate(async () => {
    const { settings } = await window.screenwell.snapshot();
    await window.screenwell.settings({
      ...settings,
      onboarded: true,
      name: 'Nova',
      theme: 'dark',
      palette: 'cobalt',
      motionLevel: 'expressive',
      quietEnabled: false,
      cameraConsent: false,
    });
    await window.screenwell.plan({ type: 'add', title: 'Read one chapter, without rushing' });
    await window.screenwell.plan({ type: 'add', title: 'Make space for a mindful pause' });
  });
  await expect(page.getByRole('heading', { name: /Nova/ })).toBeVisible();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1440, 1100));
  const skipLink = await page.locator('.skip-link').evaluate((el) => ({
    focused: el === document.activeElement,
    top: getComputedStyle(el).top,
    rect: el.getBoundingClientRect().toJSON(),
  }));
  console.log('Skip-link visibility:', JSON.stringify(skipLink));
  await page.screenshot({
    path: `${output}/study-plan-dark.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page.evaluate(async () => {
    const { settings } = await window.screenwell.snapshot();
    await window.screenwell.settings({ ...settings, theme: 'light' });
  });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.screenshot({
    path: `${output}/study-plan-light.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page.evaluate(async () => {
    const { settings } = await window.screenwell.snapshot();
    await window.screenwell.settings({ ...settings, theme: 'dark' });
  });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('checkbox', { name: 'Count my blinks' }).check();
  await page.getByRole('checkbox', { name: 'Check my posture' }).check();
  await page.screenshot({
    path: `${output}/study-camera-choices.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('checkbox', { name: 'Count my blinks' }).uncheck();
  await page.getByRole('checkbox', { name: 'Check my posture' }).uncheck();
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({
    path: `${output}/study-active.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'End session', exact: true }).click();
  await page.getByRole('button', { name: 'Plan another session' }).click();
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `${output}/dashboard-dark.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page
    .locator('.focus-hero')
    .screenshot({ path: `${output}/focus-preview.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Open command menu' }).click();
  await page.screenshot({ path: `${output}/command-menu.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Close command menu' }).click();
  await page.getByRole('button', { name: 'Take a breath', exact: true }).click();
  await page.screenshot({ path: `${output}/breathing.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Close breathing reset' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page
    .locator('.appearance-studio')
    .screenshot({ path: `${output}/appearance-studio.png`, animations: 'disabled' });
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await page.evaluate(async () => {
    const { settings } = await window.screenwell.snapshot();
    await window.screenwell.settings({ ...settings, theme: 'light' });
    window.scrollTo(0, 0);
  });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.screenshot({
    path: `${output}/dashboard-light.png`,
    fullPage: true,
    animations: 'disabled',
  });
  await page.evaluate(async () => {
    const { settings } = await window.screenwell.demo(true);
    await window.screenwell.settings({
      ...settings,
      enabled: { ...settings.enabled, break: false },
    });
  });
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1120, 850));
  // Recharts runs its transitions in JavaScript, outside screenshot animation controls.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [label, filename] of [
    ['Study session', 'study-profiles'],
    ['Breaks & focus', 'breaks-focus'],
    ['Hydration', 'hydration'],
    ['Eye Rest', 'eye-rest'],
    ['Camera', 'camera-off'],
    ['Move & reset', 'move-reset'],
    ['Your progress', 'progress'],
    ['Desk setup', 'desk-setup'],
    ['Privacy & purpose', 'privacy'],
    ['Settings', 'settings'],
  ]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator('main h1')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth))
      .toBeLessThanOrEqual(1);
    await page.screenshot({
      path: `${output}/${filename}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  }
  await page.getByRole('button', { name: 'Your progress', exact: true }).click();
  const focus = page.getByRole('region', { name: 'Focus activity' });
  await expect(focus).toContainText('7 active days');
  await page.getByRole('combobox', { name: 'Report period' }).selectOption('1');
  await expect(focus).toContainText('1 active day');
  await expect(focus).toContainText('25 min');
  await page.getByRole('button', { name: 'Switch theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.screenshot({
    path: `${output}/progress-dark.png`,
    fullPage: true,
    animations: 'disabled',
  });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Saved design previews to ${output} using an isolated profile.`);
} finally {
  await app.close();
}
