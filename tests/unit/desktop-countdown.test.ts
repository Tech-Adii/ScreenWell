import { describe, expect, it } from 'vitest';
import { desktopCountdown } from '../../engine/desktop-countdown';
import { createEngine, setFocus } from '../../engine/scheduler';
import { actStudy, createStudy, tickStudy } from '../../engine/study';
import { defaults, dayKey } from '../../shared/defaults';
import { defaultStudyConfig, studyNotice } from '../../shared/study';

const now = new Date(2026, 10, 24, 12).getTime();
const settings = { ...defaults, onboarded: true, quietEnabled: false };

describe('desktop countdown', () => {
  it('follows the guided study timer through a pause and then an eye break', () => {
    const data = {
      settings,
      engine: createEngine(settings, now),
      study: createStudy(defaultStudyConfig, 'study', now),
    };
    expect(desktopCountdown(data, now + 1000)).toMatchObject({
      label: 'Eye break in',
      remaining: 1199000,
    });
    data.study = actStudy(data.study, { type: 'pause' }, now + 5000);
    expect(desktopCountdown(data, now + 15000)).toMatchObject({
      label: 'Study paused',
      remaining: 1195000,
      paused: true,
    });
    data.study = actStudy(data.study, { type: 'resume', cameraConsent: false }, now + 15000);
    const deadline = data.study.deadline!;
    data.study = tickStudy({ ...data.study, lastTickAt: deadline - 1000 }, deadline).session;
    expect(desktopCountdown(data, deadline + 1000)).toMatchObject({
      label: 'Eye break ends in',
      remaining: 29000,
    });
  });

  it('counts down to exercise when a study block ends at a movement break', () => {
    const study = createStudy({ ...defaultStudyConfig, exerciseEveryMinutes: 30 }, 'exercise', now);
    study.index = 2;
    study.deadline = now + study.steps[2].seconds * 1000;
    expect(desktopCountdown({ settings, engine: createEngine(settings, now), study }, now)).toEqual(
      {
        label: 'Stretch break in',
        remaining: 600000,
        progress: 0,
      },
    );
  });

  it('does not count down to disabled reminders or reminders during quiet hours', () => {
    const engine = createEngine(settings, now);
    engine.nextDue.break = now + 1000;
    engine.nextDue.water = now + 2000;
    engine.disabledToday.break = dayKey(now);
    const data = { settings, engine, study: null };
    expect(desktopCountdown(data, now)).toEqual({ label: 'Water reminder in', remaining: 2000 });
    const quiet = { ...settings, quietEnabled: true, quietStart: '11:00', quietEnd: '13:00' };
    expect(desktopCountdown({ ...data, settings: quiet }, now)).toEqual({ label: 'Quiet hours' });
  });

  it('shows the focus countdown instead of reminders that are on hold', () => {
    const { state: engine } = setFocus(createEngine(settings, now), settings, 30, now);
    expect(desktopCountdown({ settings, engine, study: null }, now + 15 * 60000)).toEqual({
      label: 'Focus ends in',
      remaining: 900000,
      progress: 0.5,
    });
  });

  it('keeps a completed study session visible while its completion notice is queued', () => {
    const study = createStudy(defaultStudyConfig, 'completed', now);
    study.status = 'completed';
    study.deadline = null;
    study.notices = [studyNotice(study, 'finished', now + 5000)];
    expect(desktopCountdown({ settings, engine: createEngine(settings, now), study }, now)).toEqual(
      {
        label: 'Study session complete',
      },
    );
  });
});
