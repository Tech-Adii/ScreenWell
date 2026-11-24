import { Store } from './store';
import { Settings } from '../shared/types';
// Synthetic records are created only in the in-memory demo database.
export function seedDemo(store: Store, settings: Settings) {
  for (let ago = 6; ago >= 0; ago--) {
    const date = new Date();
    date.setDate(date.getDate() - ago);
    date.setHours(9, 0, 0, 0);
    const at = date.getTime();
    for (let n = 0; n < Math.min(settings.waterGoal, 4 + ((6 - ago) % 5)); n++)
      store.log('water', 1, 'DEMO: sample water log', at + n * 55 * 60000);
    for (let n = 0; n < 2 + ((6 - ago) % 4); n++)
      store.log('break-complete', 60, 'DEMO: sample break', at + n * 75 * 60000);
    for (let n = 0; n < 6; n++) {
      store.log(
        'posture-score',
        76 + ((n * 3 + ago) % 21),
        'DEMO: sample posture',
        at + n * 45 * 60000,
      );
      store.log('blink-rate', 10 + ((n + ago) % 8), 'DEMO: sample blinks', at + n * 45 * 60000);
    }
    store.log('focus-complete', 25 + (ago % 3) * 15, 'DEMO: sample focus', at + 90 * 60000);
  }
}
