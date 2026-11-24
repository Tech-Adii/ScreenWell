import { describe, expect, it } from 'vitest';
import { CameraTracking } from '../../engine/camera-tracking';
import { VisionAlerts } from '../../engine/vision-alerts';
import { defaults } from '../../shared/defaults';

describe('camera interruption and step-away evidence', () => {
  it('requires a previously clear view and does not join absence across dim frames or gaps', () => {
    const tracking = new CameraTracking();
    for (let now = 0; now <= 5000; now += 500) tracking.observe('no-face', false, now, true);
    expect(tracking.observe('lighting', false, 5500, true).interval).toBeNull();
    tracking.observe('clear', true, 6000, true);
    tracking.observe('clear', true, 7000, true);
    for (let now = 7500; now <= 11000; now += 500) tracking.observe('no-face', false, now, true);
    expect(tracking.observe('no-face', false, 20000, true).interval).toBeNull();
    for (let now = 20500; now <= 26000; now += 500) tracking.observe('no-face', false, now, true);
    expect(tracking.interrupt()).toBeNull();
  });

  it('records an interval once and credits only observed time inside the scheduled rest', () => {
    const tracking = new CameraTracking();
    tracking.observe('clear', true, 0, true);
    for (let now = 500; now <= 10000; now += 500)
      tracking.observe('no-face', false, now, true, {
        stepIndex: 1,
        start: 3000,
        end: 8500,
      });
    expect(tracking.observe('clear', true, 10500, true)).toEqual({
      quality: 'settling',
      interval: { seconds: 9, rest: { stepIndex: 1, seconds: 5 } },
    });
    expect(tracking.interrupt()).toBeNull();
  });

  it('starts a fresh alert dwell after tracking settles', () => {
    const tracking = new CameraTracking();
    const alerts = new VisionAlerts();
    const observe = (now: number, quality: 'clear' | 'lighting') =>
      alerts.observe(
        {
          quality: tracking.observe(quality, true, now, false).quality,
          present: true,
          distanceState: 'unknown',
          posture: null,
          issues: ['eyes closed'],
          blinksPerMinute: null,
        },
        defaults,
        now,
        false,
        true,
      );
    for (const now of [0, 500, 1000, 1500]) expect(observe(now, 'clear')).toBeNull();
    expect(observe(1750, 'lighting')).toBeNull();
    for (const now of [2000, 2500, 3000, 3500, 4000, 4500])
      expect(observe(now, 'clear')).toBeNull();
    expect(observe(5000, 'clear')).toBe('eyes-closed');
  });
});
