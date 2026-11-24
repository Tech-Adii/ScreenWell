import { Settings } from './types';
import { messages } from './i18n/en';
export const defaults: Settings = {
  onboarded: false,
  name: '',
  ageGroup: '',
  course: '',
  screenHours: '',
  glasses: '',
  device: 'Laptop',
  style: 'popup',
  interval: 45,
  preset: 'balanced',
  quietStart: '22:00',
  quietEnd: '07:00',
  quietEnabled: true,
  activeStart: '08:00',
  activeEnd: '22:00',
  theme: 'light',
  palette: 'aurora',
  primaryColor: '#7964ef',
  companionColor: '#2fcbb4',
  motionLevel: 'gentle',
  ambientEffects: true,
  fontScale: 1,
  contrast: false,
  reducedMotion: false,
  startAtLogin: false,
  sound: false,
  voice: false,
  autoDelay: true,
  waterGoal: 8,
  waterInterval: 60,
  enabled: { break: true, water: true, stretch: true, eyes: true, posture: true },
  cameraConsent: false,
  showPreview: true,
  blinkThreshold: null,
  baseline: null,
  lowBlinkRate: 8,
  postureHoldSeconds: 12,
  cooldownMinutes: 5,
  visionMode: 'full',
  distanceBaseline: null,
  distanceHoldSeconds: 10,
  distanceScale: 1.25,
  distanceCooldownSeconds: 60,
};
export const labels = messages.reminders;
export function greeting(hour = new Date().getHours()) {
  return hour < 12
    ? messages.greeting.morning
    : hour < 17
      ? messages.greeting.afternoon
      : messages.greeting.evening;
}
export function dayKey(at = Date.now()): string {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
