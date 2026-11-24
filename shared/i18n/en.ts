// English-first message catalog. Locale keys are stable; dates use Intl with local time.
export const en = {
  greeting: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' },
  reminders: {
    break: 'Take a breather',
    water: 'A little water?',
    stretch: 'Room to move',
    eyes: 'Rest your eyes',
    posture: 'Posture check-in',
  },
  cameraPrivacy: 'Video stays on your computer. Nothing is saved or sent anywhere.',
  exerciseSafety: 'Stop if you feel pain. This is general wellness guidance, not medical advice.',
  navigation: {
    'Study session': 'Study session',
    Overview: 'Overview',
    'Breaks & focus': 'Breaks & focus',
    Hydration: 'Hydration',
    Camera: 'Camera',
    'Eye Rest': 'Eye Rest',
    'Move & reset': 'Move & reset',
    'Your progress': 'Your progress',
    'Desk setup': 'Desk setup',
  },
} as const;
export const messages = en;
