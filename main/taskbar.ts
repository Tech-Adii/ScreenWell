import { nativeImage, type BrowserWindow, type Tray } from 'electron';
import { desktopCountdown } from '../engine/desktop-countdown';
import type { Snapshot } from '../shared/types';
import { formatCountdown } from '../shared/wellness';

const digits: Record<string, number[]> = {
  '0': [7, 5, 5, 5, 7],
  '1': [2, 6, 2, 2, 7],
  '2': [7, 1, 7, 4, 7],
  '3': [7, 1, 7, 1, 7],
  '4': [5, 5, 7, 1, 1],
  '5': [7, 4, 7, 1, 7],
  '6': [7, 4, 7, 5, 7],
  '7': [7, 1, 2, 2, 2],
  '8': [7, 5, 7, 5, 7],
  '9': [7, 5, 7, 1, 7],
  '<': [0, 1, 2, 4, 0],
};

function createMinutesBadge(text: string) {
  const size = 16;
  const bitmap = Buffer.alloc(size * size * 4);
  function drawPixel(x: number, y: number, color: number) {
    // NativeImage's 32-bit Windows bitmap stores blue, green, red, then alpha.
    bitmap.writeUInt32LE(color, (y * size + x) * 4);
  }
  for (let y = 1; y < size - 1; y++) {
    for (let x = 0; x < size; x++) {
      if ((y === 1 || y === size - 2) && (x === 0 || x === size - 1)) continue;
      drawPixel(x, y, 0xff173d70);
    }
  }
  const scale = text.length < 3 ? 2 : 1;
  const left = Math.floor((size - scale * (text.length * 4 - 1)) / 2);
  const top = Math.floor((size - 5 * scale) / 2);
  for (const [index, character] of Array.from(text).entries()) {
    for (const [y, row] of digits[character].entries()) {
      for (let x = 0; x < 3; x++) {
        if (!(row & (1 << (2 - x)))) continue;
        for (let dy = 0; dy < scale; dy++)
          for (let dx = 0; dx < scale; dx++)
            drawPixel(left + (index * 4 + x) * scale + dx, top + y * scale + dy, 0xffffffff);
      }
    }
  }
  return nativeImage.createFromBitmap(bitmap, { width: size, height: size });
}

export function createTaskbarCountdown(window: BrowserWindow, tray: Tray) {
  let title = '';
  let badge = '';
  let bar = -1;
  let paused = false;

  return (data: Snapshot, now = Date.now(), refresh = false) => {
    if (window.isDestroyed() || tray.isDestroyed()) return;
    const status = desktopCountdown(data, now);
    const timed = 'remaining' in status;
    const active = timed && !status.paused && status.remaining > 0;
    const time = timed ? formatCountdown(status.remaining) : '';
    const detail = timed ? `${status.label} ${time}${status.paused ? ' left' : ''}` : status.label;
    const nextTitle = detail ? `ScreenWell · ${detail}` : 'ScreenWell';
    if (refresh || title !== nextTitle) {
      tray.setToolTip(nextTitle);
      if (process.platform === 'win32' || process.platform === 'linux') window.setTitle(nextTitle);
      title = nextTitle;
    }
    if (process.platform !== 'win32') return;
    const nextBar = timed ? (status.progress ?? -1) : -1;
    const nextPaused = timed && !!status.paused;
    if (refresh || bar !== nextBar || paused !== nextPaused) {
      window.setProgressBar(nextBar, { mode: nextPaused ? 'paused' : 'normal' });
      bar = nextBar;
      paused = nextPaused;
    }
    const minutes = timed ? Math.ceil(status.remaining / 60000) : 0;
    const nextBadge =
      active && minutes <= 999 ? (status.remaining < 60000 ? '<1' : String(minutes)) : '';
    const duration =
      nextBadge === '<1' ? 'under 1 minute' : `about ${minutes} minute${minutes === 1 ? '' : 's'}`;
    const description = nextBadge ? `${status.label} ${duration}` : '';
    if (refresh || badge !== description) {
      window.setOverlayIcon(nextBadge ? createMinutesBadge(nextBadge) : null, description);
      badge = description;
    }
  };
}
