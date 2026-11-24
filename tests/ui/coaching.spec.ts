import { test, expect, _electron as electron } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store } from '../../data/store';
import { defaults } from '../../shared/defaults';
const require = createRequire(import.meta.url);
test('six-choice reminder guides and single-owner offline speech work in foreground and background', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'screenwell-coaching-'));
  const store = new Store(path.join(dir, 'screenwell.sqlite'));
  store.set('settings', {
    ...defaults,
    onboarded: true,
    name: 'Coach',
    quietEnabled: false,
    theme: 'dark',
  });
  store.close();
  const app = await electron.launch({
    executablePath: require('electron') as string,
    args: ['.', '--test'],
    env: { ...process.env, SCREENWELL_DATA_DIR: dir },
  });
  try {
    const page = await app.firstWindow();
    await expect(page.getByRole('heading', { name: /Coach/ })).toBeVisible();
    await page.evaluate(() => {
      const spoken: string[] = [];
      let canceled = 0;
      Object.defineProperty(window, '__voiceTest', { get: () => ({ spoken, canceled }) });
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        value: class {
          constructor(public text: string) {}
        },
      });
      speechSynthesis.getVoices = () => [
        { localService: true, lang: 'en-US', name: 'Test offline voice' } as SpeechSynthesisVoice,
      ];
      speechSynthesis.speak = (u) => {
        spoken.push(u.text);
      };
      speechSynthesis.cancel = () => {
        canceled++;
      };
    });
    await page.evaluate(() => window.screenwell.demo(true));
    await page.evaluate(async () => {
      const s = await window.screenwell.snapshot();
      await window.screenwell.settings({
        ...s.settings,
        enabled: { ...s.settings.enabled, break: false },
      });
    });
    await page.evaluate(() => window.screenwell.demoReminder('eyes'));
    const guide = page.getByRole('region', { name: 'Six eye-break choices' });
    await expect(guide.locator('.guide-choices button')).toHaveCount(6);
    await expect(guide.getByRole('button', { name: 'Read this exercise aloud' })).toBeDisabled();
    await page.getByRole('button', { name: 'Enable voice guidance' }).click();
    await expect
      .poll(
        async () => (await page.evaluate(() => Reflect.get(window, '__voiceTest'))).spoken.length,
      )
      .toBe(1);
    await guide.getByRole('button', { name: '2. Slow, soft blinks', exact: true }).click();
    await guide.getByRole('button', { name: 'Read this exercise aloud' }).click();
    await expect
      .poll(async () =>
        (await page.evaluate(() => Reflect.get(window, '__voiceTest'))).spoken.at(-1),
      )
      .toContain('Slow, soft blinks');
    await mkdir('release/previews/1.7', { recursive: true });
    await page.screenshot({
      path: 'release/previews/1.7/eye-guide.png',
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'Mute voice', exact: true }).click();
    await expect(guide.getByRole('button', { name: 'Read this exercise aloud' })).toBeDisabled();
    await page.getByRole('button', { name: 'Dismiss reminder' }).click();
    await page.evaluate(async () => {
      const s = await window.screenwell.snapshot();
      await window.screenwell.settings({ ...s.settings, voice: true });
    });
    const before = (await page.evaluate(() => Reflect.get(window, '__voiceTest'))).spoken.length;
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].minimize());
    await expect
      .poll(() =>
        app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMinimized()),
      )
      .toBe(true);
    await page.evaluate(() => window.screenwell.demoReminder('stretch'));
    expect((await page.evaluate(() => window.screenwell.snapshot())).engine.pending?.type).toBe(
      'stretch',
    );
    await expect.poll(() => app.windows().some((p) => p.url().endsWith('#reminder'))).toBe(true);
    const popup = app.windows().find((p) => p.url().endsWith('#reminder'))!;
    await expect(
      popup.getByRole('region', { name: 'Six stretch choices' }).locator('.guide-choices button'),
    ).toHaveCount(6);
    await expect
      .poll(
        async () => (await page.evaluate(() => Reflect.get(window, '__voiceTest'))).spoken.length,
      )
      .toBe(before + 1);
    await popup.getByRole('button', { name: '4. Wrist flexor stretch', exact: true }).click();
    await popup.getByRole('button', { name: 'Read this exercise aloud' }).click();
    await expect
      .poll(async () =>
        (await page.evaluate(() => Reflect.get(window, '__voiceTest'))).spoken.at(-1),
      )
      .toContain('Wrist flexor stretch');
    await popup.getByRole('button', { name: 'Stop speaking', exact: true }).click();
    await popup.getByRole('button', { name: 'Dismiss reminder' }).click();
    expect((await page.evaluate(() => window.screenwell.snapshot())).engine.pending).toBeNull();
  } finally {
    await app.close();
  }
});
