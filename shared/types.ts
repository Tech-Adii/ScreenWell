export type ReminderType = 'break' | 'water' | 'stretch' | 'eyes' | 'posture';
export const reminderTypes: ReminderType[] = ['break', 'water', 'stretch', 'eyes', 'posture'];
export interface Baseline {
  faceSize: number;
  headOffset: number;
  shoulderY: number;
  tilt: number;
  lean: number;
  version?: 2;
  neckLength?: number;
  shoulderSlope?: number;
  headPitch?: number;
  worldSpace?: boolean;
  model?: VisionMode;
  calibratedAt?: number;
}
export type VisionMode = 'lite' | 'full' | 'heavy';
export interface FaceMeasurement {
  faceSize: number;
  eyeSpan: number;
  faceHeight: number;
  yaw: number;
  pitch: number;
  roll: number;
}
export interface DistanceBaseline extends FaceMeasurement {
  version: 2;
  calibratedAt: number;
}
export type TrackingQuality = 'clear' | 'no-face' | 'lighting' | 'turned' | 'multiple' | 'settling';
export type DistanceState = 'unknown' | 'comfortable' | 'close';
export interface CalibrationUpdate {
  blinkThreshold?: number;
  baseline?: Baseline;
  distanceBaseline?: DistanceBaseline;
}
export type PaletteName =
  | 'aurora'
  | 'lagoon'
  | 'sunset'
  | 'orchid'
  | 'citrus'
  | 'forest'
  | 'cobalt'
  | 'nebula'
  | 'sakura'
  | 'custom';
export type MotionLevel = 'off' | 'gentle' | 'expressive';
export interface Settings {
  onboarded: boolean;
  name: string;
  ageGroup: string;
  course: string;
  screenHours: string;
  glasses: string;
  device: string;
  style: 'popup' | 'small' | 'fullscreen';
  interval: number;
  preset: 'balanced' | '202020' | 'pomodoro' | 'custom';
  quietStart: string;
  quietEnd: string;
  quietEnabled: boolean;
  activeStart: string;
  activeEnd: string;
  theme: 'light' | 'dark' | 'system';
  palette: PaletteName;
  primaryColor: string;
  companionColor: string;
  motionLevel: MotionLevel;
  ambientEffects: boolean;
  fontScale: number;
  contrast: boolean;
  reducedMotion: boolean;
  startAtLogin: boolean;
  sound: boolean;
  voice: boolean;
  autoDelay: boolean;
  waterGoal: number;
  waterInterval: number;
  enabled: Record<ReminderType, boolean>;
  cameraConsent: boolean;
  showPreview: boolean;
  blinkThreshold: number | null;
  baseline: Baseline | null;
  lowBlinkRate: number;
  postureHoldSeconds: number;
  cooldownMinutes: number;
  visionMode: VisionMode;
  distanceBaseline: DistanceBaseline | null;
  distanceHoldSeconds: number;
  distanceScale: number;
  distanceCooldownSeconds: number;
}
export interface Reminder {
  id: string;
  type: ReminderType;
  createdAt: number;
  source: 'timer' | 'vision' | 'session';
  soft: boolean;
  reason?:
    | 'distance'
    | 'posture'
    | 'low-blink'
    | 'eyes-closed'
    | 'study-rest'
    | 'study-water'
    | 'study-exercise'
    | 'study-finished';
  studyId?: string;
}
export interface EventRecord {
  id: number;
  type: string;
  at: number;
  day: string;
  value: number;
  detail: string;
}
export interface EngineState {
  nextDue: Record<ReminderType, number>;
  focusUntil: number | null;
  focusStarted: number | null;
  disabledToday: Partial<Record<ReminderType, string>>;
  skipStreak: Partial<Record<ReminderType, number>>;
  pending: Reminder | null;
  suggestion: ReminderType | null;
  lastTick: number;
  visionSnoozeUntil?: Partial<Record<ReminderType, number>>;
}
export interface VisionMetrics {
  blinksPerMinute: number | null;
  totalBlinks: number;
  posture: number | null;
  present: boolean;
  message: string;
  issues: string[];
  ear: number;
  baseline: Baseline | null;
  ready: boolean;
  quality: TrackingQuality;
  faceMeasurement: FaceMeasurement | null;
  distanceRatio: number | null;
  distanceState: DistanceState;
  closeSeconds: number;
  inferenceMs: number;
  confidence?: number | null;
}
export interface LiveMonitor {
  at: number;
  fresh: boolean;
  trackingPaused?: boolean;
  trackingMessage?: string;
  background: boolean;
  cameraOn: boolean;
  confidence: number | null;
  posture: number | null;
  position: string;
  blinks: number | null;
  rate: number | null;
  distanceRatio: number | null;
  distanceState: DistanceState;
  closeSeconds: number;
}
export type WindowsNotificationSetting =
  | 'unknown'
  | 'Enabled'
  | 'DisabledForApplication'
  | 'DisabledForUser'
  | 'DisabledByGroupPolicy'
  | 'DisabledByManifest';
