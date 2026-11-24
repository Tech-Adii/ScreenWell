import { EngineState, ReminderType, Settings } from '../shared/types';
import { reminderTypes } from '../shared/types';
import { dayKey } from '../shared/defaults';
import type { ReminderAction } from '../shared/types';
export function intervalMs(type: ReminderType, settings: Settings): number {
  return (
    (type === 'water'
      ? settings.waterInterval
      : type === 'eyes' && settings.preset === '202020'
        ? 20
        : type === 'stretch'
          ? settings.interval * 2
          : settings.interval) * 60000
  );
}
export function inWindow(start: string, end: string, now: number): boolean {
  const d = new Date(now);
  const minute = d.getHours() * 60 + d.getMinutes();
  const parse = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };
  const a = parse(start),
    b = parse(end);
  return a === b || (a < b ? minute >= a && minute < b : minute >= a || minute < b);
}
export function isQuiet(settings: Settings, now: number) {
  return settings.quietEnabled && inWindow(settings.quietStart, settings.quietEnd, now);
}
export function isFocused(state: EngineState, now: number) {
  return state.focusUntil === -1 || (state.focusUntil !== null && now < state.focusUntil);
}
export function mayRemind(
  state: EngineState,
  settings: Settings,
  type: ReminderType,
  now: number,
): boolean {
  return (
    settings.onboarded &&
    settings.enabled[type] &&
    state.disabledToday[type] !== dayKey(now) &&
    !isQuiet(settings, now) &&
    !isFocused(state, now) &&
    (type !== 'water' || inWindow(settings.activeStart, settings.activeEnd, now))
  );
}
export interface SchedulerEvent {
  type: string;
  value: number;
  detail: string;
}
export function upcomingReminders(state: EngineState, settings: Settings, now: number) {
  const pending = state.pending?.type;
  return reminderTypes
    .filter((type) => mayRemind(state, settings, type, now))
    .map((type) => ({ type, at: type === pending ? now : state.nextDue[type] }))
    .filter(({ type, at }) => mayRemind(state, settings, type, Math.max(now, at)))
    .sort((a, b) => Number(b.type === pending) - Number(a.type === pending) || a.at - b.at);
}
export function tick(
  input: EngineState,
  settings: Settings,
  now: number,
  lastActivity = 0,
): { state: EngineState; events: SchedulerEvent[]; changed: boolean } {
  const state: EngineState = structuredClone(input);
  const events: SchedulerEvent[] = [];
  let changed = false;
  // Resume gently after sleep or a clock jump; do not deliver a backlog.
  if (now - state.lastTick > 90000 || now < state.lastTick) {
    for (const t of reminderTypes) state.nextDue[t] = now + intervalMs(t, settings);
    state.pending = null;
    changed = true;
  }
  state.lastTick = now;
  if (state.focusUntil !== null && state.focusUntil !== -1 && state.focusUntil <= now) {
    events.push({
      type: 'focus-complete',
      value: Math.max(0, (state.focusUntil - (state.focusStarted ?? state.focusUntil)) / 60000),
      detail: 'Timed focus',
    });
    state.focusUntil = null;
    state.focusStarted = null;
    state.pending = null;
    for (const t of reminderTypes) state.nextDue[t] = now + intervalMs(t, settings);
    changed = true;
  }
  if (
    state.pending &&
    (!mayRemind(state, settings, state.pending.type, now) ||
      now - state.pending.createdAt > 15 * 60000)
  ) {
    state.pending = null;
    changed = true;
  }
  if (state.pending) return { state, events, changed };
  for (const type of reminderTypes) {
    if (state.nextDue[type] > now) continue;
    if (!mayRemind(state, settings, type, now)) {
      state.nextDue[type] = now + intervalMs(type, settings);
      changed = true;
      continue;
    }
    // Activity signals are timestamps only; no keys or text leave the renderer.
    if (settings.autoDelay && now - lastActivity < 12000 && now - state.nextDue[type] < 5 * 60000)
      continue;
    state.pending = {
      id: `${type}-${now}`,
      type,
      createdAt: now,
      source: 'timer',
      soft: type === 'water',
    };
    state.nextDue[type] = now + intervalMs(type, settings);
    events.push({ type: 'reminder-shown', value: 1, detail: type });
    changed = true;
    break;
  }
  return { state, events, changed };
}
export function act(
  input: EngineState,
  settings: Settings,
  action: ReminderAction,
  now: number,
): { state: EngineState; events: SchedulerEvent[] } {
  const state: EngineState = structuredClone(input);
  const reminder = state.pending;
  if (!reminder) return { state, events: [] };
  const type = reminder.type;
  state.pending = null;
  const events: SchedulerEvent[] = [];
  if (action.startsWith('snooze')) {
    const minutes = Number(action.slice(6));
    state.nextDue[type] = now + minutes * 60000;
    if (reminder.source === 'vision')
      state.visionSnoozeUntil = { ...state.visionSnoozeUntil, [type]: now + minutes * 60000 };
    events.push({ type: 'reminder-snoozed', value: minutes, detail: type });
  } else if (action === 'off') {
    state.disabledToday[type] = dayKey(now);
    events.push({ type: 'reminder-off', value: 1, detail: type });
  } else if (action === 'skip') {
    state.skipStreak[type] = (state.skipStreak[type] ?? 0) + 1;
    events.push({ type: 'reminder-skipped', value: 1, detail: type });
    if (state.skipStreak[type]! >= 3) state.suggestion = type;
  } else {
    state.skipStreak[type] = 0;
    events.push({ type: 'reminder-accepted', value: 1, detail: type });
    if (type === 'water') events.push({ type: 'water', value: 1, detail: 'From reminder' });
  }
  if (!action.startsWith('snooze')) state.nextDue[type] = now + intervalMs(type, settings);
  return { state, events };
}
export function setFocus(
  input: EngineState,
  settings: Settings,
  minutes: number | null,
  now: number,
): { state: EngineState; events: SchedulerEvent[] } {
  const state = structuredClone(input);
  const events: SchedulerEvent[] = [];
  if (state.focusStarted !== null)
    events.push({
      type: 'focus-complete',
      value: Math.max(0, (now - state.focusStarted) / 60000),
      detail: 'Focus session',
    });
  state.focusUntil = minutes === null ? null : minutes === 0 ? -1 : now + minutes * 60000;
  state.focusStarted = minutes === null ? null : now;
  state.pending = null;
  for (const t of reminderTypes) state.nextDue[t] = now + intervalMs(t, settings);
  return { state, events };
}
export function createEngine(settings: Settings, now = Date.now()): EngineState {
  return {
    nextDue: Object.fromEntries(
      reminderTypes.map((t) => [t, now + intervalMs(t, settings)]),
    ) as Record<ReminderType, number>,
    focusUntil: null,
    focusStarted: null,
    disabledToday: {},
    skipStreak: {},
    pending: null,
    suggestion: null,
    lastTick: now,
  };
}
