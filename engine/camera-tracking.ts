import { AwayRest, TrackingQuality } from '../shared/types';
import { visionConfig } from '../vision/config';

const minAwayMs = 5000;
const recoveryMs = 750;

interface ScheduledRest {
  stepIndex: number;
  start: number;
  end: number;
}

interface AwayInterval {
  seconds: number;
  rest: AwayRest | null;
}

export class CameraTracking {
  private lastFrameAt: number | null = null;
  private hasSeenUser = false;
  private paused = false;
  private clearSince: number | null = null;
  private awaySince: number | null = null;
  private awayRest: AwayRest | null = null;

  interrupt(): AwayInterval | null {
    const interval = this.finishAway();
    this.lastFrameAt = null;
    this.hasSeenUser = false;
    this.paused = true;
    this.clearSince = null;
    return interval;
  }

  observe(
    quality: TrackingQuality,
    present: boolean,
    now: number,
    recordAway: boolean,
    rest?: ScheduledRest,
  ): { quality: TrackingQuality; interval: AwayInterval | null } {
    let interval = null;
    if (
      this.lastFrameAt !== null &&
      (now < this.lastFrameAt || now - this.lastFrameAt > visionConfig.maxTrackingGapMs)
    ) {
      interval = this.interrupt();
    }
    if (quality === 'clear' && present) {
      interval ??= this.finishAway();
      if (this.paused) {
        this.clearSince ??= now;
        if (now - this.clearSince < recoveryMs) quality = 'settling';
        else this.paused = false;
      }
      if (quality === 'clear') this.hasSeenUser = true;
    } else {
      this.paused = true;
      this.clearSince = null;
      if (quality === 'no-face' && !present && recordAway && this.hasSeenUser) {
        this.awaySince ??= now;
        if (rest) {
          const overlap = Math.floor(
            (Math.min(now, rest.end) - Math.max(this.awaySince, rest.start)) / 1000,
          );
          if (overlap * 1000 >= minAwayMs) {
            this.awayRest = { stepIndex: rest.stepIndex, seconds: overlap };
          }
        }
      } else {
        interval ??= this.finishAway();
        this.hasSeenUser = false;
      }
    }
    this.lastFrameAt = now;
    return { quality, interval };
  }

  private finishAway(): AwayInterval | null {
    const elapsed = (this.lastFrameAt ?? 0) - (this.awaySince ?? Infinity);
    const interval =
      elapsed >= minAwayMs ? { seconds: Math.floor(elapsed / 1000), rest: this.awayRest } : null;
    this.awaySince = null;
    this.awayRest = null;
    return interval;
  }
}
