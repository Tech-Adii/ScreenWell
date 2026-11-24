import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { PDFDocument, PDFPage } from 'pdf-lib';
import { pdfReport } from '../../data/pdf';
import { defaults, dayKey } from '../../shared/defaults';
describe('offline PDF generation', () => {
  it('prints total focus minutes for multiple completed blocks', async () => {
    const draw = vi.spyOn(PDFPage.prototype, 'drawText');
    try {
      await pdfReport(
        [20, 15].map((value, id) => ({
          id,
          value,
          type: 'focus-complete',
          detail: '',
          at: Date.now(),
          day: dayKey(),
        })),
        defaults,
        1,
        readFileSync('assets/public/fonts/NotoSans-Regular.ttf'),
      );
      expect(draw.mock.calls.some(([text]) => text === '35')).toBe(true);
    } finally {
      draw.mockRestore();
    }
  });
  it('creates a valid report with an embedded local font', async () => {
    const bytes = await pdfReport(
      [],
      { ...defaults, name: 'Zoë & <Alex>' },
      7,
      readFileSync('assets/public/fonts/NotoSans-Regular.ttf'),
    );
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getTitle()).toContain('weekly');
    expect(pdf.getAuthor()).toBe('ScreenWell');
  });
});
