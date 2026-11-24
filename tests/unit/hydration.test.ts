import { describe, expect, it } from 'vitest';
import { hydrationStreak } from '../../data/insights';
import { dayKey } from '../../shared/defaults';
import { EventRecord } from '../../shared/types';
describe('hydration streak', () => {
  const now = new Date(2026, 9, 31, 12).getTime();
  const glass = (ago: number, n = 8): EventRecord => {
    const d = new Date(now);
    d.setDate(d.getDate() - ago);
    return {
      id: ago,
      type: 'water',
      at: d.getTime(),
      day: dayKey(d.getTime()),
      value: n,
      detail: '',
    };
  };
  it('does not invent progress', () => expect(hydrationStreak([], 8, now)).toBe(0));
  it('preserves yesterday’s streak while today is unfinished', () =>
    expect(hydrationStreak([glass(1), glass(2), glass(0, 2)], 8, now)).toBe(2));
  it('includes today when the target is met', () =>
    expect(hydrationStreak([glass(0), glass(1), glass(3)], 8, now)).toBe(2));
});
