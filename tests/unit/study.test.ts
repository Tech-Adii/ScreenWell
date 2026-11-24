import { describe, it, expect } from 'vitest';
import {
  createStudy,
  actStudy,
  tickStudy,
  recoverStudy,
  studyConfigSchema,
  studyActionSchema,
} from '../../engine/study';
import {
  defaultStudyConfig,
  studyPlan,
  studyReady,
  studySettings,
  studyCameraAllowed,
  studyVisionSelection,
  studyRemaining,
} from '../../shared/study';
import { defaults } from '../../shared/defaults';
import { StudyConfig, Baseline } from '../../shared/types';
import { VisionAlerts } from '../../engine/vision-alerts';
const now = 1000000,
  make = (extra: Partial<StudyConfig> = {}) =>
    createStudy({ ...defaultStudyConfig, ...extra }, 'session', now);
const baseline: Baseline = {
  version: 2,
  calibratedAt: now,
  faceSize: 0.3,
  headOffset: 0,
  shoulderY: 0.5,
  tilt: 0,
  lean: 0,
};
describe('guided study plan', () => {
  it('reviews an elapsed rest without changing the next step and rejects a repeat', () => {
    const session = make();
    session.index = 2;
    session.awayRest = { stepIndex: 1, seconds: 18 };
    const choice = {
      type: 'away-rest',
      sessionId: session.id,
      stepIndex: 1,
      accept: true,
    } as const;
    const next = actStudy(session, choice, now + 1000);
    expect(next).toMatchObject({ index: 2, deadline: session.deadline, awayRest: null });
    expect(() => actStudy(next, choice, now + 1100)).toThrow();
    const dismissed = actStudy({ ...session, index: 1 }, { ...choice, accept: false }, now);
    expect(dismissed).toMatchObject({ index: 1, deadline: session.deadline, awayRest: null });
  });
  it.each([60, 120, 180, 30, 480])(
    'keeps %i study minutes separate from added rests and exercises',
    (studyMinutes) => {
      const plan = studyPlan({ ...defaultStudyConfig, studyMinutes });
      expect(plan.filter((s) => s.kind === 'study').reduce((n, s) => n + s.seconds, 0)).toBe(
        studyMinutes * 60,
      );
      expect(plan.every((s) => s.seconds > 0)).toBe(true);
      expect(plan.filter((s) => s.kind === 'rest')).toHaveLength(Math.ceil(studyMinutes / 20));
      expect(plan.filter((s) => s.kind === 'exercise')).toHaveLength(Math.floor(studyMinutes / 60));
    },
  );
  it('splits study around the 30-minute exercise preference without losing minutes', () => {
    const plan = studyPlan({ ...defaultStudyConfig, studyMinutes: 60, exerciseEveryMinutes: 30 });
    expect(plan.map((s) => `${s.kind}:${s.seconds}`)).toEqual([
      'study:1200',
      'rest:30',
      'study:600',
      'exercise:120',
      'study:600',
      'rest:30',
      'study:1200',
      'rest:30',
      'exercise:120',
    ]);
    expect(plan.filter((s) => s.kind === 'exercise').map((s) => s.studyMinutes)).toEqual([30, 60]);
    expect(
      studyPlan({ ...defaultStudyConfig, exerciseEveryMinutes: 0 }).some(
        (s) => s.kind === 'exercise',
      ),
    ).toBe(false);
  });
  it('requires valid durations, per-session permission and explicit resume permission', () => {
    expect(() => make({ studyMinutes: 0 })).toThrow();
    expect(() => make({ blinks: true })).toThrow();
    expect(
      studyConfigSchema.safeParse({ ...defaultStudyConfig, exerciseEveryMinutes: 5 }).success,
    ).toBe(false);
    expect(studyActionSchema.safeParse({ type: 'resume' }).success).toBe(false);
    expect(studyActionSchema.parse({ type: 'pause' })).toEqual({ type: 'pause' });
  });
  it.each([
    [false, false],
    [true, false],
    [false, true],
    [true, true],
  ])('isolates blink=%s and posture=%s from global camera preferences', (blinks, posture) => {
    const session = make({ blinks, posture, cameraConsent: true });
    expect(session.status).toBe(blinks || posture ? 'preparing' : 'running');
    expect(studyVisionSelection(session)).toEqual({ blinks, posture, distance: false });
    const effective = studySettings(
      { ...defaults, cameraConsent: true, baseline, blinkThreshold: 0.2 },
      session,
    );
    expect(effective.baseline).toBeNull();
    expect(effective.blinkThreshold).toBeNull();
    expect(effective.distanceBaseline).toBeNull();
    expect(effective.cameraConsent).toBe(blinks || posture);
    expect(studyCameraAllowed({ ...defaults, cameraConsent: false }, session)).toBe(
      blinks || posture,
    );
    expect(studyReady(session)).toBe(!blinks && !posture);
    session.calibration = {
      baseline: posture ? baseline : null,
      blinkThreshold: blinks ? 0.2 : null,
    };
    expect(studyReady(session)).toBe(true);
    expect(defaults.baseline).toBeNull();
  });
  it('waits for selected calibrations before starting study time', () => {
    const session = make({ blinks: true, posture: true, cameraConsent: true });
    expect(tickStudy(session, now + 200000).session.status).toBe('preparing');
    expect(() => actStudy(session, { type: 'begin' }, now + 10000)).toThrow();
    session.calibration.blinkThreshold = 0.2;
    expect(studyReady(session)).toBe(false);
    session.calibration.baseline = baseline;
    const started = actStudy(session, { type: 'begin' }, now + 40000);
    expect(started.deadline).toBe(now + 40000 + 1200000);
    expect(started.blinks).toBe(0);
  });
  it('pauses time, disarms the camera and requires permission again on resume', () => {
    let session = make({ blinks: true, cameraConsent: true });
    session.calibration.blinkThreshold = 0.2;
    session = actStudy(session, { type: 'begin' }, now);
    session = actStudy(session, { type: 'pause' }, now + 15000);
    expect(session.cameraAuthorized).toBe(false);
    expect(studyRemaining(session, now + 600000)).toBe(1185000);
    expect(() =>
      actStudy(session, { type: 'resume', cameraConsent: false }, now + 600000),
    ).toThrow();
    const resumed = actStudy(session, { type: 'resume', cameraConsent: true }, now + 600000);
    expect(resumed.cameraEpoch).toBe(session.cameraEpoch + 1);
    expect(resumed.deadline).toBe(now + 600000 + 1185000);
    const noCamera = actStudy(session, { type: 'without-camera' }, now + 600000);
    expect(noCamera.status).toBe('running');
    expect(studyVisionSelection(noCamera)).toEqual({
      blinks: false,
      posture: false,
      distance: false,
    });
    expect(noCamera.cameraAuthorized).toBe(false);
  });
  it('recovers a saved session paused without counting closed time or reactivating the camera', () => {
    let session = make();
    session = tickStudy(session, now + 20000).session;
    const recovered = recoverStudy(session, now + 7200000)!;
    expect(recovered.status).toBe('paused');
    expect(recovered.remainingMs).toBe(1180000);
    expect(recovered.cameraAuthorized).toBe(false);
    expect(recovered.notices).toEqual([]);
  });
  it('pauses after sleep or backwards clock movement without a reminder backlog', () => {
    for (const time of [now + 90001, now - 1]) {
      const result = tickStudy(make(), time);
      expect(result.session.status).toBe('paused');
      expect(result.session.notices).toEqual([]);
      expect(result.session.completedStudySeconds).toBe(0);
    }
  });
  it('grants a full rest after a delayed tick and queues water only after the rest', () => {
    const session = make();
    session.deadline = now + 1000;
    const rest = tickStudy(session, now + 5000).session;
    expect(rest.steps[rest.index].kind).toBe('rest');
    expect(rest.deadline).toBe(now + 35000);
    expect(rest.notices.map((r) => r.reason)).toEqual(['study-rest']);
    const studying = tickStudy(rest, now + 35000).session;
    expect(studying.steps[studying.index].kind).toBe('study');
    expect(studying.notices.at(-1)?.reason).toBe('study-water');
    const dry = make({ water: false });
    dry.index = 1;
    dry.deadline = now + 1000;
    expect(tickStudy(dry, now + 1000).session.notices).toEqual([]);
  });
  it('allows skipping rests but prevents skipping study and counts only actual partial study on end', () => {
    const session = make();
    expect(() => actStudy(session, { type: 'skip' }, now + 1000)).toThrow();
    expect(actStudy(session, { type: 'end' }, now + 17000).completedStudySeconds).toBe(17);
    session.index = 1;
    session.deadline = now + 30000;
    const next = actStudy(session, { type: 'skip' }, now + 1000);
    expect(next.index).toBe(2);
    expect(next.completedStudySeconds).toBe(0);
  });
  it('finishes only after the final rest, disarms camera and prioritizes completion over water', () => {
    const session = make({ studyMinutes: 20, exerciseEveryMinutes: 0 });
    session.index = 1;
    session.completedStudySeconds = 1200;
    session.deadline = now + 1000;
    const completed = tickStudy(session, now + 1000).session;
    expect(completed.status).toBe('completed');
    expect(completed.cameraAuthorized).toBe(false);
    expect(completed.notices.map((r) => r.reason)).toEqual(['study-finished', 'study-water']);
    expect(() => actStudy(completed, { type: 'resume', cameraConsent: true }, now)).toThrow();
  });
  it.each([20, 25, 30])(
    'waits %i continuous seconds of reliable poor posture, resetting after recovery',
    (hold) => {
      const alerts = new VisionAlerts(),
        session = make({
          posture: true,
          cameraConsent: true,
          postureHoldSeconds: hold as 20 | 25 | 30,
        });
      session.calibration.baseline = baseline;
      const settings = studySettings(defaults, session),
        m = {
          present: true,
          quality: 'clear' as const,
          distanceState: 'close' as const,
          posture: 40,
          issues: ['head tilt'],
          blinksPerMinute: null,
        };
      for (let sec = 0; sec < hold; sec++)
        expect(alerts.observe(m, settings, now + sec * 1000, true, false)).toBeNull();
      expect(
        alerts.observe({ ...m, posture: 80, issues: [] }, settings, now + hold * 1000, true, false),
      ).toBeNull();
      for (let sec = 0; sec < hold; sec++)
        expect(alerts.observe(m, settings, now + (hold + 1 + sec) * 1000, true, false)).toBeNull();
      expect(alerts.observe(m, settings, now + (2 * hold + 1) * 1000, true, false)).toBe('posture');
    },
  );
});
