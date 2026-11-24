import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const data = await mkdtemp(path.join(tmpdir(), 'screenwell-portable-'));
const version = JSON.parse(await readFile('package.json', 'utf8')).version;
const executablePath = path.resolve(
  process.argv[2] ?? `release/ScreenWell-${version}-Portable.exe`,
);
const launcher = spawn(executablePath, ['--test', '--remote-debugging-port=0'], {
  windowsHide: true,
  env: { ...process.env, SCREENWELL_DATA_DIR: data },
  stdio: 'ignore',
});
let browser;
try {
  let endpoint = null;
  for (let n = 0; n < 120; n++) {
    try {
      // Read only this isolated profile's endpoint; never attach to an existing app's port.
      const [port, browserPath] = (await readFile(path.join(data, 'DevToolsActivePort'), 'utf8'))
        .trim()
        .split(/\r?\n/);
      if (/^\d+$/.test(port) && browserPath?.startsWith('/devtools/browser/')) {
        endpoint = `ws://127.0.0.1:${port}${browserPath}`;
        break;
      }
    } catch {
      /* The portable launcher is still extracting its local runtime. */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!endpoint)
    throw new Error('Portable launcher did not expose its requested local test endpoint.');
  browser = await chromium.connectOverCDP(endpoint);
  const context = browser.contexts()[0];
  const page = context.pages()[0] ?? (await context.waitForEvent('page'));
  await page.getByText('Let’s make this feel like you.').waitFor();
  const snap = await page.evaluate(() => window.screenwell.snapshot());
  if (!snap.privacy.dataPath.startsWith(data))
    throw new Error('Portable test profile isolation failed');
  await context.setOffline(true);
  await page.reload();
  await page.getByPlaceholder('What should we call you?').fill('Portable check');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Make room for a pause' }).click();
  await page.getByRole('heading', { name: /Portable check/ }).waitFor();
  if (!snap.privacy.modelReady || snap.privacy.cameraOn)
    throw new Error('Portable assets/default camera check failed');
  await page.getByRole('button', { name: 'Hydration', exact: true }).click();
  await page.getByRole('button', { name: 'I drank water', exact: true }).click();
  const after = await page.evaluate(() => window.screenwell.snapshot());
  if (after.events.filter((e) => e.type === 'water').length !== 1)
    throw new Error('Portable water log failed');
  await writeFile(
    'test-results/portable-smoke.json',
    JSON.stringify(
      {
        executablePath,
        data,
        offlineReload: true,
        localModels: true,
        cameraOff: true,
        waterLogged: true,
      },
      null,
      2,
    ),
  );
  console.log('Portable executable smoke passed, including offline reload and local SQLite write.');
} finally {
  if (browser) {
    const session = await browser.newBrowserCDPSession();
    await Promise.race([
      session.send('Browser.close').catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  }
  if (launcher.pid && launcher.exitCode === null && !launcher.killed)
    spawn('taskkill', ['/PID', String(launcher.pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
    });
}
