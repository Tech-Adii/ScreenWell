import { Baseline, DistanceBaseline, DistanceState, FaceMeasurement } from '../shared/types';
import { distanceScale, median, scorePosture } from './math';
import { visionConfig as cfg } from './config';
// Blinks intentionally bypass this filter: smoothing their short closures loses events.
class ScalarFilter {
  private history: number[] = [];
  private value: number | null = null;
  private at = 0;
  update(value: number, now: number) {
    if (now - this.at > cfg.maxTrackingGapMs) this.reset();
    this.history.push(value);
    if (this.history.length > cfg.historyFrames) this.history.shift();
    const robust = median(this.history);
    const alpha = 1 - Math.exp(-Math.max(1, now - this.at) / cfg.smoothingMs);
    this.value = this.value === null ? robust : this.value + alpha * (robust - this.value);
    this.at = now;
    return this.value;
  }
  reset() {
    this.history = [];
    this.value = null;
    this.at = 0;
  }
}
export class PostureFilter {
  private filters = new Map<string, ScalarFilter>();
  private active = new Set<string>();
  private at = 0;
  private worldSpace: boolean | undefined;
  reset() {
    this.filters.clear();
    this.active.clear();
    this.at = 0;
    this.worldSpace = undefined;
  }
  update(raw: Baseline | null, base: Baseline | null, now: number) {
    if (!raw || !base) {
      this.reset();
      return { score: null, issues: [] as string[] };
    }
    if (now - this.at > cfg.maxTrackingGapMs) this.reset();
    // Never smooth world-space depth together with image-space fallback coordinates.
    if (this.worldSpace !== undefined && this.worldSpace !== !!raw.worldSpace) this.reset();
    this.worldSpace = !!raw.worldSpace;
    this.at = now;
    const current = { ...raw };
    for (const key of [
      'headOffset',
      'neckLength',
      'shoulderSlope',
      'tilt',
      'lean',
      'headPitch',
    ] as const) {
      if (raw[key] === undefined) continue;
      let filter = this.filters.get(key);
      if (!filter) {
        filter = new ScalarFilter();
        this.filters.set(key, filter);
      }
      current[key] = filter.update(raw[key]!, now);
    }
    const evaluated = scorePosture(current, base);
    const relaxed: Baseline = {
      ...current,
      tilt: base.tilt + (current.tilt - base.tilt) * 1.25,
      lean: base.lean + (current.lean - base.lean) * 1.25,
      headOffset: base.headOffset + (current.headOffset - base.headOffset) * 1.25,
      neckLength:
        current.neckLength === undefined
          ? undefined
          : (base.neckLength ?? current.neckLength) +
            (current.neckLength - (base.neckLength ?? current.neckLength)) * 1.25,
      shoulderSlope:
        current.shoulderSlope === undefined
          ? undefined
          : (base.shoulderSlope ?? 0) + (current.shoulderSlope - (base.shoulderSlope ?? 0)) * 1.25,
      headPitch:
        current.headPitch === undefined
          ? undefined
          : (base.headPitch ?? 0) + (current.headPitch - (base.headPitch ?? 0)) * 1.25,
    };
    const release = scorePosture(relaxed, base);
    for (const issue of evaluated.issues) this.active.add(issue);
    for (const issue of this.active) if (!release.issues.includes(issue)) this.active.delete(issue);
    const weights: Record<string, number> = {
      'head tilt': 18,
      leaning: 18,
      'shoulder drop': 24,
      'forward head': 24,
      'head angle': 18,
      'uneven shoulders': 15,
    };
    return {
      score: Math.max(0, 100 - [...this.active].reduce((n, i) => n + (weights[i] ?? 0), 0)),
      issues: [...this.active],
    };
  }
}
export class ProximityFilter {
  private filter = new ScalarFilter();
  private close = false;
  private last: number | null = null;
  reset() {
    this.filter.reset();
    this.close = false;
    this.last = null;
  }
  update(
    face: FaceMeasurement | null,
    base: DistanceBaseline | null,
    threshold: number,
    now: number,
  ): { ratio: number | null; state: DistanceState } {
    if (this.last !== null && (now - this.last > cfg.maxTrackingGapMs || now < this.last))
      this.reset();
    this.last = now;
    const raw = distanceScale(face, base);
    if (raw === null) {
      this.reset();
      return { ratio: null, state: 'unknown' };
    }
    const ratio = this.filter.update(raw, now);
    if (this.close) {
      if (ratio < threshold - cfg.distanceHysteresis) this.close = false;
    } else if (ratio >= threshold) this.close = true;
    return { ratio, state: this.close ? 'close' : 'comfortable' };
  }
}
export class Dwell {
  private since: number | null = null;
  private last: number | null = null;
  reset() {
    this.since = null;
    this.last = null;
  }
  observe(condition: boolean, now: number): number {
    if (!condition) {
      this.reset();
      return 0;
    }
    if (this.last !== null && (now - this.last > cfg.maxTrackingGapMs || now < this.last))
      this.reset();
    this.since ??= now;
    this.last = now;
    return now - this.since;
  }
}
