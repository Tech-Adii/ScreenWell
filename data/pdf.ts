import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { EventRecord, Settings } from '../shared/types';
import { dailySummary, weekSummary, weeklyInsight } from './insights';
export async function pdfReport(
  events: EventRecord[],
  settings: Settings,
  days: number,
  fontBytes: Uint8Array,
  demo = false,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const font = await doc.embedFont(fontBytes, { subset: true });
  doc.setTitle(`ScreenWell ${days === 1 ? 'daily' : 'weekly'} habit report`);
  doc.setAuthor('ScreenWell');
  doc.setSubject('Local habit support. Not a health assessment.');
  const ink = rgb(0.16, 0.27, 0.2),
    muted = rgb(0.46, 0.54, 0.43),
    green = rgb(0.37, 0.51, 0.29),
    soft = rgb(0.93, 0.95, 0.9);
  let page: PDFPage;
  let y = 0;
  const write = (text: string, x: number, size = 10, color = ink) =>
    page.drawText(text, { x, y, font, size, color });
  const newPage = () => {
    page = doc.addPage([595.28, 841.89]);
    y = 790;
    write('SCREENWELL  /  YOUR LOCAL WELLNESS SPACE', 44, 9, green);
    page.drawLine({ start: { x: 44, y: 776 }, end: { x: 551, y: 776 }, color: soft, thickness: 1 });
    y = 746;
  };
  const line = (text: string, size = 10, color = ink) => {
    for (const row of wrap(text, font, size, 507)) {
      if (y < 65) newPage();
      write(row, 44, size, color);
      y -= size * 1.6;
    }
  };
  const heading = (text: string) => {
    if (y < 110) newPage();
    y -= 12;
    line(text, 14);
    y -= 4;
  };
  newPage();
  line('A little progress, at your pace.', 25);
  y -= 8;
  line(`${settings.name}  /  ${days === 1 ? 'Daily' : 'Weekly'} reflection`, 12, muted);
  line(new Date().toLocaleDateString(), 9, muted);
  if (demo) {
    y -= 12;
    line('DEMO MODE - SYNTHETIC SAMPLE DATA', 12, green);
  }
  const rows = weekSummary(events, settings, Date.now(), days),
    today = dailySummary(events, settings);
  y -= 22;
  page!.drawRectangle({ x: 44, y: y - 68, width: 507, height: 83, color: soft });
  const sums = [
    ['Completed pauses', rows.reduce((n, d) => n + d.breaks, 0)],
    ['Glasses logged', rows.reduce((n, d) => n + d.water, 0)],
    ['Breaks skipped', rows.reduce((n, d) => n + d.skipped, 0)],
  ] as const;
  y -= 24;
  for (let i = 0; i < sums.length; i++) {
    write(String(sums[i][1]), 62 + i * 166, 27, green);
    y -= 23;
    write(sums[i][0], 62 + i * 166, 9, muted);
    y += 23;
  }
  y -= 60;
  heading('Your daily rhythm');
  const cols = [44, 139, 194, 248, 320, 397, 477],
    headers = ['Day', 'Breaks', 'Water', 'Blinks/min', 'Posture', 'Focus min', 'Score'];
  const row = (values: string[], header = false) => {
    if (y < 90) {
      newPage();
      row(headers, true);
    }
    for (let i = 0; i < values.length; i++)
      write(values[i], cols[i], header ? 8 : 9, header ? muted : ink);
    y -= 8;
    page.drawLine({ start: { x: 44, y }, end: { x: 551, y }, color: soft, thickness: 1 });
    y -= 15;
  };
  row(headers, true);
  for (const d of rows)
    row([
      d.day,
      String(d.breaks),
      String(d.water),
      d.blink === null ? '—' : String(Math.round(d.blink)),
      d.posture === null ? '—' : String(Math.round(d.posture)),
      d.focusMinutes.toLocaleString([], { maximumFractionDigits: 1 }),
      d.score === null ? '—' : String(d.score),
    ]);
  line('— = not observed or no activity. Camera estimates may be inaccurate.', 8, muted);
  heading('A gentle observation');
  line(weeklyInsight(events), 11, muted);
  heading(`Today’s habit score: ${today.score ?? '—'} / 100`);
  line(
    'This is a project habit indicator, not a health measurement. Missing camera components are excluded and available weights are normalised.',
    9,
    muted,
  );
  y -= 6;
  for (const c of today.components)
    line(`${c.label} (weight ${c.weight}): ${c.explanation}`, 9, muted);
  heading('Your privacy, your pace');
  line(
    'Created entirely on this computer. No camera frames or video are recorded. ScreenWell offers habit support and is not a medical device.',
    9,
    muted,
  );
  for (const [i, p] of doc.getPages().entries()) {
    p.drawText(
      `CS238DL · Applied Design Thinking Lab · SDG 3     |     ${i + 1} / ${doc.getPageCount()}`,
      { x: 44, y: 32, font, size: 8, color: muted },
    );
  }
  return doc.save();
}
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.replace(/[\r\n]/g, ' ').split(' ')) {
    const proposed = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(proposed, size) > width && current) {
      lines.push(current);
      current = word;
    } else current = proposed;
  }
  if (current) lines.push(current);
  return lines;
}
