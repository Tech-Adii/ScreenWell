import { describe, expect, it } from 'vitest';
import {
  angle,
  calibratedThreshold,
  distance,
  eyeAspectRatio,
  largestFace,
  measurePosture,
  scorePosture,
} from '../../vision/math';
import { BlinkTracker, SustainedAlert } from '../../vision/blink';
import { Baseline } from '../../shared/types';
describe('vision geometry', () => {
  it('computes EAR for a known eye and rejects degenerate data', () => {
    expect(
      eyeAspectRatio([
        { x: 0, y: 0 },
        { x: 1, y: 1 },
        { x: 3, y: 1 },
        { x: 4, y: 0 },
        { x: 3, y: -1 },
        { x: 1, y: -1 },
      ]),
    ).toBe(0.5);
    expect(eyeAspectRatio(Array(6).fill({ x: 0, y: 0 }))).toBeNull();
    expect(eyeAspectRatio([])).toBeNull();
  });
  it('computes distances and angles', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(angle({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 })).toBe(90);
    expect(angle({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 })).toBeNull();
  });
  it('selects the largest face and declines absent/low-confidence poses', () => {
    const a = [
        { x: 0, y: 0 },
        { x: 0.1, y: 0.1 },
      ],
      b = [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ];
    expect(largestFace([a, b])).toBe(b);
    expect(largestFace([])).toBeNull();
    expect(measurePosture([], [])).toBeNull();
  });
  it('calibrates against a robust open-eye percentile', () => {
    expect(calibratedThreshold(Array(60).fill(0.3))).toBeCloseTo(0.204);
    expect(calibratedThreshold([0.3])).toBeNull();
  });
  it('scores relative to a personal baseline', () => {
    const b: Baseline = { faceSize: 0.25, headOffset: 0, shoulderY: 0.5, tilt: 0, lean: 0 };
    expect(scorePosture(b, b).score).toBe(100);
    const s = scorePosture({ ...b, faceSize: 0.4, tilt: 15, shoulderY: 0.7 }, b);
    expect(s.issues).toContain('sitting close');
    expect(s.issues).toContain('shoulder drop');
    expect(s.score).toBeLessThan(70);
    expect(scorePosture(b, null).score).toBeNull();
  });
});
describe('blink and sustained reminders', () => {
  it('counts a completed blink, not each closed frame', () => {
    const b = new BlinkTracker();
    b.update(0.3, 0, 0.2);
    b.update(0.1, 100, 0.2);
    b.update(0.1, 225, 0.2);
    expect(b.update(0.3, 350, 0.2).total).toBe(1);
    expect(b.update(0.3, 500, 0.2).total).toBe(1);
  });
  it('does not count long closure or missing-face gaps as blinks', () => {
    const b = new BlinkTracker();
    b.update(0.1, 0, 0.2);
    b.update(0.1, 1000, 0.2);
    expect(b.update(0.1, 2000, 0.2).longClosure).toBe(true);
    expect(b.update(0.3, 2100, 0.2).total).toBe(0);
    b.update(0.1, 3000, 0.2);
    b.update(null, 3100, 0.2);
    expect(b.update(0.3, 3200, 0.2).total).toBe(0);
  });
  it('waits a full observed minute and resets rate when the user leaves', () => {
    const b = new BlinkTracker();
    expect(b.update(0.3, 0, 0.2).rate).toBeNull();
    for (let t = 1000; t < 60000; t += 1000) b.update(0.3, t, 0.2);
    expect(b.update(0.3, 60000, 0.2).rate).toBe(0);
    expect(b.update(null, 61000, 0.2).rate).toBeNull();
    expect(b.update(0.3, 62000, 0.2).rate).toBeNull();
  });
  it('requires sustained evidence and applies cooldown', () => {
    const a = new SustainedAlert();
    expect(a.update(true, true, 0, 12000, 300000)).toBe(false);
    expect(a.update(true, true, 12000, 12000, 300000)).toBe(true);
    expect(a.update(true, true, 24000, 12000, 300000)).toBe(false);
    expect(a.update(true, false, 300000, 12000, 300000)).toBe(false);
    expect(a.update(true, true, 320000, 12000, 300000)).toBe(false);
    expect(a.update(true, true, 332000, 12000, 300000)).toBe(true);
  });
  it('does not invent observations across dropped frames or clock reversal', () => {
    const b = new BlinkTracker();
    b.update(0.3, 0, 0.2);
    b.update(0.1, 100, 0.2);
    expect(b.update(0.3, 60000, 0.2)).toMatchObject({ total: 0, rate: null });
    b.update(0.1, 60100, 0.2);
    expect(b.update(0.3, 59000, 0.2).total).toBe(0);
  });
  it('requires open eyes before a blink and a definite reopening', () => {
    const b = new BlinkTracker();
    b.update(0.1, 0, 0.2);
    expect(b.update(0.3, 100, 0.2).total).toBe(0);
    b.update(0.19, 200, 0.2);
    expect(b.update(0.205, 300, 0.2).total).toBe(0);
    b.update(0.19, 400, 0.2);
    expect(b.update(0.3, 500, 0.2).total).toBe(1);
  });
});
