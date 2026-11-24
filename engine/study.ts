import { z } from 'zod';
import { StudySession, StudyConfig, StudyAction } from '../shared/types';
import {
  hasStudy,
  studyPlan,
  studyReady,
  studyRemaining,
  studyNotice,
  studyHasCamera,
} from '../shared/study';
export const studyPlanConfigSchema = z
  .object({
    studyMinutes: z.number().int().min(20).max(480),
    blockMinutes: z.number().int().min(10).max(30),
    restSeconds: z.number().int().min(20).max(120),
    water: z.boolean(),
    exerciseEveryMinutes: z.union([z.literal(0), z.literal(30), z.literal(60), z.literal(90)]),
    exerciseSeconds: z.number().int().min(60).max(300),
    blinks: z.boolean(),
    posture: z.boolean(),
    distance: z.boolean().default(false),
    postureHoldSeconds: z.union([z.literal(20), z.literal(25), z.literal(30)]),
  })
  .strict();
export const studyConfigSchema = studyPlanConfigSchema
  .extend({ cameraConsent: z.boolean() })
  .refine((config) => !studyHasCamera(config) || config.cameraConsent, {
    message: 'Allow camera access for the checks selected for this session.',
  });
export const studyActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('begin') }).strict(),
  z.object({ type: z.literal('pause') }).strict(),
  z.object({ type: z.literal('end') }).strict(),
  z.object({ type: z.literal('without-camera') }).strict(),
  z.object({ type: z.literal('camera-off') }).strict(),
  z.object({ type: z.literal('skip') }).strict(),
  z.object({ type: z.literal('resume'), cameraConsent: z.boolean() }).strict(),
  z.object({ type: z.literal('camera-on'), cameraConsent: z.boolean() }).strict(),
  z
    .object({
      type: z.literal('away-rest'),
      sessionId: z.string().min(1).max(100),
      stepIndex: z.number().int().min(0),
      accept: z.boolean(),
    })
    .strict(),
]);
export function createStudy(input: StudyConfig, id: string, now: number): StudySession {
  const config = studyConfigSchema.parse(input),
    steps = studyPlan(config),
    preparing = studyHasCamera(config);
  return {
    version: 1,
    id,
    config,
    steps,
    index: 0,
    status: preparing ? 'preparing' : 'running',
    deadline: preparing ? null : now + steps[0].seconds * 1000,
    remainingMs: steps[0].seconds * 1000,
    startedAt: now,
    lastTickAt: now,
    completedStudySeconds: 0,
    cameraAuthorized: preparing,
    cameraEpoch: 1,
    calibration: { baseline: null, blinkThreshold: null, distanceBaseline: null },
    blinks: 0,
    lastVisionBlinks: 0,
    postureTotal: 0,
    postureSamples: 0,
    notices: [],
    pauseReason: '',
  };
}
export function recoverStudy(input: StudySession | null, now: number): StudySession | null {
  if (!input || input.version !== 1) return null;
  if (!hasStudy(input)) return { ...input, cameraAuthorized: false };
  const session = structuredClone(input);
  session.remainingMs = studyRemaining(session, session.lastTickAt);
  session.status = 'paused';
  session.deadline = null;
  session.cameraAuthorized = false;
  session.notices = [];
  session.lastTickAt = now;
  session.pauseReason = 'Your saved session is paused. Resume when you’re ready.';
  return session;
}
function advance(session: StudySession, now: number) {
  const previous = session.steps[session.index];
  if (previous.kind === 'study') session.completedStudySeconds += previous.seconds;
  if (previous.kind === 'rest' && session.config.water)
    session.notices.push(studyNotice(session, 'water', now));
  session.index++;
  if (session.index >= session.steps.length) {
    session.status = 'completed';
    session.deadline = null;
    session.remainingMs = 0;
    session.cameraAuthorized = false;
    session.notices.unshift(studyNotice(session, 'finished', now));
    return;
  }
  const next = session.steps[session.index];
  session.deadline = now + next.seconds * 1000;
  session.remainingMs = next.seconds * 1000;
  if (next.kind !== 'study') session.notices.push(studyNotice(session, next.kind, now));
}
export function tickStudy(
  input: StudySession,
  now: number,
): { session: StudySession; changed: boolean; phaseChanged: boolean } {
  const session = structuredClone(input);
  if (session.status !== 'running') return { session, changed: false, phaseChanged: false };
  if (now - session.lastTickAt > 90000 || now < session.lastTickAt) {
    session.remainingMs = studyRemaining(session, session.lastTickAt);
    session.status = 'paused';
    session.deadline = null;
    session.cameraAuthorized = false;
    session.pauseReason = 'Paused after sleep or a clock change. Resume when you’re ready.';
    session.lastTickAt = now;
    return { session, changed: true, phaseChanged: true };
  }
  session.lastTickAt = now;
  if (now < (session.deadline ?? Infinity)) return { session, changed: false, phaseChanged: false };
  advance(session, now);
  return { session, changed: true, phaseChanged: true };
}
export function actStudy(input: StudySession, action: StudyAction, now: number): StudySession {
  if (action.type === 'away-rest') {
    if (
      input.id !== action.sessionId ||
      input.awayRest?.stepIndex !== action.stepIndex ||
      input.steps[action.stepIndex]?.kind !== 'rest'
    )
      throw new Error('This break is no longer available to review.');
    const reviewed = { ...input, awayRest: null, reviewedAwayRestIndex: action.stepIndex };
    return action.accept && input.status === 'running' && input.index === action.stepIndex
      ? actStudy(reviewed, { type: 'skip' }, now)
      : reviewed;
  }
  if (!hasStudy(input)) throw new Error('Start a study session first.');
  const session = structuredClone<StudySession>(input);
  session.lastTickAt = now;
  switch (action.type) {
    case 'begin':
      if (session.status !== 'preparing') throw new Error('This session has already started.');
      if (!studyReady(session))
        throw new Error('Finish the selected calibrations or continue without camera checks.');
      session.status = 'running';
      session.deadline = now + session.remainingMs;
      break;
    case 'pause':
      session.remainingMs = studyRemaining(session, now);
      session.status = 'paused';
      session.deadline = null;
      session.cameraAuthorized = false;
      session.pauseReason = 'Paused by you.';
      session.notices = [];
      break;
    case 'resume':
      if (session.status !== 'paused') throw new Error('This session is not paused.');
      if (studyHasCamera(session.config) && !action.cameraConsent)
        throw new Error('Allow the selected camera checks before resuming.');
      session.cameraAuthorized = studyHasCamera(session.config);
      session.cameraEpoch++;
      session.status = studyReady(session) ? 'running' : 'preparing';
      session.deadline = session.status === 'running' ? now + session.remainingMs : null;
      session.pauseReason = '';
      break;
    case 'end':
      session.remainingMs = studyRemaining(session, now);
      if (session.steps[session.index].kind === 'study')
        session.completedStudySeconds += Math.floor(
          (session.steps[session.index].seconds * 1000 - session.remainingMs) / 1000,
        );
      session.status = 'ended';
      session.deadline = null;
      session.cameraAuthorized = false;
      session.notices = [];
      break;
    case 'without-camera':
      session.config = {
        ...session.config,
        blinks: false,
        posture: false,
        distance: false,
        cameraConsent: false,
      };
      session.cameraAuthorized = false;
      session.calibration = { baseline: null, blinkThreshold: null, distanceBaseline: null };
      if (session.status === 'preparing' || session.status === 'paused') {
        session.status = 'running';
        session.deadline = now + session.remainingMs;
      }
      break;
    case 'camera-off':
      session.cameraAuthorized = false;
      break;
    case 'camera-on':
      if (!action.cameraConsent || !studyHasCamera(session.config))
        throw new Error('Select and allow camera checks for this session.');
      session.cameraAuthorized = true;
      session.cameraEpoch++;
      break;
    case 'skip':
      if (session.status !== 'running' || session.steps[session.index].kind === 'study')
        throw new Error('Only a rest or exercise step can be skipped.');
      advance(session, now);
      break;
  }
  return session;
}
