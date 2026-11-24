import { test, expect, _electron as electron } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store } from '../../data/store';
import { defaults } from '../../shared/defaults';
const require = createRequire(import.meta.url);
test('a background reminder stays dismissible without taking focus', async () => {
  const data = await mkdtemp(path.join(tmpdir(), 'screenwell-popup-'));
  const store = new Store(path.join(data, 'screenwell.sqlite'));
  store.set('settings', {
    ...defaults,
    name: 'Popup test',
    onboarded: true,
    quietEnabled: false,
    theme: 'dark',
    palette: 'custom',
    primaryColor: '#ff8a66',
    companionColor: '#5bded0',
  });
  store.close();
  const app = await electron.launch({
    executablePath: require('electron') as string,
    args: ['.', '--test'],
    env: { ...process.env, SCREENWELL_DATA_DIR: data },
  });
  try {
    const page = await app.firstWindow();
    await page.getByRole('heading', { name: /Popup test/ }).waitFor();
    await page.evaluate(() => window.screenwell.demo(true));
    const mainId = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      win.hide();
      return win.id;
    });
    const popupPromise = app.waitForEvent('window');
    await page.evaluate(() => window.screenwell.demoReminder('break'));
    const popup = await popupPromise;
    await expect(popup.getByRole('button', { name: 'Do it now', exact: true })).toBeVisible();
    const pendingId = await popup.evaluate(
      async () => (await window.screenwell.snapshot()).engine.pending?.id,
    );
    expect(pendingId).toBeTruthy();
    await popup.evaluate(() => window.screenwell.reminder('skip', 'previous-reminder'));
    expect(
      await popup.evaluate(async () => (await window.screenwell.snapshot()).engine.pending?.id),
    ).toBe(pendingId);
    await expect(popup.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(popup.locator('html')).toHaveAttribute('data-palette', 'custom');
    expect(
      await popup.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--accent'),
      ),
    ).toBe('#ff8a66');
    expect(
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getFocusedWindow()?.id ?? null),
    ).toBeNull();
    await popup.getByRole('button', { name: 'Turn off for today', exact: true }).click();
    const state = await page.evaluate(() => window.screenwell.snapshot());
    expect(state.engine.pending).toBeNull();
    expect(state.engine.disabledToday.break).toBeTruthy();
    await app.evaluate(({ BrowserWindow }, id) => BrowserWindow.fromId(id)?.show(), mainId);
  } finally {
    await app.close();
  }
});