export interface NotificationDelivery {
  native: 'idle' | 'checking' | 'requested' | 'blocked' | 'unavailable' | 'failed';
  setting: WindowsNotificationSetting;
  message: string;
}
export interface PrivacyStatus {
  blockedRequests: number;
  cameraOn: boolean;
  dataPath: string;
  modelReady: boolean;
  version: string;
}
export interface Snapshot {
  settings: Settings;
  engine: EngineState;
  events: EventRecord[];
  privacy: PrivacyStatus;
  demo: boolean;
  plan: DailyPlan;
  study: StudySession | null;
  studyPresets: StudyPreset[];
  monitor?: LiveMonitor;
  notificationDelivery?: NotificationDelivery;
}
export interface VisionSelection {
  blinks: boolean;
  posture: boolean;
  distance: boolean;
}
export interface StudyConfig {
  studyMinutes: number;
  blockMinutes: number;
  restSeconds: number;
  water: boolean;
  exerciseEveryMinutes: number;
  exerciseSeconds: number;
  blinks: boolean;
  posture: boolean;
  postureHoldSeconds: number;
  distance?: boolean;
  cameraConsent: boolean;
}
export type StudyPlanConfig = Omit<StudyConfig, 'cameraConsent'>;
export interface StudyPreset {
  id: string;
  name: string;
  config: StudyPlanConfig;
}
export type StudyPresetAction =
  { type: 'save'; name: string; config: StudyPlanConfig } | { type: 'remove'; id: string };
export interface StudyStep {
  id: number;
  kind: 'study' | 'rest' | 'exercise';
  seconds: number;
  studyMinutes: number;
}
export interface AwayRest {
  stepIndex: number;
  seconds: number;
}
export interface StudySession {
  version: 1;
  id: string;
  config: StudyConfig;
  steps: StudyStep[];
  index: number;
  status: 'preparing' | 'running' | 'paused' | 'completed' | 'ended';
  deadline: number | null;
  remainingMs: number;
  startedAt: number;
  lastTickAt: number;
  completedStudySeconds: number;
  cameraAuthorized: boolean;
  cameraEpoch: number;
  calibration: {
    baseline: Baseline | null;
    blinkThreshold: number | null;
    distanceBaseline?: DistanceBaseline | null;
  };
  blinks: number;
  lastVisionBlinks: number;
  postureTotal: number;
  postureSamples: number;
  notices: Reminder[];
  pauseReason: string;
  awaySeconds?: number;
  awayRest?: AwayRest | null;
  reviewedAwayRestIndex?: number;
}
export type StudyAction =
  | { type: 'begin' | 'pause' | 'end' | 'without-camera' | 'camera-off' | 'skip' }
  | { type: 'resume' | 'camera-on'; cameraConsent: boolean }
  | { type: 'away-rest'; sessionId: string; stepIndex: number; accept: boolean };
export interface Priority {
  id: string;
  title: string;
  done: boolean;
}
export interface DailyPlan {
  day: string;
  tasks: Priority[];
  focusGoal: number;
}
export type PlanAction =
  | { type: 'add'; title: string }
  | { type: 'toggle'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'goal'; minutes: number };
export type ReminderAction = 'now' | 'snooze5' | 'snooze10' | 'snooze15' | 'skip' | 'off';
export interface ScreenWellAPI {
  platform: 'darwin' | 'win32' | 'linux' | 'other';
  snapshot(): Promise<Snapshot>;
  checkNotifications(): Promise<Snapshot>;
  speak(text: string | null): Promise<void>;
  onSpeak(callback: (text: string | null) => void): () => void;
  plan(action: PlanAction): Promise<Snapshot>;
  startStudy(config: StudyConfig): Promise<Snapshot>;
  studyPreset(action: StudyPresetAction): Promise<Snapshot>;
  studyAction(action: StudyAction): Promise<Snapshot>;
  settings(settings: Settings): Promise<Snapshot>;
  calibration(update: CalibrationUpdate): Promise<Snapshot>;
  focus(minutes: number | null): Promise<Snapshot>;
  reminder(action: ReminderAction, expectedId?: string): Promise<Snapshot>;
  water(): Promise<Snapshot>;
  event(
    type: 'break-complete' | 'posture-check' | 'exercise-complete' | 'breathing-complete',
    value: number,
    detail: string,
  ): Promise<Snapshot>;
  vision(metrics: VisionMetrics): Promise<void>;
  camera(on: boolean): Promise<void>;
  export(format: 'csv' | 'pdf', days: number): Promise<string | null>;
  deleteData(): Promise<Snapshot>;
  feedback(text: string): Promise<void>;
  demo(on: boolean): Promise<Snapshot>;
  demoReminder(type: ReminderType): Promise<Snapshot>;
  suggest(accept: boolean): Promise<Snapshot>;
  activity(): void;
  onChange(callback: (snapshot: Snapshot) => void): () => void;
  onMonitor(callback: (monitor: LiveMonitor) => void): () => void;
  onCameraOff(callback: () => void): () => void;
  onWindowActivity(callback: (active: boolean) => void): () => void;
}
declare global {
  interface Window {
    screenwell: ScreenWellAPI;
  }
}
