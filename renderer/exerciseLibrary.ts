import { eyeExerciseIds } from '../shared/exercises';

export type ExerciseGroup = 'Neck' | 'Shoulders' | 'Hands & wrists' | 'Eyes' | 'Full body';
export interface Exercise {
  id: string;
  name: string;
  group: ExerciseGroup;
  seconds: number;
  motion: string;
  steps: string[];
  caption: string;
}
export const exercises: Exercise[] = [
  {
    id: 'distance-gaze',
    name: 'Look into the distance',
    group: 'Eyes',
    seconds: 20,
    motion: 'focus',
    caption: 'Take your attention off the display',
    steps: [
      'Look away from the screen toward an object about 20 feet away, if available.',
      'Let your gaze rest there for about 20 seconds. Do not stare at bright lights or the sun.',
      'Blink naturally before returning to your work.',
    ],
  },
  {
    id: 'closed-rest',
    name: 'Quiet closed-eye rest',
    group: 'Eyes',
    seconds: 20,
    motion: 'blink',
    caption: 'A comfortable screen-free pause',
    steps: [
      'Sit comfortably and put your work aside.',
      'Let your eyelids close softly. Do not squeeze, rub or press your eyes.',
      'Breathe normally, then open your eyes gently when ready.',
    ],
  },
  {
    id: 'neck-tilt',
    name: 'Side-to-side ease',
    group: 'Neck',
    seconds: 40,
    motion: 'tilt',
    caption: 'A little space for your neck',
    steps: [
      'Sit comfortably, with shoulders relaxed.',
      'Gently bring one ear toward the same shoulder. Keep your shoulder down.',
      'Hold gently for about 15 seconds, then return to centre and switch sides. Do not pull or force.',
    ],
  },
  {
    id: 'chin-tuck',
    name: 'Gentle chin tuck',
    group: 'Neck',
    seconds: 40,
    motion: 'chin',
    caption: 'Find a comfortable upright position',
    steps: [
      'Look straight ahead with relaxed shoulders.',
      'Gently draw your chin back, keeping your eyes level.',
      'Hold briefly. Relax and repeat within a comfortable range.',
    ],
  },
  {
    id: 'neck-rotation',
    name: 'Look left, look right',
    group: 'Neck',
    seconds: 40,
    motion: 'turn',
    caption: 'Move slowly, without strain',
    steps: [
      'Keep your shoulders soft and your chin level.',
      'Slowly turn your head a little to one side.',
      'Return to centre. Repeat on the other side. Avoid full neck circles.',
    ],
  },
  {
    id: 'shrugs',
    name: 'Shoulder shrug & release',
    group: 'Shoulders',
    seconds: 40,
    motion: 'shrug',
    caption: 'Lift a little. Let a little go.',
    steps: [
      'Sit or stand comfortably.',
      'Raise your shoulders gently toward your ears.',
      'Release them slowly. Breathe naturally and repeat.',
    ],
  },
  {
    id: 'shoulder-roll',
    name: 'Shoulder reset',
    group: 'Shoulders',
    seconds: 40,
    motion: 'roll',
    caption: 'Small circles, softer shoulders',
    steps: [
      'Let your arms rest loosely by your sides.',
      'Gently roll your shoulders up, back, and down.',
      'Keep the circles small and comfortable.',
    ],
  },
  {
    id: 'chest-opener',
    name: 'Open up a little',
    group: 'Shoulders',
    seconds: 40,
    motion: 'open',
    caption: 'Make some room to breathe',
    steps: [
      'Sit upright with feet supported.',
      'Rest your hands behind you or lightly on your hips.',
      'Gently draw your shoulders back for about 15 seconds, then relax. Avoid arching or forcing.',
    ],
  },
  {
    id: 'wrist-flexor',
    name: 'Wrist flexor stretch',
    group: 'Hands & wrists',
    seconds: 40,
    motion: 'wrist',
    caption: 'A small reset for busy hands',
    steps: [
      'Extend one arm gently, palm facing up.',
      'With your other hand, ease your fingers downward until comfortable.',
      'Hold a mild stretch for about 15 seconds, release and switch hands. Never pull through pain.',
    ],
  },
  {
    id: 'wrist-extensor',
    name: 'Wrist extensor stretch',
    group: 'Hands & wrists',
    seconds: 40,
    motion: 'wrist',
    caption: 'Ease away from the keyboard',
    steps: [
      'Extend one arm gently, palm facing down.',
      'With your other hand, ease your fingers toward the floor.',
      'Hold gently for about 15 seconds, release and switch hands. Do not bounce or pull through pain.',
    ],
  },
  {
    id: 'fingers',
    name: 'Finger fan',
    group: 'Hands & wrists',
    seconds: 30,
    motion: 'fingers',
    caption: 'Uncurl. Open. Relax.',
    steps: [
      'Rest your forearms comfortably.',
      'Slowly spread your fingers apart.',
      'Relax into a loose hand. Repeat without squeezing tightly.',
    ],
  },
  {
    id: 'slow-blink',
    name: 'Slow, soft blinks',
    group: 'Eyes',
    seconds: 30,
    motion: 'blink',
    caption: 'Let your eyes pause',
    steps: [
      'Look away from your screen.',
      'Close your eyes softly for a moment, without squeezing.',
      'Open them gently. Repeat at an easy pace.',
    ],
  },
  {
    id: 'palming',
    name: 'A moment of shade',
    group: 'Eyes',
    seconds: 40,
    motion: 'palm',
    caption: 'No pressure. Just a quiet pause.',
    steps: [
      'Rest your elbows on a supported surface.',
      'Cup your hands loosely around closed eyes, without touching or pressing them.',
      'Breathe naturally. Remove your hands when you’re ready.',
    ],
  },
  {
    id: 'near-far',
    name: 'Near & far focus',
    group: 'Eyes',
    seconds: 40,
    motion: 'focus',
    caption: 'Look beyond the screen',
    steps: [
      'Choose a nearby object at a comfortable distance.',
      'Look at it briefly, then at something further away.',
      'Alternate slowly. Stop if this feels uncomfortable.',
    ],
  },
  {
    id: 'figure-eight',
    name: 'An easy figure eight',
    group: 'Eyes',
    seconds: 30,
    motion: 'eight',
    caption: 'Follow slowly, without strain',
    steps: [
      'Imagine a large sideways figure eight in the distance.',
      'Trace it gently with your gaze, without moving your head much.',
      'Relax. Blink naturally and avoid forcing your eyes to an extreme.',
    ],
  },
  {
    id: 'stand',
    name: 'Stand & settle',
    group: 'Full body',
    seconds: 40,
    motion: 'stand',
    caption: 'A small change of position',
    steps: [
      'Make sure the space around you is clear.',
      'Stand up slowly, using stable support if needed.',
      'Take a few easy steps, or stay seated and change your position.',
    ],
  },
  {
    id: 'calf',
    name: 'Easy calf raises',
    group: 'Full body',
    seconds: 40,
    motion: 'calf',
    caption: 'Steady support, small movements',
    steps: [
      'Stand beside a stable desk or chair for support.',
      'Slowly lift your heels a little, then lower them.',
      'Stay comfortable. You can also try this seated.',
    ],
  },
  {
    id: 'twist',
    name: 'Gentle seated turn',
    group: 'Full body',
    seconds: 40,
    motion: 'twist',
    caption: 'Turn with ease, not force',
    steps: [
      'Sit upright with feet supported.',
      'Turn your upper body slightly to one side, without pulling on your chair.',
      'Return to centre and try the other side. Keep the motion gentle.',
    ],
  },
];
export function coachRoutine(reason: string): Exercise[] {
  const ids =
    reason === 'posture'
      ? ['chin-tuck', 'shoulder-roll', 'chest-opener', 'neck-rotation', 'wrist-flexor', 'stand']
      : reason === 'eyes'
        ? eyeExerciseIds
        : ['shoulder-roll', 'neck-tilt', 'chest-opener', 'wrist-flexor', 'wrist-extensor', 'stand'];
  return ids.map((id) => exercises.find((e) => e.id === id)!);
}
