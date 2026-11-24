import { Settings, VisionMetrics } from '../shared/types';
import { Dwell } from '../vision/posture';
export type VisionAlertReason = 'distance' | 'posture' | 'low-blink' | 'eyes-closed';
export class VisionAlerts {
  private distance = new Dwell();
  private posture = new Dwell();
  private eyes = new Dwell();
  private closure = new Dwell();
  private last: Partial<Record<VisionAlertReason, number>> = {};
  resetEvidence() {
    this.distance.reset();
    this.posture.reset();
    this.eyes.reset();
    this.closure.reset();
  }
  observe(
    m: Pick<
      VisionMetrics,
      'present' | 'quality' | 'distanceState' | 'posture' | 'issues' | 'blinksPerMinute'
    >,
    settings: Settings,
    now: number,
    postureAllowed: boolean,
    eyesAllowed: boolean,
  ): VisionAlertReason | null {
    const reliable = m.present && m.quality === 'clear';
    const distance = this.distance.observe(
      reliable &&
        postureAllowed &&
        settings.distanceBaseline?.version === 2 &&
        m.distanceState === 'close',
      now,
    );
    const posture = this.posture.observe(
      reliable &&
        postureAllowed &&
        settings.baseline?.version === 2 &&
        m.posture !== null &&
        m.posture < 80,
      now,
    );
    const blink = this.eyes.observe(
      reliable &&
        eyesAllowed &&
        m.blinksPerMinute !== null &&
        m.blinksPerMinute < settings.lowBlinkRate,
      now,
    );
    const closure = this.closure.observe(
      reliable && eyesAllowed && m.issues.includes('eyes closed'),
      now,
    );
    const candidates: [VisionAlertReason, boolean, number][] = [
      [
        'distance',
        distance >= settings.distanceHoldSeconds * 1000,
        settings.distanceCooldownSeconds * 1000,
      ],
      ['posture', posture >= settings.postureHoldSeconds * 1000, settings.cooldownMinutes * 60000],
      ['eyes-closed', closure >= 2000, settings.cooldownMinutes * 60000],
      ['low-blink', blink >= 1000, settings.cooldownMinutes * 60000],
    ];
    return (
      candidates.find(
        ([reason, ready, cooldown]) => ready && now - (this.last[reason] ?? -Infinity) >= cooldown,
      )?.[0] ?? null
    );
  }
  delivered(reason: VisionAlertReason, now: number) {
    this.last[reason] = now;
  }
}
