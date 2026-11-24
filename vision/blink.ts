import { visionConfig as cfg } from './config';
export class BlinkTracker {
  total = 0;
  private times: number[] = [];
  private closedAt: number | null = null;
  private frames = 0;
  private observedSince: number | null = null;
  private lastAt: number | null = null;
  private armed = false;
  update(ear: number | null, now: number, threshold: number) {
    const interrupted =
      this.lastAt !== null && (now <= this.lastAt || now - this.lastAt > cfg.maxTrackingGapMs);
    this.lastAt = now;
    if (interrupted || ear === null || !Number.isFinite(ear)) {
      this.closedAt = null;
      this.frames = 0;
      this.observedSince = null;
      this.times = [];
      this.armed = false;
    }
    if (ear === null || !Number.isFinite(ear)) {
      return { total: this.total, rate: null, longClosure: false, low: false };
    }
    this.observedSince ??= now;
    if (ear < threshold) {
      this.closedAt ??= now;
      this.frames++;
    } else if (ear >= threshold * 1.1 && this.closedAt !== null) {
      const duration = now - this.closedAt;
      if (
        this.armed &&
        this.frames >= cfg.minClosedFrames &&
        duration >= cfg.minBlinkMs &&
        duration <= cfg.maxBlinkMs
      ) {
        this.total++;
        this.times.push(now);
      }
      this.closedAt = null;
      this.frames = 0;
    }
    if (ear >= threshold * 1.1) this.armed = true;
    this.times = this.times.filter((t) => now - t <= 60000);
    const observed = now - this.observedSince;
    const rate = observed >= 60000 ? this.times.length : null;
    return {
      total: this.total,
      rate,
      longClosure: this.closedAt !== null && now - this.closedAt >= cfg.longClosureMs,
      low: rate !== null && rate < 8,
    };
  }
}
export class SustainedAlert {
  private since: number | null = null;
  private last = -Infinity;
  update(
    condition: boolean,
    present: boolean,
    now: number,
    holdMs: number,
    cooldownMs: number,
  ): boolean {
    if (!present || !condition) {
      this.since = null;
      return false;
    }
    this.since ??= now;
    if (now - this.since >= holdMs && now - this.last >= cooldownMs) {
      this.last = now;
      this.since = now;
      return true;
    }
    return false;
  }
}
