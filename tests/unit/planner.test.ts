import { describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Store } from '../../data/store';
import { defaults, dayKey } from '../../shared/defaults';
import { createEngine } from '../../engine/scheduler';
import { Snapshot, EventRecord } from '../../shared/types';
import {
  breathingFrame,
  formatCountdown,
  focusMinutes,
  nextCare,
  careStatus,
} from '../../shared/wellness';
describe('private daily priorities', () => {
  it('persists priorities, completion and focus goals across reopening', () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), 'screenwell-plan-')), 'plan.sqlite');
    let store = new Store(file);
    store.updatePlan({ type: 'add', title: '  Read chapter one  ' });
    const id = store.plan().tasks[0].id;
    store.updatePlan({ type: 'toggle', id });
    store.updatePlan({ type: 'goal', minutes: 120 });
    store.close();
    store = new Store(file);
    expect(store.plan()).toMatchObject({
      focusGoal: 120,
      tasks: [{ id, title: 'Read chapter one', done: true }],
    });
    store.updatePlan({ type: 'toggle', id });
    expect(store.plan().tasks[0].done).toBe(false);
    store.updatePlan({ type: 'remove', id });
    expect(store.plan().tasks).toHaveLength(0);
    store.close();
  });
  it('starts a fresh local day, carries the focus preference, and leaves yesterday intact', () => {
    const store = new Store(':memory:'),
      first = new Date(2026, 10, 1, 23, 59).getTime(),
      second = new Date(2026, 10, 2, 0, 1).getTime();
    store.updatePlan({ type: 'add', title: 'A priority' }, first);
    store.updatePlan({ type: 'goal', minutes: 60 }, first);
    const previous = store.plan(first);
    expect(store.plan(second)).toEqual({ day: dayKey(second), focusGoal: 60, tasks: [] });
    store.updatePlan({ type: 'toggle', id: previous.tasks[0].id }, second);
    expect(store.plan(first)).toEqual(previous);
    expect(store.plan(second).tasks).toHaveLength(0);
    store.close();
  });
  it('rejects invalid actions and excess tasks without changing saved data or settings', () => {
    const store = new Store(':memory:');
    store.set('settings', defaults);
    for (let i = 0; i < 5; i++) store.updatePlan({ type: 'add', title: `Priority ${i}` });
    const before = store.plan();
    for (const input of [
      { type: 'add', title: 'Sixth' },
      { type: 'add', title: ' ' },
      { type: 'add', title: 'x'.repeat(121) },
      { type: 'goal', minutes: 14 },
      { type: 'goal', minutes: 361 },
      { type: 'goal', minutes: 30.5 },
      { type: 'toggle', id: 'not-an-id' },
      { type: 'goal', minutes: 60, cameraConsent: true },
    ])
      expect(() => store.updatePlan(input)).toThrow();
    expect(store.plan()).toEqual(before);
    expect(store.settings()).toEqual(defaults);
    store.close();
  });
  it('keeps demo priorities separate and deletes planner state with all local data', () => {
    const real = new Store(':memory:'),
      demo = new Store(':memory:');
    real.updatePlan({ type: 'add', title: 'My private priority' });
    real.updatePlan({ type: 'goal', minutes: 180 });
    expect(demo.plan().tasks).toHaveLength(0);
    demo.updatePlan({ type: 'add', title: 'A demo task' });
    expect(real.plan().tasks[0].title).toBe('My private priority');
    real.clear();
    expect(real.plan().tasks).toHaveLength(0);
    expect(real.plan().focusGoal).toBe(90);
    real.close();
    demo.close();
  });
});
describe('honest dashboard timing', () => {
  const now = new Date(2026, 10, 1, 12).getTime();
  const snapshot = (): Snapshot => {
    const settings = {
      ...defaults,
      onboarded: true,
      quietEnabled: false,
      enabled: { ...defaults.enabled },
      activeStart: '00:00',
      activeEnd: '00:00',
    };
    return {
      settings,
      engine: createEngine(settings, now),
      events: [],
      demo: false,
      privacy: {
        blockedRequests: 0,
        cameraOn: false,
        dataPath: '',
        modelReady: true,
        version: 'test',
      },
      plan: { day: dayKey(now), tasks: [], focusGoal: 90 },
      study: null,
      studyPresets: [],
    };
  };
  it('honours focus, quiet hours, disabled reminders and off-for-today in the upcoming queue', () => {
    const data = snapshot();
    expect(nextCare(data, now)).toHaveLength(5);
    data.settings.enabled.water = false;
    data.engine.disabledToday.eyes = dayKey(now);
    expect(nextCare(data, now).map((item) => item.type)).not.toContain('water');
    expect(nextCare(data, now).map((item) => item.type)).not.toContain('eyes');
    data.engine.focusUntil = now + 60000;
    expect(nextCare(data, now)).toEqual([]);
    expect(careStatus(data, now)).toContain('Focus mode');
    data.engine.focusUntil = null;
    data.settings.quietEnabled = true;
    data.settings.quietStart = '00:00';
    data.settings.quietEnd = '00:00';
    expect(nextCare(data, now)).toEqual([]);
    expect(careStatus(data, now)).toContain('Quiet hours');
  });
  it('shows a waiting reminder first and omits upcoming reminders that fall in quiet hours', () => {
    const data = snapshot();
    data.settings.quietEnabled = true;
    data.settings.quietStart = '12:02';
    data.settings.quietEnd = '14:00';
    data.engine.nextDue.break = now - 500;
    data.engine.nextDue.stretch = now + 120000;
    data.engine.pending = {
      type: 'eyes',
      id: 'waiting',
      createdAt: now,
      source: 'timer',
      soft: false,
    };
    expect(nextCare(data, now)).toEqual([
      { type: 'eyes', at: now },
      { type: 'break', at: now - 500 },
    ]);
  });
  it('sums completed focus sessions only for the current local day', () => {
    const data = snapshot();
    const event = (id: number, type: string, value: number, day = dayKey(now)): EventRecord => ({
      id,
      type,
      value,
      day,
      at: now,
      detail: '',
    });
    data.events = [
      event(1, 'focus-complete', 25),
      event(2, 'focus-complete', 45),
      event(3, 'focus-complete', 100, '2026-10-31'),
      event(4, 'water', 1),
    ];
    expect(focusMinutes(data, now)).toBe(70);
  });
  it('formats deadlines without negative time and follows real breathing phase boundaries', () => {
    expect(formatCountdown(-4000)).toBe('00:00');
    expect(formatCountdown(90001)).toBe('01:31');
    expect(breathingFrame(0, 60)).toMatchObject({
      phase: 'Breathe in',
      phaseSeconds: 4,
      cycles: 0,
      done: false,
    });
    expect(breathingFrame(4, 60)).toMatchObject({
      phase: 'Breathe out',
      phaseSeconds: 6,
      done: false,
    });
    expect(breathingFrame(10, 60)).toMatchObject({ phase: 'Breathe in', cycles: 1 });
    expect(breathingFrame(75, 60)).toMatchObject({ remaining: 0, done: true, cycles: 6 });
  });
});
