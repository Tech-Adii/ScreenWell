import { describe, expect, it } from 'vitest';
import { defaults, greeting, dayKey } from '../../shared/defaults';
import { createEngine } from '../../engine/scheduler';
describe('first run', () => {
  it('starts with camera off and user-controlled reminders', () => {
    expect(defaults.cameraConsent).toBe(false);
    expect(defaults.interval).toBe(45);
    expect(defaults.onboarded).toBe(false);
  });
  it('uses the local clock for greetings and dates', () => {
    expect(greeting(8)).toBe('Good morning');
    expect(greeting(14)).toBe('Good afternoon');
    expect(greeting(20)).toBe('Good evening');
    expect(dayKey(new Date(2026, 9, 31, 23, 30).getTime())).toBe('2026-10-31');
  });
  it('schedules real deadlines from the current time', () => {
    expect(createEngine(defaults, 1000).nextDue.break).toBe(2701000);
  });
});
