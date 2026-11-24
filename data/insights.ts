import { dayKey } from '../shared/defaults';
import { EventRecord, Settings } from '../shared/types';
import { eyeExerciseIds } from '../shared/exercises';
export function hydrationStreak(events: EventRecord[], goal: number, now = Date.now()): number {
  const counts = new Map<string, number>();
  for (const e of events)
    if (e.type === 'water') counts.set(e.day, (counts.get(e.day) ?? 0) + e.value);
  const cursor = new Date(now);
  let count = 0;
  // An unfinished today does not erase the streak earned through yesterday.
  if ((counts.get(dayKey(now)) ?? 0) < goal) cursor.setDate(cursor.getDate() - 1);
  while ((counts.get(dayKey(cursor.getTime())) ?? 0) >= goal) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
export function average(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}
export function dailySummary(events: EventRecord[], settings: Settings, day = dayKey()) {
  const rows = events.filter((e) => e.day === day);
  const count = (type: string) =>
    rows.filter((e) => e.type === type).reduce((n, e) => n + e.value, 0);
  const breaks = rows.filter((e) => e.type === 'break-complete').length,
    skipped = rows.filter(
      (e) => e.type === 'reminder-skipped' && ['break', 'eyes', 'stretch'].includes(e.detail),
    ).length;
  const water = count('water'),
    blink = average(rows.filter((e) => e.type === 'blink-rate').map((e) => e.value)),
    posture = average(rows.filter((e) => e.type === 'posture-score').map((e) => e.value));
  const focus = rows.filter((e) => e.type === 'focus-complete').map((e) => e.value);
  const components = [
    {
      label: 'Breaks',
      value: Math.min(100, (breaks / 4) * 100),
      weight: 40,
      explanation: '4 completed pauses = 100%',
    },
    {
      label: 'Water',
      value: Math.min(100, (water / settings.waterGoal) * 100),
      weight: 30,
      explanation: `${settings.waterGoal} logged glasses = 100%`,
    },
  ];
  if (posture !== null)
    components.push({
      label: 'Posture',
      value: posture,
      weight: 20,
      explanation: 'Average of observed posture estimates',
    });
  if (blink !== null)
    components.push({
      label: 'Blinks',
      value: Math.min(100, (blink / 12) * 100),
      weight: 10,
      explanation: '12 observed blinks/min = 100% (project heuristic)',
    });
  const total = components.reduce((s, c) => s + c.weight, 0);
  const score =
    breaks > 0 || water > 0 || posture !== null || blink !== null
      ? Math.round(components.reduce((s, c) => s + c.value * c.weight, 0) / total)
      : null;
  return {
    day,
    breaks,
    skipped,
    water,
    blink,
    posture,
    focus: focus.reduce((longest, minutes) => Math.max(longest, minutes), 0),
    focusMinutes: focus.reduce((sum, minutes) => sum + minutes, 0),
    score,
    components,
  };
}
export function weekSummary(events: EventRecord[], settings: Settings, now = Date.now(), days = 7) {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (days - 1 - i));
    return dailySummary(events, settings, dayKey(date.getTime()));
  });
}
export function weeklyInsight(events: EventRecord[]): string {
  const recent = events.filter((e) => e.at >= Date.now() - 7 * 86400000);
  const skips = recent.filter((e) => e.type === 'reminder-skipped');
  if (skips.length >= 3) {
    const hours = new Map<number, number>();
    for (const e of skips) {
      const hour = new Date(e.at).getHours();
      hours.set(hour, (hours.get(hour) ?? 0) + 1);
    }
    const [hour, count] = [...hours].sort((a, b) => b[1] - a[1])[0];
    if (count >= 3)
      return `You skipped ${count} reminders around ${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}. Important task mode or a longer interval may give you more space then.`;
  }
  const breaks = recent.filter((e) => e.type === 'break-complete').length;
  return breaks
    ? `You made room for ${breaks} ${breaks === 1 ? 'pause' : 'pauses'} this week. Small moments count. Keep the rhythm that works for you.`
    : 'Your story starts with your first small pause. No score to chase; just room to find a rhythm.';
}
export function badges(events: EventRecord[], settings: Settings) {
  const week = weekSummary(events, settings);
  return [
    {
      name: 'Hydration Hero',
      detail: 'Reach your personal water goal on 3 days this week.',
      earned: week.filter((d) => d.water >= settings.waterGoal).length >= 3,
    },
    {
      name: 'Posture Pro',
      detail: 'Make 5 camera-free posture check-ins.',
      earned: events.filter((e) => e.type === 'posture-check').length >= 5,
    },
    {
      name: 'Blink Boss',
      detail: 'Complete 3 guided eye exercises.',
      earned:
        events.filter((e) => e.type === 'exercise-complete' && eyeExerciseIds.includes(e.detail))
          .length >= 3,
    },
    {
      name: 'Room to Reset',
      detail: 'Make room for 5 completed breaks.',
      earned: events.filter((e) => e.type === 'break-complete').length >= 5,
    },
  ];
}
