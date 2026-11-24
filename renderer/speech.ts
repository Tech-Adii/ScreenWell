// Only installed, local English voices are eligible. Never fall back to a remote voice.
let cancelCurrent = () => {};
export function stopSpeech() {
  cancelCurrent();
}
export function speakOffline(text: string, status: (message: string) => void = () => {}) {
  stopSpeech();
  if (typeof speechSynthesis === 'undefined') {
    status('Voice is unavailable. Follow the written instructions.');
    return () => {};
  }
  const synth = speechSynthesis;
  let canceled = false,
    started = false;
  const cleanup = () => {
    clearTimeout(timer);
    synth.removeEventListener('voiceschanged', attempt);
  };
  const cancel = () => {
    canceled = true;
    cleanup();
    synth.cancel();
  };
  function attempt() {
    if (canceled || started) return;
    const voice = synth.getVoices().find((v) => v.localService && /^en(?:-|$)/i.test(v.lang));
    if (!voice) return;
    started = true;
    cleanup();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.volume = 0.7;
    utterance.onend = () => {
      if (!canceled) status('Voice instructions finished.');
    };
    utterance.onerror = () => {
      if (!canceled) status('Voice could not play. Follow the written instructions.');
    };
    status('Reading instructions…');
    try {
      synth.speak(utterance);
    } catch {
      status('Voice could not play. Follow the written instructions.');
    }
  }
  cancelCurrent = cancel;
  synth.addEventListener('voiceschanged', attempt);
  const timer = setTimeout(() => {
    cleanup();
    if (!started && !canceled)
      status('No installed offline English voice found. Follow the written instructions.');
  }, 2000);
  attempt();
  return cancel;
}
