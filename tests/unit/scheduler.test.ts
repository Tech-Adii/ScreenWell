import { describe, expect, it } from 'vitest';
import { defaults, dayKey } from '../../shared/defaults';
import { act, createEngine, inWindow, mayRemind, setFocus, tick } from '../../engine/scheduler';
const settings = { ...defaults, onboarded: true, quietEnabled: false, autoDelay: false };
const now = new Date(2026, 9, 31, 12, 0).getTime();
const due = () => {
  const s = createEngine(settings, now);
  s.nextDue.break = now;
  return s;
};
describe('scheduler', () => {
  it('delivers exactly one due reminder', () => {
    const r = tick(due(), settings, now);
    expect(r.state.pending?.type).toBe('break');
    expect(tick(r.state, settings, now + 1000).events).toEqual([]);
  });
  it('snoozes for the selected amount and does not disable future reminders', () => {
    const s = tick(due(), settings, now).state;
    for (const m of [5, 10, 15] as const) {
      const r = act(s, settings, `snooze${m}`, now);
      expect(r.state.nextDue.break).toBe(now + m * 60000);
      expect(r.state.pending).toBeNull();
    }
  });
  it('suppresses reminders for timed and indefinite focus', () => {
    for (const m of [30, 0]) {
      const s = setFocus(due(), settings, m, now).state;
      expect(mayRemind(s, settings, 'break', now)).toBe(false);
      expect(tick(s, settings, now + 1000).state.pending).toBeNull();
    }
  });
  it('honours quiet hours across midnight', () => {
    const s = { ...settings, quietEnabled: true };
    for (const hour of [23, 0, 6])
      expect(mayRemind(due(), s, 'break', new Date(2026, 9, 31, hour).getTime())).toBe(false);
    expect(inWindow('22:00', '07:00', now)).toBe(false);
  });
  it('turns one type off for today, then resumes next day', () => {
    const s = tick(due(), settings, now).state;
    const r = act(s, settings, 'off', now).state;
    expect(r.disabledToday.break).toBe(dayKey(now));
    expect(mayRemind(r, settings, 'break', now)).toBe(false);
    expect(mayRemind(r, settings, 'break', now + 86400000)).toBe(true);
  });
  it('asks after three skips without silently changing settings', () => {
    let s = due();
    for (let i = 0; i < 3; i++) {
      s.pending = { id: String(i), type: 'break', createdAt: now, source: 'timer', soft: false };
      s = act(s, settings, 'skip', now).state;
    }
    expect(s.suggestion).toBe('break');
    expect(settings.interval).toBe(45);
  });
  it('avoids a backlog after sleep', () => {
    const s = due();
    const r = tick(s, settings, now + 3 * 3600000);
    expect(r.state.pending).toBeNull();
    expect(r.state.nextDue.break).toBeGreaterThan(now + 3 * 3600000);
  });
  it('holds reminders at a typing burst and eventually releases', () => {
    const s = due(),
      prefs = { ...settings, autoDelay: true };
    expect(tick(s, prefs, now, now - 100).state.pending).toBeNull();
    s.lastTick = now + 6 * 60000;
    expect(tick(s, prefs, now + 6 * 60000, now + 6 * 60000 - 100).state.pending).not.toBeNull();
  });
  it('keeps hydration within active hours', () => {
    expect(mayRemind(due(), settings, 'water', new Date(2026, 9, 31, 3).getTime())).toBe(false);
  });
});
