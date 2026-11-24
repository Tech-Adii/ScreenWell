import { describe, expect, it } from 'vitest';
import { Store } from '../../data/store';
import { defaults } from '../../shared/defaults';
import { seedDemo } from '../../data/demo';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
describe('local SQLite storage', () => {
  it('adds appearance preferences to an older profile without losing its saved theme or history', () => {
    const s = new Store(':memory:');
    const legacy: Record<string, unknown> = {
      ...defaults,
      name: 'Existing profile',
      theme: 'dark',
      fontScale: 1.1,
    };
    for (const key of [
      'palette',
      'primaryColor',
      'companionColor',
      'motionLevel',
      'ambientEffects',
    ])
      delete legacy[key];
    s.set('settings', legacy);
    s.log('water');
    expect(s.settings()).toMatchObject({
      name: 'Existing profile',
      theme: 'dark',
      fontScale: 1.1,
      palette: 'aurora',
      motionLevel: 'gentle',
      ambientEffects: true,
    });
    expect(s.events()).toHaveLength(1);
    s.close();
  });
  it('migrates calibration geometry without losing a profile or history', () => {
    const s = new Store(':memory:');
    s.set('settings', {
      ...defaults,
      name: 'Existing student',
      onboarded: true,
      baseline: { faceSize: 0.3, headOffset: 0, shoulderY: 0.5, tilt: 0, lean: 0 },
    });
    s.log('water');
    expect(s.settings().baseline).toBeNull();
    expect(s.settings().name).toBe('Existing student');
    expect(s.settings().distanceHoldSeconds).toBe(10);
    expect(s.events()).toHaveLength(1);
    s.close();
  });
  it('persists real data through reopening and clears profile/history/feedback', () => {
    const filename = path.join(mkdtempSync(path.join(tmpdir(), 'screenwell-db-')), 'test.sqlite');
    let s = new Store(filename);
    s.set('settings', { ...defaults, name: 'Morgan', onboarded: true });
    s.log('water');
    s.feedback('Please keep reminders gentle.');
    s.close();
    s = new Store(filename);
    expect(s.settings().name).toBe('Morgan');
    expect(s.events()).toHaveLength(1);
    s.clear();
    expect(s.events()).toEqual([]);
    expect(s.settings().onboarded).toBe(false);
    s.close();
  });
  it('keeps synthetic activity separate from personal history', () => {
    const real = new Store(':memory:'),
      demo = new Store(':memory:');
    seedDemo(demo, defaults);
    expect(demo.events().length).toBeGreaterThan(50);
    expect(demo.events().every((e) => e.detail.startsWith('DEMO:'))).toBe(true);
    expect(real.events()).toEqual([]);
    demo.close();
    real.close();
  });
});
