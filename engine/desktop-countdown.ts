import { hasStudy, studyRemaining } from '../shared/study';
import type { ReminderType, Snapshot } from '../shared/types';
import { isFocused, isQuiet, upcomingReminders } from './scheduler';

export type DesktopCountdown =
  { label: string } | { label: string; remaining: number; progress?: number; paused?: boolean };

const reminderNames: Record<ReminderType, string> = {
  break: 'Break',
  eyes: 'Eye break',
  stretch: 'Stretch break',
  water: 'Water reminder',
  posture: 'Posture reminder',
};

function progress(remaining: number, duration: number): number | undefined {
  return duration > 0 ? Math.min(1, Math.max(0, 1 - remaining / duration)) : undefined;
}

export function desktopCountdown(
  { study, engine, settings }: Pick<Snapshot, 'study' | 'engine' | 'settings'>,
  now: number,
): DesktopCountdown {
  if (hasStudy(study)) {
    if (study.status === 'preparing') return { label: 'Study setup' };
    const step = study.steps[study.index];
    if (!step) return { label: '' };
    const remaining = studyRemaining(study, now);
    const elapsed = progress(remaining, step.seconds * 1000);
    if (study.status === 'paused')
      return { label: 'Study paused', remaining, progress: elapsed, paused: true };

    const next = study.steps[study.index + 1]?.kind;
    const label =
      step.kind === 'rest'
        ? 'Eye break ends in'
        : step.kind === 'exercise'
          ? 'Stretch break ends in'
          : next === 'rest'
            ? 'Eye break in'
            : next === 'exercise'
              ? 'Stretch break in'
              : 'Study block ends in';
    return { label, remaining, progress: elapsed };
  }

  if (!settings.onboarded) return { label: '' };
  const pending = engine.pending;
  const sessionNotice =
    pending?.source === 'session'
      ? pending
      : study?.notices.reduce(
          (next, notice) => (notice.createdAt < next.createdAt ? notice : next),
          study.notices[0],
        );
  if (sessionNotice) {
    if (sessionNotice.reason === 'study-finished') return { label: 'Study session complete' };
    const label = reminderNames[sessionNotice.type];
    const remaining = sessionNotice.createdAt - now;
    if (!pending && remaining > 0) return { label: `${label} in`, remaining };
    return { label: `${label} ready` };
  }
  if (isFocused(engine, now)) {
    if (engine.focusUntil === null || engine.focusUntil === -1) return { label: 'Focus mode' };
    const remaining = engine.focusUntil - now;
    return {
      label: 'Focus ends in',
      remaining,
      progress: progress(remaining, engine.focusUntil - (engine.focusStarted ?? engine.focusUntil)),
    };
  }
  if (isQuiet(settings, now)) return { label: 'Quiet hours' };

  const [next] = upcomingReminders(engine, settings, now);
  if (!next) return { label: '' };
  if (pending?.type === next.type) return { label: `${reminderNames[next.type]} ready` };
  const remaining = next.at - now;
  return remaining <= 0
    ? { label: `${reminderNames[next.type]} due` }
    : { label: `${reminderNames[next.type]} in`, remaining };
}
