import { Baseline, DistanceBaseline, FaceMeasurement, VisionMode } from '../shared/types';
import { visionConfig as cfg } from './config';
export interface Point {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
  presence?: number;
}
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export function eyeAspectRatio(eye: Point[]): number | null {
  if (eye.length !== 6 || eye.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y)))
    return null;
  const width = distance(eye[0], eye[3]);
  return width > 1e-6 ? (distance(eye[1], eye[5]) + distance(eye[2], eye[4])) / (2 * width) : null;
}
export function angle(a: Point, b: Point, c: Point): number | null {
  const u = { x: a.x - b.x, y: a.y - b.y },
    v = { x: c.x - b.x, y: c.y - b.y };
  const denominator = Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y);
  return denominator < 1e-8
    ? null
    : (Math.acos(Math.min(1, Math.max(-1, (u.x * v.x + u.y * v.y) / denominator))) * 180) / Math.PI;
}
export const leftEye = [33, 160, 158, 133, 153, 144];
export const rightEye = [362, 385, 387, 263, 373, 380];
export function faceEar(face: Point[], aspect = 4 / 3): number | null {
  if (face.length < 388) return null;
  const scaled = (indices: number[]) => indices.map((i) => ({ ...face[i], x: face[i].x * aspect }));
  const left = eyeAspectRatio(scaled(leftEye)),
    right = eyeAspectRatio(scaled(rightEye));
  return left === null || right === null ? null : (left + right) / 2;
}
export function faceSize(face: Point[]): number {
  if (!face.length) return 0;
  const xs = face.map((p) => p.x),
    ys = face.map((p) => p.y);
  return Math.sqrt((Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)));
}
export function largestFace(faces: Point[][]): Point[] | null {
  return faces.length ? faces.reduce((a, b) => (faceSize(a) > faceSize(b) ? a : b)) : null;
}
export function measurePosture(
  face: Point[],
  pose: Point[],
  world: Point[] = [],
  head: FaceMeasurement | null = null,
  aspect = 4 / 3,
): Baseline | null {
  if (
    face.length < 388 ||
    pose.length < 13 ||
    [0, 7, 8, 11, 12].some((i) => ![pose[i].x, pose[i].y, pose[i].z].every(Number.isFinite)) ||
    [11, 12].some(
      (i) => pose[i].x < 0.015 || pose[i].x > 0.985 || pose[i].y < 0.015 || pose[i].y > 0.985,
    ) ||
    [0, 11, 12].some(
      (i) => Math.min(pose[i].visibility ?? 0, pose[i].presence ?? 1) < cfg.minVisibility,
    ) ||
    Math.min(pose[7].visibility ?? 0, pose[8].visibility ?? 0) < 0.5
  )
    return null;
  const [nose, earL, earR, l, r] = [pose[0], pose[7], pose[8], pose[11], pose[12]];
  const width = Math.abs(l.x - r.x) * aspect;
  if (width < 0.06) return null;
  const eyeL = face[33],
    eyeR = face[263];
  const validWorld =
    world.length >= 13 &&
    [7, 8, 11, 12].every((i) => [world[i].x, world[i].y, world[i].z].every(Number.isFinite));
  const worldWidth = validWorld
    ? Math.hypot(
        world[11].x - world[12].x,
        world[11].y - world[12].y,
        (world[11].z ?? 0) - (world[12].z ?? 0),
      )
    : 0;
  const depth =
    validWorld && worldWidth > 0.1 && worldWidth < 0.9
      ? (world[7].z! + world[8].z! - (world[11].z! + world[12].z!)) / 2 / worldWidth
      : null;
  return {
    faceSize: faceSize(face),
    headOffset: depth ?? ((nose.z ?? 0) - ((earL.z ?? 0) + (earR.z ?? 0)) / 2) / width,
    shoulderY: (l.y + r.y) / 2,
    tilt:
      head?.roll ??
      (Math.atan2(eyeR.y - eyeL.y, Math.abs(eyeR.x - eyeL.x) * aspect) * 180) / Math.PI,
    lean: (((earL.x + earR.x) / 2 - (l.x + r.x) / 2) * aspect) / width,
    neckLength: (l.y + r.y - earL.y - earR.y) / 2 / width,
    shoulderSlope: (Math.atan2(r.y - l.y, Math.abs(r.x - l.x) * aspect) * 180) / Math.PI,
    headPitch: head?.pitch,
    worldSpace: depth !== null,
  };
}
export function scorePosture(
  current: Baseline | null,
  baseline: Baseline | null,
): { score: number | null; issues: string[] } {
  if (!current || !baseline || baseline.faceSize <= 0) return { score: null, issues: [] };
  const checks: [boolean, string, number][] = [
    [Math.abs(current.tilt - baseline.tilt) > cfg.tiltDelta, 'head tilt', 18],
    [Math.abs(current.lean - baseline.lean) > cfg.leanDelta, 'leaning', 18],
    [
      current.neckLength !== undefined && baseline.neckLength !== undefined
        ? current.neckLength < baseline.neckLength * 0.78
        : current.shoulderY - baseline.shoulderY > cfg.shoulderDrop,
      'shoulder drop',
      24,
    ],
    [
      (current.worldSpace && baseline.worldSpace) || !baseline.version
        ? baseline.headOffset - current.headOffset > cfg.forwardHeadDelta
        : false,
      'forward head',
      24,
    ],
    [
      current.headPitch !== undefined &&
        baseline.headPitch !== undefined &&
        Math.abs(current.headPitch - baseline.headPitch) > 16,
      'head angle',
      18,
    ],
    [
      current.shoulderSlope !== undefined &&
        baseline.shoulderSlope !== undefined &&
        Math.abs(current.shoulderSlope - baseline.shoulderSlope) > 10,
      'uneven shoulders',
      15,
    ],
    // Proximity is a separate, face-only measurement in version 2.
    [
      !baseline.version && current.faceSize / baseline.faceSize > cfg.faceSizeRatio,
      'sitting close',
      24,
    ],
  ];
  const issues = checks.filter(([bad]) => bad);
  return {
    score: Math.max(0, 100 - issues.reduce((n, c) => n + c[2], 0)),
    issues: issues.map((c) => c[1]),
  };
}
export function calibratedThreshold(samples: number[]): number | null {
  if (samples.length < cfg.calibrationMinSamples) return null;
  const sorted = [...samples].filter((v) => v > 0.05 && v < 0.8).sort((a, b) => a - b);
  if (sorted.length < cfg.calibrationMinSamples) return null;
  return Math.max(
    0.08,
    Math.min(0.4, sorted[Math.floor(sorted.length * 0.75)] * cfg.earMultiplier),
  );
}
export function medianBaseline(samples: Baseline[]): Baseline | null {
  if (samples.length < 12) return null;
  const fields = [
    'faceSize',
    'headOffset',
    'shoulderY',
    'tilt',
    'lean',
    'neckLength',
    'shoulderSlope',
    'headPitch',
  ] as const;
  return {
    ...samples[0],
    ...Object.fromEntries(
      fields.flatMap((key) => {
        const numbers = samples
          .map((s) => s[key])
          .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
        return numbers.length ? [[key, median(numbers)]] : [];
      }),
    ),
  };
}
export function median(values: number[]): number {
  return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;
}
export function relativeMAD(values: number[]): number {
  const center = median(values);
  return center > 1e-6 ? median(values.map((v) => Math.abs(v - center))) / center : Infinity;
}
export function rotationAngles(
  data: number[],
): { pitch: number; yaw: number; roll: number } | null {
  if (data.length !== 16 || data.some((v) => !Number.isFinite(v))) return null;
  const sx = Math.hypot(data[0], data[1], data[2]),
    sy = Math.hypot(data[4], data[5], data[6]),
    sz = Math.hypot(data[8], data[9], data[10]);
  if (Math.min(sx, sy, sz) < 1e-6) return null;
  const deg = 180 / Math.PI;
  return {
    pitch: Math.atan2(data[6] / sy, data[10] / sz) * deg,
    yaw: Math.asin(Math.min(1, Math.max(-1, -data[2] / sx))) * deg,
    roll: Math.atan2(data[1] / sx, data[0] / sx) * deg,
  };
}
export function measureFace(
  face: Point[],
  matrix: number[],
  aspect = 4 / 3,
): FaceMeasurement | null {
  if (face.length < 388 || face.some((p) => !Number.isFinite(p.x) || !Number.isFinite(p.y)))
    return null;
  const angles = rotationAngles(matrix);
  if (!angles) return null;
  const d = (a: number, b: number) =>
    distance({ x: face[a].x * aspect, y: face[a].y }, { x: face[b].x * aspect, y: face[b].y });
  const eyeSpan = d(33, 263),
    faceHeight = d(10, 152),
    width = d(234, 454);
  if (
    eyeSpan < 0.035 ||
    faceHeight < 0.07 ||
    width < 0.055 ||
    [10, 152, 234, 454].some(
      (i) => face[i].x < 0.015 || face[i].x > 0.985 || face[i].y < 0.015 || face[i].y > 0.985,
    )
  )
    return null;
  return { faceSize: Math.sqrt(width * faceHeight), eyeSpan, faceHeight, ...angles };
}
export function distanceScale(
  current: FaceMeasurement | null,
  baseline: DistanceBaseline | null,
): number | null {
  if (
    !current ||
    !baseline ||
    baseline.version !== 2 ||
    Math.abs(current.yaw - baseline.yaw) > cfg.maxDistanceYawDelta ||
    Math.abs(current.pitch - baseline.pitch) > cfg.maxDistancePitchDelta
  )
    return null;
  const ratios = [
    current.faceSize / baseline.faceSize,
    current.eyeSpan / baseline.eyeSpan,
    current.faceHeight / baseline.faceHeight,
  ];
  if (
    ratios.some((r) => !Number.isFinite(r) || r <= 0) ||
    Math.max(...ratios) / Math.min(...ratios) > 1.3
  )
    return null;
  return median(ratios);
}
export function calibrateDistance(samples: FaceMeasurement[], at: number): DistanceBaseline | null {
  if (
    samples.length < cfg.baselineMinSamples ||
    samples.some(
      (s) =>
        Object.values(s).some((v) => !Number.isFinite(v)) ||
        s.faceSize <= 0 ||
        s.eyeSpan <= 0 ||
        s.faceHeight <= 0 ||
        Math.abs(s.yaw) > cfg.maxCalibratingYaw ||
        Math.abs(s.pitch) > cfg.maxCalibratingPitch,
    ) ||
    relativeMAD(samples.map((s) => s.faceSize)) > cfg.maxSizeMADRatio ||
    relativeMAD(samples.map((s) => s.eyeSpan)) > cfg.maxSizeMADRatio
  )
    return null;
  const fields = ['faceSize', 'eyeSpan', 'faceHeight', 'yaw', 'pitch', 'roll'] as const;
  return {
    ...Object.fromEntries(fields.map((key) => [key, median(samples.map((s) => s[key]))])),
    version: 2,
    calibratedAt: at,
  } as DistanceBaseline;
}
export function calibratePosture(
  samples: Baseline[],
  model: VisionMode,
  at: number,
): Baseline | null {
  if (
    samples.length < cfg.baselineMinSamples ||
    relativeMAD(samples.map((s) => s.faceSize)) > cfg.maxSizeMADRatio ||
    relativeMAD(samples.map((s) => s.neckLength ?? 0)) > 0.08 ||
    median(samples.map((s) => Math.abs(s.tilt - median(samples.map((b) => b.tilt))))) > 3
  )
    return null;
  const baseline = medianBaseline(samples);
  return baseline ? { ...baseline, version: 2, model, calibratedAt: at } : null;
}
