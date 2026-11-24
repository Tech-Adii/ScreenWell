import { describe, expect, it } from 'vitest';
import { csvCell, csvReport } from '../../data/reports';
import { badges, dailySummary } from '../../data/insights';
import { defaults, dayKey } from '../../shared/defaults';
import { EventRecord } from '../../shared/types';
const event = (type: string, value = 1): EventRecord => ({
  id: 1,
  type,
  value,
  at: Date.now(),
  day: dayKey(),
  detail: '',
});
describe('local reports', () => {
  it('shows unobserved metrics as missing and excludes them from scoring', () => {
    const s = dailySummary(
      [event('water', 8), ...Array.from({ length: 4 }, () => event('break-complete'))],
      defaults,
    );
    expect(s.score).toBe(100);
    expect(s.blink).toBeNull();
    expect(s.posture).toBeNull();
    expect(s.components).toHaveLength(2);
  });
  it('shows no score before activity', () => expect(dailySummary([], defaults).score).toBeNull());
  it('summarizes large focus histories without exceeding the argument limit', () => {
    const rows = Array.from({ length: 150000 }, () => event('focus-complete', 1));
    const summary = dailySummary(rows, defaults);
    expect(summary.focus).toBe(1);
    expect(summary.focusMinutes).toBe(150000);
  });
  it('counts each logged focus block once and does not invent a wellness score', () => {
    const summary = dailySummary(
      [
        event('study-session-started', 120),
        event('focus-complete', 20),
        event('focus-complete', 15),
        event('study-session-complete', 35),
      ],
      defaults,
    );
    expect(summary.focusMinutes).toBe(35);
    expect(summary.focus).toBe(20);
    expect(summary.score).toBeNull();
  });
  it('counts all guided eye-rest options toward the eye exercise milestone', () => {
    const logged = ['distance-gaze', 'closed-rest', 'slow-blink'].map((detail) => ({
      ...event('exercise-complete'),
      detail,
    }));
    expect(badges(logged, defaults).find((badge) => badge.name === 'Blink Boss')?.earned).toBe(
      true,
    );
  });
  it('escapes CSV formulas and quotes safely', () => {
    expect(csvCell('=WEBSERVICE("x")')).toBe('"\'=WEBSERVICE(""x"")"');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvReport([])).toContain('date_local');
  });
});
