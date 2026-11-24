import { describe, expect, it } from 'vitest';
import { Baseline, DistanceBaseline, FaceMeasurement, VisionMetrics } from '../../shared/types';
import {
  calibrateDistance,
  calibratePosture,
  distanceScale,
  measureFace,
  measurePosture,
  rotationAngles,
  scorePosture,
  Point,
} from '../../vision/math';
import { Dwell, PostureFilter, ProximityFilter } from '../../vision/posture';
import { VisionAlerts } from '../../engine/vision-alerts';
import { defaults } from '../../shared/defaults';
import { act, createEngine } from '../../engine/scheduler';
const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const face: FaceMeasurement = {
  faceSize: 0.3,
  eyeSpan: 0.2,
  faceHeight: 0.4,
  yaw: 0,
  pitch: 0,
  roll: 0,
};
const distance: DistanceBaseline = { ...face, version: 2, calibratedAt: 100 };
const baseline: Baseline = {
  version: 2,
  faceSize: 0.3,
  headOffset: -0.25,
  shoulderY: 0.65,
  tilt: 0,
  lean: 0,
  neckLength: 0.5,
  shoulderSlope: 0,
  headPitch: 0,
  worldSpace: true,
  model: 'full',
  calibratedAt: 100,
};
const settings = {
  ...defaults,
  baseline,
  distanceBaseline: distance,
  onboarded: true,
  quietEnabled: false,
};
const sample = (
  overrides: Partial<
    Pick<
      VisionMetrics,
      'present' | 'quality' | 'distanceState' | 'posture' | 'issues' | 'blinksPerMinute'
    >
  > = {},
) => ({
  present: true,
  quality: 'clear' as const,
  distanceState: 'close' as const,
  posture: 100,
  issues: [],
  blinksPerMinute: null,
  ...overrides,
});
const scale = (factor: number): FaceMeasurement => ({
  ...face,
  faceSize: face.faceSize * factor,
  eyeSpan: face.eyeSpan * factor,
  faceHeight: face.faceHeight * factor,
});
function landmarks(): Point[] {
  const points = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  for (const [i, x, y] of [
    [10, 0.5, 0.25],
    [152, 0.5, 0.7],
    [234, 0.3, 0.48],
    [454, 0.7, 0.48],
    [33, 0.38, 0.4],
    [263, 0.62, 0.4],
    [1, 0.5, 0.45],
  ])
    points[i] = { x, y, z: 0 };
  return points;
}
describe('face-only distance and stable personal calibration', () => {
  it('measures distance from face anchors without needing shoulder landmarks', () => {
    const measured = measureFace(landmarks(), identity);
    expect(measured).not.toBeNull();
    const base = { ...measured!, version: 2 as const, calibratedAt: 1 };
    const larger = landmarks().map((p) => ({
      ...p,
      x: 0.5 + (p.x - 0.5) * 1.3,
      y: 0.5 + (p.y - 0.5) * 1.3,
    }));
    expect(distanceScale(measureFace(larger, identity), base)).toBeCloseTo(1.3);
  });
  it('extracts scaled matrix rotation without confusing translation with head angle', () => {
    const angle = (20 * Math.PI) / 180,
      c = Math.cos(angle),
      s = Math.sin(angle);
    expect(
      rotationAngles([c * 2, 0, -s * 2, 0, 0, 2, 0, 0, s * 2, 0, c * 2, 0, 10, 20, 30, 1])!.yaw,
    ).toBeCloseTo(20);
    expect(rotationAngles(identity)).toEqual({ pitch: 0, yaw: -0, roll: 0 });
    expect(rotationAngles(Array(16).fill(0))).toBeNull();
  });
  it('rejects clipped faces, large head turns and inconsistent anchor ratios', () => {
    const clipped = landmarks();
    clipped[152].y = 1.05;
    expect(measureFace(clipped, identity)).toBeNull();
    expect(distanceScale({ ...scale(1.3), yaw: 30 }, distance)).toBeNull();
    expect(distanceScale({ ...scale(1.3), eyeSpan: 0.18 }, distance)).toBeNull();
  });
  it('requires enough steady samples and saves versioned calibration', () => {
    expect(calibrateDistance(Array(12).fill(face), 500)?.calibratedAt).toBe(500);
    expect(calibrateDistance(Array(5).fill(face), 500)).toBeNull();
    expect(
      calibrateDistance(
        Array.from({ length: 20 }, (_, i) => scale(i % 2 ? 1 : 1.8)),
        500,
      ),
    ).toBeNull();
    expect(calibratePosture(Array(12).fill(baseline), 'heavy', 500)?.model).toBe('heavy');
  });
  it('filters a one-frame spike and applies a separate release threshold', () => {
    const p = new ProximityFilter();
    for (let n = 0; n < 10; n++) p.update(face, distance, 1.25, n * 200);
    expect(p.update(scale(1.6), distance, 1.25, 2000).state).toBe('comfortable');
    for (let n = 11; n < 35; n++) p.update(scale(1.3), distance, 1.25, n * 200);
    expect(p.update(scale(1.23), distance, 1.25, 7000).state).toBe('close');
    for (let n = 36; n < 60; n++) p.update(scale(1.1), distance, 1.25, n * 200);
    expect(p.update(scale(1.1), distance, 1.25, 12000).state).toBe('comfortable');
    expect(p.update(null, distance, 1.25, 12200).state).toBe('unknown');
  });
});
describe('posture reliability', () => {
  it('alerts strictly below 80 after dwell, regardless of issue labels, and resets at 80', () => {
    const alerts = new VisionAlerts();
    const config = { ...settings, distanceBaseline: null, postureHoldSeconds: 5 };
    for (let t = 0; t <= 6000; t += 1000)
      expect(
        alerts.observe(sample({ posture: 80, issues: ['head tilt'] }), config, t, true, false),
      ).toBeNull();
    for (let t = 7000; t < 12000; t += 1000)
      expect(
        alerts.observe(sample({ posture: 79, issues: [] }), config, t, true, false),
      ).toBeNull();
    expect(alerts.observe(sample({ posture: 79, issues: [] }), config, 12000, true, false)).toBe(
      'posture',
    );
    alerts.observe(sample({ posture: 80 }), config, 13000, true, false);
    expect(alerts.observe(sample({ posture: 79 }), config, 14000, true, false)).toBeNull();
    alerts.observe(sample({ posture: 79, quality: 'lighting' }), config, 15000, true, false);
    expect(alerts.observe(sample({ posture: 79 }), config, 16000, true, false)).toBeNull();
  });
  it('uses shoulder-relative world depth and ignores pure image scale changes', () => {
    const p: Point[] = Array.from({ length: 33 }, () => ({
      x: 0.5,
      y: 0.5,
      z: 0,
      visibility: 0.99,
    }));
    p[0] = { x: 0.5, y: 0.42, z: 0, visibility: 0.99 };
    p[7] = { x: 0.45, y: 0.4, z: 0, visibility: 0.99 };
    p[8] = { x: 0.55, y: 0.4, z: 0, visibility: 0.99 };
    p[11] = { x: 0.3, y: 0.65, z: 0, visibility: 0.99 };
    p[12] = { x: 0.7, y: 0.65, z: 0, visibility: 0.99 };
    const w = p.map((v) => ({ ...v }));
    w[7] = { x: -0.06, y: 0.25, z: -0.1 };
    w[8] = { x: 0.06, y: 0.25, z: -0.1 };
    w[11] = { x: -0.2, y: 0.5, z: 0 };
    w[12] = { x: 0.2, y: 0.5, z: 0 };
    const base = { ...measurePosture(landmarks(), p, w, face)!, version: 2 as const };
    expect(base.headOffset).toBeCloseTo(-0.25);
    const zoom = p.map((v) => ({ ...v, x: 0.5 + (v.x - 0.5) * 1.2, y: 0.5 + (v.y - 0.5) * 1.2 }));
    expect(scorePosture(measurePosture(landmarks(), zoom, w, face), base).score).toBe(100);
    w[7].z = -0.2;
    w[8].z = -0.2;
    expect(scorePosture(measurePosture(landmarks(), p, w, face), base).issues).toContain(
      'forward head',
    );
    p[11].presence = 0.2;
    expect(measurePosture(landmarks(), p, w, face)).toBeNull();
  });
  it('does not blend fallback image depth into recovered world depth', () => {
    const p = new PostureFilter();
    for (let t = 0; t < 1000; t += 100)
      p.update({ ...baseline, worldSpace: false, headOffset: -2 }, baseline, t);
    expect(p.update(baseline, baseline, 1000).issues).not.toContain('forward head');
  });
  it('smooths threshold jitter and drops missing observations', () => {
    const p = new PostureFilter();
    let switches = 0,
      previous = false;
    for (let n = 0; n < 80; n++) {
      const current = p
        .update({ ...baseline, tilt: n % 2 ? 9 : 11 }, baseline, n * 160)
        .issues.includes('head tilt');
      if (current !== previous) switches++;
      previous = current;
    }
    expect(switches).toBeLessThan(5);
    expect(p.update(null, baseline, 14000).score).toBeNull();
  });
});
describe('sustained proximity alerts', () => {
  it('ignores a brief lean, resets on recovery, and alerts only after 10 continuous seconds', () => {
    const a = new VisionAlerts();
    for (let t = 0; t <= 3000; t += 250)
      expect(a.observe(sample(), settings, t, true, true)).toBeNull();
    a.observe(sample({ distanceState: 'comfortable' }), settings, 3250, true, true);
    for (let t = 3500; t < 13500; t += 250)
      expect(a.observe(sample(), settings, t, true, true)).toBeNull();
    expect(a.observe(sample(), settings, 13500, true, true)).toBe('distance');
  });
  it('does not accumulate time across missing frames or poor-quality views', () => {
    for (const quality of ['no-face', 'lighting', 'turned', 'multiple', 'settling'] as const) {
      const a = new VisionAlerts();
      for (let t = 0; t <= 9000; t += 250) a.observe(sample(), settings, t, true, true);
      a.observe(sample({ quality }), settings, 9250, true, true);
      expect(a.observe(sample(), settings, 10000, true, true)).toBeNull();
    }
    const d = new Dwell();
    d.observe(true, 0);
    d.observe(true, 1000);
    expect(d.observe(true, 5000)).toBe(0);
  });
  it('does not consume cooldown until a reminder is actually delivered', () => {
    const a = new VisionAlerts();
    for (let t = 0; t <= 10000; t += 250) a.observe(sample(), settings, t, true, true);
    expect(a.observe(sample(), settings, 10250, true, true)).toBe('distance');
    a.delivered('distance', 10250);
    expect(a.observe(sample(), settings, 10500, true, true)).toBeNull();
    for (let t = 10750; t <= 70000; t += 250)
      expect(a.observe(sample(), settings, t, true, true)).toBeNull();
    expect(a.observe(sample(), settings, 70250, true, true)).toBe('distance');
  });
  it('respects user deferral and requires fresh evidence after focus', () => {
    const a = new VisionAlerts();
    for (let t = 0; t <= 20000; t += 250)
      expect(a.observe(sample(), settings, t, false, false)).toBeNull();
    expect(a.observe(sample(), settings, 20250, true, true)).toBeNull();
    const e = createEngine(settings, 0);
    e.pending = {
      id: 'distance',
      type: 'posture',
      reason: 'distance',
      createdAt: 0,
      source: 'vision',
      soft: true,
    };
    expect(act(e, settings, 'snooze5', 1000).state.visionSnoozeUntil?.posture).toBe(301000);
  });
  it('never produces a distance alert before a personal distance calibration', () => {
    const a = new VisionAlerts();
    for (let t = 0; t <= 20000; t += 250)
      expect(
        a.observe(sample(), { ...settings, distanceBaseline: null }, t, true, true),
      ).toBeNull();
  });
});
