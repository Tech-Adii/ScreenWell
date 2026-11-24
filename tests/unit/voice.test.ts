import { afterEach, describe, expect, it, vi } from 'vitest';
import { speakOffline, stopSpeech } from '../../renderer/speech';
import { coachRoutine } from '../../renderer/exerciseLibrary';
afterEach(() => {
  stopSpeech();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function mockSpeech() {
  const bus = new EventTarget();
  const voices: { localService: boolean; lang: string }[] = [];
  const synth = {
    getVoices: () => voices,
    speak: vi.fn(),
    cancel: vi.fn(),
    addEventListener: bus.addEventListener.bind(bus),
    removeEventListener: bus.removeEventListener.bind(bus),
  };
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      constructor(public text: string) {}
    },
  );
  return { bus, voices, synth };
}
describe('offline speech', () => {
  it('waits for local voices and speaks once without using remote voices', () => {
    vi.useFakeTimers();
    const { bus, voices, synth } = mockSpeech();
    voices.push({ localService: false, lang: 'en-US' });
    speakOffline('Please sit straight.');
    expect(synth.speak).not.toHaveBeenCalled();
    voices.push({ localService: true, lang: 'en-IN' });
    bus.dispatchEvent(new Event('voiceschanged'));
    bus.dispatchEvent(new Event('voiceschanged'));
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect(synth.speak.mock.calls[0][0].voice).toBe(voices[1]);
  });
  it('reports missing voices and never replays a canceled request', () => {
    vi.useFakeTimers();
    const { bus, voices, synth } = mockSpeech();
    const status = vi.fn();
    speakOffline('First', status);
    vi.advanceTimersByTime(2000);
    expect(status).toHaveBeenCalledWith(expect.stringContaining('No installed'));
    const cancel = speakOffline('Second');
    cancel();
    voices.push({ localService: true, lang: 'en-US' });
    bus.dispatchEvent(new Event('voiceschanged'));
    expect(synth.speak).not.toHaveBeenCalled();
  });
  it('provides six unique eye and stretch choices with usable steps', () => {
    for (const kind of ['eyes', 'stretch']) {
      const routine = coachRoutine(kind);
      expect(new Set(routine.map((item) => item.id)).size).toBe(6);
      expect(routine.every((item) => item.steps.length >= 3)).toBe(true);
    }
  });
});
