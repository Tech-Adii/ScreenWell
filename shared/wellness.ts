import { Snapshot, ReminderType } from './types';
import { dayKey } from './defaults';
import { isFocused, isQuiet, upcomingReminders } from '../engine/scheduler';
import { hasStudy, studyRemaining } from './study';
export function formatCountdown(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}
export function nextCare(data: Snapshot, now: number): { type: ReminderType; at: number }[] {
  if (hasStudy(data.study)) {
    const session = data.study;
    if (session.status !== 'running') return [];
    let at = now + studyRemaining(session, now);
    const result: { type: ReminderType; at: number }[] = [];
    for (let index = session.index + 1; index < session.steps.length; index++) {
      const step = session.steps[index];
      if (step.kind !== 'study') {
        const type = step.kind === 'rest' ? 'eyes' : 'stretch';
        if (data.engine.disabledToday[type] !== dayKey(now)) result.push({ type, at });
      }
      at += step.seconds * 1000;
    }
    return result.slice(0, 4);
  }
  return upcomingReminders(data.engine, data.settings, now);
}
export function careStatus(data: Snapshot, now: number): string {
  if (hasStudy(data.study))
    return data.study.status === 'running'
      ? 'Your study plan · upcoming resets'
      : data.study.status === 'preparing'
        ? 'Calibrate before your study time begins'
        : 'Study session paused';
  if (isFocused(data.engine, now)) return 'Focus mode · reminders paused';
  if (isQuiet(data.settings, now)) return 'Quiet hours · time to unwind';
  return nextCare(data, now).length ? 'Your next moment of care' : 'Your reminders are resting';
}
export function focusMinutes(data: Snapshot, now: number): number {
  return data.events
    .filter((event) => event.day === dayKey(now) && event.type === 'focus-complete')
    .reduce((sum, event) => sum + event.value, 0);
}
export function breathingFrame(elapsedSeconds: number, totalSeconds: number) {
  const elapsed = Math.max(0, Math.min(totalSeconds, elapsedSeconds));
  return {
    done: elapsed >= totalSeconds,
    phase: elapsed % 10 < 4 ? 'Breathe in' : 'Breathe out',
    phaseSeconds: Math.ceil(elapsed % 10 < 4 ? 4 - (elapsed % 10) : 10 - (elapsed % 10)),
    remaining: Math.max(0, Math.ceil(totalSeconds - elapsed)),
    cycles: Math.min(Math.floor(totalSeconds / 10), Math.floor(elapsed / 10)),
  };
}
