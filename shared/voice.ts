import { Reminder } from './types';
export function reminderSpeech(r: Reminder): string {
  if (r.reason === 'distance')
    return 'Please move back from the screen toward your calibrated position. Relax your shoulders.';
  if (r.type === 'posture')
    return 'Please sit straight in a comfortable position. Relax your shoulders, keep your feet supported, and bring your head over your shoulders.';
  if (r.type === 'eyes')
    return 'Time to rest your eyes. Look away from the screen at something in the distance. Blink softly. Choose an eye break from the reminder when you are ready.';
  if (r.type === 'stretch')
    return 'Time for a movement break. Gently roll your shoulders, relax your hands, and stand or change position if comfortable. Follow the stretch guide. Stop any movement that hurts.';
  if (r.type === 'water') return 'Please take a comfortable sip of water.';
  return 'Time for a screen break. Step away, relax, and return when you are ready.';
}
