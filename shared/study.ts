import {
  StudyConfig,
  StudyPlanConfig,
  StudyPreset,
  StudySession,
  StudyStep,
  Settings,
  VisionSelection,
  Reminder,
} from './types';
export const defaultStudyConfig: StudyConfig = {
  studyMinutes: 120,
  blockMinutes: 20,
  restSeconds: 30,
  water: true,
  exerciseEveryMinutes: 60,
  exerciseSeconds: 120,
  blinks: false,
  posture: false,
  distance: false,
  postureHoldSeconds: 25,
  cameraConsent: false,
};
export function studyPlanConfig(config: StudyConfig): StudyPlanConfig {
  const plan: StudyPlanConfig & { cameraConsent?: boolean } = { ...config };
  delete plan.cameraConsent;
  return plan;
}
const balanced = studyPlanConfig(defaultStudyConfig);
export const studyPresetLimit = 8;
export const builtInStudyPresets: (StudyPreset & { description: string })[] = [
  {
    id: 'quick-review',
    name: 'Quick Review',
    description: 'A short revision session',
    config: {
      ...balanced,
      studyMinutes: 30,
      blockMinutes: 15,
      restSeconds: 20,
      exerciseEveryMinutes: 0,
    },
  },
  {
    id: 'balanced-study',
    name: 'Balanced Study',
    description: 'Study, rest and move',
    config: balanced,
  },
  {
    id: 'practice-exam',
    name: 'Practice Exam',
    description: 'Longer blocks with brief eye rests',
    config: {
      ...balanced,
      studyMinutes: 90,
      blockMinutes: 30,
      water: false,
      exerciseEveryMinutes: 0,
    },
  },
];
export const hasStudy = (
  session: StudySession | null | undefined,
): session is StudySession & { status: 'preparing' | 'running' | 'paused' } =>
  !!session && ['preparing', 'running', 'paused'].includes(session.status);
export function studyPlan(config: StudyConfig): StudyStep[] {
  const steps: StudyStep[] = [];
  let studied = 0;
  while (studied < config.studyMinutes) {
    const regular = (Math.floor(studied / config.blockMinutes) + 1) * config.blockMinutes;
    const exercise = config.exerciseEveryMinutes
      ? (Math.floor(studied / config.exerciseEveryMinutes) + 1) * config.exerciseEveryMinutes
      : Infinity;
    const next = Math.min(config.studyMinutes, regular, exercise);
    steps.push({
      id: steps.length,
      kind: 'study',
      seconds: (next - studied) * 60,
      studyMinutes: next,
    });
    studied = next;
    if (next === regular || next === config.studyMinutes)
      steps.push({
        id: steps.length,
        kind: 'rest',
        seconds: config.restSeconds,
        studyMinutes: next,
      });
    if (next === exercise)
      steps.push({
        id: steps.length,
        kind: 'exercise',
        seconds: config.exerciseSeconds,
        studyMinutes: next,
      });
  }
  return steps;
}
export function studyVisionSelection(session: StudySession | null | undefined): VisionSelection {
  return hasStudy(session)
    ? {
        blinks: session.config.blinks,
        posture: session.config.posture,
        distance: !!session.config.distance,
      }
    : { blinks: true, posture: true, distance: true };
}
export function studyCameraAllowed(
  settings: Settings,
  session: StudySession | null | undefined,
): boolean {
  return hasStudy(session)
    ? session.cameraAuthorized && session.status !== 'paused' && studyHasCamera(session.config)
    : settings.cameraConsent;
}
export function studySettings(
  settings: Settings,
  session: StudySession | null | undefined,
): Settings {
  return hasStudy(session)
    ? {
        ...settings,
        cameraConsent: studyCameraAllowed(settings, session),
        baseline: session.config.posture ? session.calibration.baseline : null,
        blinkThreshold: session.config.blinks ? session.calibration.blinkThreshold : null,
        distanceBaseline: session.config.distance
          ? (session.calibration.distanceBaseline ?? null)
          : null,
        distanceHoldSeconds: 10,
        postureHoldSeconds: session.config.postureHoldSeconds,
      }
    : settings;
}
export function studyRemaining(session: StudySession, now: number): number {
  return Math.max(
    0,
    session.status === 'running' ? (session.deadline ?? now) - now : session.remainingMs,
  );
}
export function studyReady(session: StudySession): boolean {
  return (
    (!session.config.blinks || session.calibration.blinkThreshold !== null) &&
    (!session.config.distance || !!session.calibration.distanceBaseline) &&
    (!session.config.posture || session.calibration.baseline !== null)
  );
}
export const studyHasCamera = (config: StudyConfig) =>
  config.blinks || config.posture || !!config.distance;
export function studyNotice(
  session: StudySession,
  kind: 'rest' | 'water' | 'exercise' | 'finished',
  now: number,
): Reminder {
  return {
    id: `${session.id}-${session.index}-${kind}-${now}`,
    type:
      kind === 'rest'
        ? 'eyes'
        : kind === 'exercise'
          ? 'stretch'
          : kind === 'water'
            ? 'water'
            : 'break',
    reason:
      kind === 'rest'
        ? 'study-rest'
        : kind === 'exercise'
          ? 'study-exercise'
          : kind === 'water'
            ? 'study-water'
            : 'study-finished',
    source: 'session',
    studyId: session.id,
    createdAt: now,
    soft: kind === 'water',
  };
}
