import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  protocol,
  session,
  nativeImage,
  dialog,
  screen,
  nativeTheme,
  Notification,
} from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { Store } from '../data/store';
import { act, createEngine, intervalMs, setFocus, tick } from '../engine/scheduler';
import { Settings, Snapshot, reminderTypes } from '../shared/types';
import { z } from 'zod';
import { VisionAlerts } from '../engine/vision-alerts';
import { CameraTracking } from '../engine/camera-tracking';
import { Dwell } from '../vision/posture';
import { poseModels } from '../vision/models';
import { mayRemind } from '../engine/scheduler';
import { themeTokens } from '../shared/appearance';
import { dayKey } from '../shared/defaults';
import { csvReport } from '../data/reports';
import { pdfReport } from '../data/pdf';
import { seedDemo } from '../data/demo';
import {
  createStudy,
  actStudy,
  tickStudy,
  recoverStudy,
  studyConfigSchema,
  studyActionSchema,
} from '../engine/study';
import { hasStudy, studyCameraAllowed, studySettings, studyVisionSelection } from '../shared/study';
import { studyHasCamera } from '../shared/study';
import { monitorReading, MonitorPacket } from '../shared/monitor';
import { DesktopDelivery, readWindowsNotificationSetting } from './notifications';
import { createTaskbarCountdown } from './taskbar';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'screenwell',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-domain-reliability');
app.commandLine.appendSwitch(
  'disable-features',
  'MediaRouter,OptimizationHints,AutofillServerCommunication',
);
app.commandLine.appendSwitch('no-proxy-server');
if (process.platform === 'win32') app.setAppUserModelId('in.screenwell.desktop');
const testing = process.argv.includes('--test');
if (testing && process.env.SCREENWELL_DATA_DIR)
  app.setPath('userData', path.resolve(process.env.SCREENWELL_DATA_DIR));
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
let win: BrowserWindow;
let tray: Tray;
let updateTaskbar: ReturnType<typeof createTaskbarCountdown> | undefined;
let store: Store;
let realStore: Store;
let cameraOn = false;
let quitting = false;
let blockedRequests = 0;
let state: Snapshot;
let popup: BrowserWindow | null = null;
let popupReady: Promise<void> | null = null;
let latestMonitor: MonitorPacket | null = null;
let lastActivity = 0;
let timer: ReturnType<typeof setInterval>;
let lastMetricAt = 0;
let visionAlerts = new VisionAlerts();
const recoveredDistance = new Dwell();
let cameraTracking = new CameraTracking();
let lastVisionPacket = 0;
let nativeAppearanceKey = '';
let publishedDay = dayKey();
const root = path.resolve(__dirname, '../renderer');
const iconPath = path.join(root, 'icon.png');
const desktopDelivery = new DesktopDelivery({
  osName: process.platform === 'darwin' ? 'macOS' : 'Windows',
  supported: () => Notification.isSupported(),
  readSetting: readWindowsNotificationSetting,
  create: (title, body) => new Notification({ title, body, icon: iconPath, silent: true }),
  changed: () => {
    if (state && win && !win.isDestroyed()) emit();
  },
  open: () => {
    if (win.isMinimized()) win.restore();
    win.show();
  },
});
const csp =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; worker-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";
function snapshot(): Snapshot {
  return {
    ...state,
    events: store.events(),
    plan: store.plan(),
    studyPresets: store.studyPresets(),
    monitor: monitorReading(
      latestMonitor,
      studyVisionSelection(state.study),
      cameraOn,
      lastVisionPacket,
      Date.now(),
      !!win && (!win.isFocused() || win.isMinimized()),
      hasStudy(state.study) ? state.study.blinks : undefined,
    ),
    notificationDelivery: { ...desktopDelivery.status },
    privacy: {
      blockedRequests,
      cameraOn,
      dataPath: path.join(app.getPath('userData'), 'screenwell.sqlite'),
      modelReady:
        fs.existsSync(path.join(root, 'models/face_landmarker.task')) &&
        fs.existsSync(path.join(root, 'models', poseModels[state.settings.visionMode].file)),
      version: app.getVersion(),
    },
  };
}
function emit() {
  syncNativeAppearance();
  updateTaskbar?.(state);
  const s = snapshot();
  for (const w of [win, popup]) if (w && !w.isDestroyed()) w.webContents.send('changed', s);
  return s;
}
function publishMonitor() {
  const monitor = monitorReading(
    latestMonitor,
    studyVisionSelection(state.study),
    cameraOn,
    lastVisionPacket,
    Date.now(),
    !win.isFocused() || win.isMinimized(),
    hasStudy(state.study) ? state.study.blinks : undefined,
  );
  for (const target of [win, popup])
    if (target && !target.isDestroyed()) target.webContents.send('monitor', monitor);
}
function syncNativeAppearance() {
  const s = state.settings;
  if (nativeTheme.themeSource !== s.theme) nativeTheme.themeSource = s.theme;
  const key = [
    s.theme,
    s.palette,
    s.primaryColor,
    s.companionColor,
    nativeTheme.shouldUseDarkColors,
  ].join('|');
  if (key === nativeAppearanceKey) return;
  nativeAppearanceKey = key;
  const background = themeTokens(s, nativeTheme.shouldUseDarkColors)['--bg'];
  for (const target of [win, popup])
    if (target && !target.isDestroyed()) target.setBackgroundColor(background);
}
function handle(channel: string, fn: (...args: unknown[]) => unknown) {
  ipcMain.handle(channel, (event, ...args: unknown[]) => {
    if (
      (event.sender !== win.webContents && event.sender !== popup?.webContents) ||
      !event.senderFrame?.url.startsWith('screenwell://app/')
    )
      throw new Error('Untrusted caller');
    return fn(...args);
  });
}
function persist() {
  store.set('engine', state.engine);
  store.set('study', state.study);
}
function recordAway(interval: ReturnType<CameraTracking['interrupt']>) {
  const study = state.study;
  if (!interval || !study) return false;
  store.log('study-away', interval.seconds, 'Seconds out of camera view');
  study.awaySeconds = (study.awaySeconds ?? 0) + interval.seconds;
  const rest = interval.rest;
  if (
    rest &&
    (study.reviewedAwayRestIndex ?? -1) < rest.stepIndex &&
    (!study.awayRest || rest.stepIndex >= study.awayRest.stepIndex)
  ) {
    if (study.awayRest?.stepIndex === rest.stepIndex) study.awayRest.seconds += rest.seconds;
    else study.awayRest = rest;
  }
  persist();
  return true;
}
function stopCamera() {
  recordAway(cameraTracking.interrupt());
  cameraOn = false;
  latestMonitor = null;
  if (state?.study) state.study.cameraAuthorized = false;
  if (win && !win.isDestroyed()) {
    win.webContents.setBackgroundThrottling(true);
    win.webContents.send('camera-off');
  }
  visionAlerts.resetEvidence();
  recoveredDistance.reset();
}
function syncStudyNotices(now = Date.now()) {
  const study = state.study;
  if (!study) return false;
  const kind = study.steps[study.index]?.kind;
  const latestWater = Math.max(
    -Infinity,
    ...study.notices.filter((r) => r.reason === 'study-water').map((r) => r.createdAt),
  );
  study.notices = study.notices.filter(
    (r) =>
      state.engine.disabledToday[r.type] !== dayKey(now) &&
      (r.reason !== 'study-water' || r.createdAt === latestWater) &&
      (r.createdAt > now ||
        r.reason === 'study-water' ||
        (r.reason === 'study-finished' && study.status === 'completed') ||
        (r.reason === 'study-rest' && kind === 'rest') ||
        (r.reason === 'study-exercise' && kind === 'exercise')),
  );
  if (state.engine.pending) return false;
  const index = study.notices.findIndex(
    (r) => r.createdAt <= now && !(r.reason === 'study-water' && kind === 'exercise'),
  );
  if (index < 0) return false;
  state.engine.pending = study.notices.splice(index, 1)[0];
  return true;
}
function finishStudy() {
  if (!state.study) return;
  store.log(
    'study-session-complete',
    state.study.completedStudySeconds / 60,
    'Guided plan finished',
  );
  for (const type of reminderTypes)
    state.engine.nextDue[type] = Date.now() + intervalMs(type, state.settings);
}
function watchWindowActivity(target: BrowserWindow) {
  const publish = () => {
    if (!target.isDestroyed() && !target.webContents.isDestroyed())
      target.webContents.send(
        'window-activity',
        target.isVisible() && !target.isMinimized() && (target === popup || target.isFocused()),
      );
  };
  target.on('focus', publish);
  target.on('blur', publish);
  target.on('show', publish);
  target.on('hide', publish);
  target.on('minimize', publish);
  target.on('restore', publish);
}
function logEvents(events: { type: string; value: number; detail: string }[]) {
  for (const e of events) store.log(e.type, e.value, e.detail);
}
async function syncPopup() {
  if (!state.engine.pending) desktopDelivery.clear();
  if (!state.engine.pending || (win.isFocused() && win.isVisible() && !win.isMinimized())) {
    if (popup && !popup.isDestroyed()) popup.hide();
    return;
  }
  void desktopDelivery.notify(state.engine.pending);
  if (popupReady) await popupReady;
  if (!popup || popup.isDestroyed()) {
    popup = new BrowserWindow({
      width: 420,
      height: 410,
      resizable: false,
      frame: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      show: false,
      backgroundColor: themeTokens(state.settings, nativeTheme.shouldUseDarkColors)['--bg'],
      webPreferences: {
        preload: path.resolve(__dirname, 'preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        spellcheck: false,
      },
    });
    popup.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    watchWindowActivity(popup);
    popup.webContents.on('will-navigate', (e) => e.preventDefault());
    popup.on('close', (e) => {
      if (!quitting) {
        e.preventDefault();
        popup?.hide();
      }
    });
    popupReady = popup.loadURL('screenwell://app/#reminder');
    try {
      await popupReady;
    } finally {
      popupReady = null;
    }
  }
  if (!state.engine.pending) return;
  if (win.isFocused() && win.isVisible() && !win.isMinimized()) return;
  const work = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  const height = Math.min(
    work.height - 32,
    ['eyes', 'stretch'].includes(state.engine.pending.type)
      ? 800
      : state.engine.pending.source === 'vision'
        ? 670
        : state.engine.pending.source === 'session'
          ? 620
          : state.settings.style === 'small'
            ? 340
            : 460,
  );
  popup.setBounds({
    x: work.x + work.width - Math.min(420, work.width - 32) - 16,
    y: work.y + work.height - height - 16,
    width: Math.min(420, work.width - 32),
    height,
  });
  popup.webContents.send('changed', snapshot());
  popup.setAlwaysOnTop(true, 'screen-saver');
  popup.showInactive();
}
function updateLogin(enabled: boolean) {
  if (!testing && app.isPackaged && !state.demo)
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: process.env.PORTABLE_EXECUTABLE_FILE ?? process.execPath,
    });
}

async function boot() {
  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  store = new Store(path.join(app.getPath('userData'), 'screenwell.sqlite'));
  realStore = store;
  const settings = store.settings();
  nativeTheme.themeSource = settings.theme;
  state = {
    settings,
    engine: store.engine() ?? createEngine(settings),
    events: [],
    plan: store.plan(),
    studyPresets: store.studyPresets(),
    study: recoverStudy(store.get('study'), Date.now()),
    demo: false,
    privacy: { blockedRequests: 0, cameraOn: false, modelReady: false, dataPath: '', version: '' },
  };
  if (state.engine.pending?.source === 'session' || state.engine.pending?.source === 'vision')
    state.engine.pending = null;
  session.defaultSession.webRequest.onBeforeRequest((details, cb) => {
    const allowed = /^(screenwell:|devtools:|data:|blob:)/.test(details.url);
    if (!allowed) blockedRequests++;
    cb({ cancel: !allowed });
  });
  session.defaultSession.setPermissionRequestHandler((wc, permission, cb, details) =>
    cb(
      wc === win?.webContents &&
        permission === 'media' &&
        cameraOn &&
        'mediaTypes' in details &&
        !!details.mediaTypes?.length &&
        details.mediaTypes.every((t) => t === 'video'),
    ),
  );
  session.defaultSession.setPermissionCheckHandler(
    (wc, permission, origin, details) =>
      wc === win?.webContents &&
      permission === 'media' &&
      cameraOn &&
      origin.startsWith('screenwell://app') &&
      details.mediaType === 'video',
  );
  session.defaultSession.on('will-download', (e) => e.preventDefault());
  protocol.handle('screenwell', async (request) => {
    const url = new URL(request.url);
    if (url.hostname !== 'app') return new Response('Forbidden', { status: 403 });
    const target = path.resolve(
      root,
      '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname),
    );
    if (!target.startsWith(root + path.sep)) return new Response('Forbidden', { status: 403 });
    try {
      const content = await fs.promises.readFile(target);
      const ext = path.extname(target);
      const mime: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.wasm': 'application/wasm',
        '.task': 'application/octet-stream',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
      };
      return new Response(content, {
        headers: {
          'Content-Type': mime[ext] ?? 'application/octet-stream',
          'Content-Security-Policy': csp,
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Resource-Policy': 'same-origin',
        },
      });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  });
  win = new BrowserWindow({
    title: 'ScreenWell',
    width: 1440,
    height: 940,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: themeTokens(settings, nativeTheme.shouldUseDarkColors)['--bg'],
    icon: iconPath,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.resolve(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      backgroundThrottling: true,
    },
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  if (process.platform === 'win32') win.on('page-title-updated', (event) => event.preventDefault());
  watchWindowActivity(win);
  nativeTheme.on('updated', syncNativeAppearance);
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('screenwell://app/')) e.preventDefault();
  });
  win.on('close', (e) => {
    if (!quitting && !testing) {
      e.preventDefault();
      win.hide();
      stopCamera();
      persist();
      emit();
    }
  });
  win.once('ready-to-show', () => win.show());
  if (process.platform === 'darwin') {
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        { role: 'appMenu' },
        { role: 'editMenu' },
        { role: 'viewMenu' },
        { role: 'windowMenu' },
      ]),
    );
    app.on('activate', () => {
      if (!win.isDestroyed()) {
        if (win.isMinimized()) win.restore();
        win.show();
      }
    });
  }
  const traySize = process.platform === 'darwin' ? 18 : 24;
  tray = new Tray(
    nativeImage.createFromPath(iconPath).resize({ width: traySize, height: traySize }),
  );
  updateTaskbar = createTaskbarCountdown(win, tray);
  updateTaskbar(state);
  win.on('show', () => updateTaskbar?.(state, Date.now(), true));
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open ScreenWell', click: () => win.show() },
      {
        label: 'Important task · 60 minutes',
        click: () => {
          if (hasStudy(state.study)) {
            win.show();
            return;
          }
          const r = setFocus(state.engine, state.settings, 60, Date.now());
          state.engine = r.state;
          logEvents(r.events);
          persist();
          void syncPopup();
          emit();
        },
      },
      {
        label: 'Resume reminders',
        click: () => {
          const r = setFocus(state.engine, state.settings, null, Date.now());
          state.engine = r.state;
          logEvents(r.events);
          persist();
          emit();
        },
      },
      {
        label: 'Turn camera off',
        click: () => {
          stopCamera();
          persist();
          emit();
        },
      },
      { type: 'separator' },
      {
        label: 'Quit ScreenWell',
        click: () => {
          quitting = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on('double-click', () => win.show());
  handle('snapshot', () => snapshot());
  handle('speak', (value) => {
    const text = z.string().min(1).max(3000).nullable().parse(value);
    // A single renderer owns speech, even when both reminder windows are visible.
    if (text === null || state.settings.voice) win.webContents.send('speak', text);
  });
  handle('check-notifications', async () => {
    const setting = await readWindowsNotificationSetting();
    desktopDelivery.status = {
      native: setting.startsWith('Disabled') ? 'blocked' : 'idle',
      setting,
      message: setting.startsWith('Disabled')
        ? 'Windows notifications are blocked. ScreenWell desktop popups remain available.'
        : setting === 'Enabled'
          ? 'Windows notifications enabled. ScreenWell desktop popups are ready.'
          : process.platform === 'darwin'
            ? 'macOS notification permission is managed in System Settings. ScreenWell desktop popups are ready.'
            : 'Windows status could not be verified. ScreenWell desktop popups are ready.',
    };
    return emit();
  });
  handle('plan', (input) => {
    store.updatePlan(input);
    return emit();
  });
  handle('study-preset', (input) => {
    store.updateStudyPreset(input);
    return emit();
  });
  handle('study-start', (input) => {
    if (hasStudy(state.study))
      throw new Error('Finish or end the current session before starting another.');
    const config = studyConfigSchema.parse(input),
      now = Date.now();
    const focus = setFocus(state.engine, state.settings, null, now);
    state.engine = focus.state;
    logEvents(focus.events);
    stopCamera();
    state.study = createStudy(config, randomUUID(), now);
    visionAlerts = new VisionAlerts();
    store.log('study-session-started', config.studyMinutes, 'Guided study plan');
    persist();
    void syncPopup();
    return emit();
  });
  handle('study-action', (input) => {
    if (!state.study) throw new Error('Start a session first.');
    const action = studyActionSchema.parse(input);
    const beforeStudy = state.study,
      nextStudy = actStudy(beforeStudy, action, Date.now());
    if (action.type === 'begin' && studyHasCamera(nextStudy.config) && !cameraOn)
      throw new Error('Start the camera or continue without camera checks.');
    state.study = nextStudy;
    if (action.type === 'away-rest' && action.accept) {
      store.log('break-complete', beforeStudy.awayRest!.seconds, 'Confirmed away rest');
      if (beforeStudy.index !== nextStudy.index) {
        if (state.engine.pending?.reason === 'study-rest') state.engine.pending = null;
        const restId = `${beforeStudy.id}-${beforeStudy.index}-rest-`;
        nextStudy.notices = nextStudy.notices.filter((notice) => !notice.id.startsWith(restId));
      }
    }
    if (nextStudy.status === 'completed' && beforeStudy.status !== 'completed') finishStudy();
    if (action.type === 'end') {
      const partial = nextStudy.completedStudySeconds - beforeStudy.completedStudySeconds;
      if (partial > 0) store.log('focus-complete', partial / 60, 'Guided study time before ending');
    }
    if (cameraOn && !state.study.cameraAuthorized) stopCamera();
    if (
      action.type === 'end' ||
      action.type === 'pause' ||
      action.type === 'without-camera' ||
      action.type === 'skip'
    )
      state.engine.pending = null;
    if (action.type === 'end')
      for (const type of reminderTypes)
        state.engine.nextDue[type] = Date.now() + intervalMs(type, state.settings);
    visionAlerts.resetEvidence();
    syncStudyNotices();
    store.log(`study-${action.type}`, 1, 'User choice');
    persist();
    void syncPopup();
    return emit();
  });
  ipcMain.handle('window-activity', (event) => {
    if (
      (event.sender !== win.webContents && event.sender !== popup?.webContents) ||
      !event.senderFrame?.url.startsWith('screenwell://app/')
    )
      throw new Error('Untrusted caller');
    const target = BrowserWindow.fromWebContents(event.sender);
    return (
      !!target &&
      target.isVisible() &&
      !target.isMinimized() &&
      (target === popup || target.isFocused())
    );
  });
  handle('calibration', (value) => {
    if (!cameraOn || !studyCameraAllowed(state.settings, state.study))
      throw new Error('Camera consent is required for calibration.');
    const update = settingsSchema
      .pick({ blinkThreshold: true, baseline: true, distanceBaseline: true })
      .partial()
      .strict()
      .refine((v) => Object.keys(v).length > 0 && Object.values(v).every((field) => field !== null))
      .parse(value);
    if (
      update.baseline &&
      (update.baseline.version !== 2 || update.baseline.model !== state.settings.visionMode)
    )
      throw new Error('Calibrate using the selected pose model.');
    // Merge only numeric calibration fields; an in-flight save must never restore revoked consent.
    if (hasStudy(state.study)) {
      if (
        (update.baseline && !state.study.config.posture) ||
        (update.blinkThreshold && !state.study.config.blinks) ||
        (update.distanceBaseline && !state.study.config.distance)
      )
        throw new Error('This calibration is not selected for the current session.');
      state.study.calibration = {
        ...state.study.calibration,
        ...(update.baseline ? { baseline: update.baseline } : {}),
        ...(update.blinkThreshold ? { blinkThreshold: update.blinkThreshold } : {}),
        ...(update.distanceBaseline ? { distanceBaseline: update.distanceBaseline } : {}),
      };
    } else {
      state.settings = { ...state.settings, ...update };
      store.set('settings', state.settings);
    }
    visionAlerts.resetEvidence();
    if (state.engine.pending?.source === 'vision') {
      state.engine.pending = null;
      void syncPopup();
    }
    persist();
    return emit();
  });
  handle('settings', (value) => {
    const s = settingsSchema.parse(value) as Settings;
    if (
      hasStudy(state.study) &&
      state.study.config.posture &&
      s.visionMode !== state.settings.visionMode
    )
      throw new Error('End the study session before changing its pose model.');
    if (state.settings.cameraConsent && !s.cameraConsent && hasStudy(state.study))
      state.study.cameraAuthorized = false;
    if (s.visionMode !== state.settings.visionMode) s.baseline = null;
    if (
      s.baseline?.calibratedAt !== state.settings.baseline?.calibratedAt ||
      s.distanceBaseline?.calibratedAt !== state.settings.distanceBaseline?.calibratedAt ||
      s.distanceHoldSeconds !== state.settings.distanceHoldSeconds ||
      s.distanceScale !== state.settings.distanceScale
    ) {
      visionAlerts.resetEvidence();
      if (state.engine.pending?.source === 'vision') {
        state.engine.pending = null;
        void syncPopup();
      }
    }
    for (const t of reminderTypes)
      if (
        intervalMs(t, s) !== intervalMs(t, state.settings) ||
        s.enabled[t] !== state.settings.enabled[t]
      )
        state.engine.nextDue[t] = Date.now() + intervalMs(t, s);
    state.settings = s;
    store.set('settings', s);
    persist();
    updateLogin(s.startAtLogin);
    if (cameraOn && !studyCameraAllowed(s, state.study)) stopCamera();
    return emit();
  });
  handle('focus', (m) => {
    const minutes = z.number().min(0).max(180).nullable().parse(m);
    if (hasStudy(state.study) && minutes !== null)
      throw new Error('Use Pause in your study session before changing focus plans.');
    const r = setFocus(state.engine, state.settings, minutes, Date.now());
    state.engine = r.state;
    logEvents(r.events);
    persist();
    void syncPopup();
    return emit();
  });
  handle('reminder', (value, expectedId) => {
    const action = z.enum(['now', 'skip', 'off', 'snooze5', 'snooze10', 'snooze15']).parse(value);
    if (
      !state.engine.pending ||
      (expectedId !== undefined && state.engine.pending.id !== expectedId)
    )
      return snapshot();
    const type = state.engine.pending?.type;
    if (
      action === 'now' &&
      (type === 'eyes' || type === 'stretch') &&
      state.study?.status === 'running'
    ) {
      state.study = actStudy(state.study, { type: 'pause' }, Date.now());
      state.study.pauseReason = 'Paused for your guided exercises. Resume when you’re ready.';
      stopCamera();
    }
    if (state.engine.pending?.source === 'session' && state.study) {
      const reminder = state.engine.pending;
      state.engine.pending = null;
      if (action.startsWith('snooze'))
        state.study.notices.push({
          ...reminder,
          id: reminder.id + '-snooze',
          createdAt: Date.now() + Number(action.slice(6)) * 60000,
        });
      else if (action === 'off') state.engine.disabledToday[reminder.type] = dayKey();
      else if (action === 'now') {
        store.log('reminder-accepted', 1, 'study-' + reminder.type);
        if (reminder.type === 'water') store.log('water', 1, 'Study session reminder');
        else {
          if (win.isMinimized()) win.restore();
          win.show();
        }
      }
      store.log('study-reminder-' + action, 1, reminder.type);
      persist();
      void syncPopup();
      return emit();
    }
    const r = act(state.engine, state.settings, action, Date.now());
    state.engine = r.state;
    logEvents(r.events);
    persist();
    if (action === 'now' && type !== 'water') {
      if (win.isMinimized()) win.restore();
      win.show();
    }
    void syncPopup();
    return emit();
  });
  handle('event', (t, v, d) => {
    const type = z
      .enum(['break-complete', 'posture-check', 'exercise-complete', 'breathing-complete'])
      .parse(t);
    const value = z.number().min(0).max(3600).parse(v);
    const detail = z.string().max(200).parse(d);
    store.log(type, value, detail);
    if (type === 'break-complete') {
      for (const kind of ['break', 'eyes', 'stretch', 'posture'] as const)
        state.engine.nextDue[kind] = Date.now() + intervalMs(kind, state.settings);
      persist();
    }
    return emit();
  });
  handle('water', () => {
    store.log('water', 1, 'Manual log');
    state.engine.nextDue.water = Date.now() + intervalMs('water', state.settings);
    if (state.engine.pending?.type === 'water') state.engine.pending = null;
    persist();
    void syncPopup();
    return emit();
  });
  handle('export', async (f, d) => {
    const format = z.enum(['csv', 'pdf']).parse(f),
      days = z.number().int().min(1).max(365).parse(d);
    const result = await dialog.showSaveDialog(win, {
      title: 'Save your ScreenWell report',
      defaultPath: path.join(
        app.getPath('documents'),
        `ScreenWell-${days === 1 ? 'daily' : 'weekly'}-${new Date().toISOString().slice(0, 10)}.${format}`,
      ),
      filters: [
        { name: format === 'pdf' ? 'PDF document' : 'CSV spreadsheet', extensions: [format] },
      ],
    });
    if (result.canceled || !result.filePath) return null;
    const events = store.events(days + 1).filter((e) => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (days - 1));
      return e.at >= start.getTime();
    });
    if (format === 'csv')
      await fs.promises.writeFile(result.filePath, csvReport(events, state.demo), 'utf8');
    else
      await fs.promises.writeFile(
        result.filePath,
        await pdfReport(
          events,
          state.settings,
          days,
          await fs.promises.readFile(path.join(root, 'fonts/NotoSans-Regular.ttf')),
          state.demo,
        ),
      );
    return result.filePath;
  });
  handle('vision', (value) => {
    if (!cameraOn || !studyCameraAllowed(state.settings, state.study)) return;
    let m = z
      .object({
        blinksPerMinute: z.number().min(0).max(300).nullable(),
        totalBlinks: z.number().int().min(0).max(1000000),
        posture: z.number().min(0).max(100).nullable(),
        present: z.boolean(),
        issues: z.array(z.string().max(40)).max(10),
        quality: z.enum(['clear', 'no-face', 'lighting', 'turned', 'multiple', 'settling']),
        distanceState: z.enum(['unknown', 'comfortable', 'close']),
        confidence: z.number().min(0).max(100).nullable().optional(),
        distanceRatio: z.number().min(0.05).max(20).nullable().optional(),
        closeSeconds: z.number().min(0).max(36000).optional(),
      })
      .parse(value);
    const now = Date.now();
    const running = state.study?.status === 'running' ? state.study : null;
    const step = running?.steps[running.index];
    const tracking = cameraTracking.observe(
      m.quality,
      m.present,
      now,
      !!running,
      running && step?.kind === 'rest' && running.deadline !== null
        ? {
            stepIndex: running.index,
            start: running.deadline - step.seconds * 1000,
            end: running.deadline,
          }
        : undefined,
    );
    const recordedAway = recordAway(tracking.interval);
    const selection = studyVisionSelection(state.study),
      effective = studySettings(state.settings, state.study);
    m = {
      ...m,
      quality: tracking.quality,
      blinksPerMinute: selection.blinks ? m.blinksPerMinute : null,
      totalBlinks: selection.blinks ? m.totalBlinks : 0,
      posture: selection.posture ? m.posture : null,
      distanceState: selection.distance ? m.distanceState : 'unknown',
      issues: m.issues.filter((issue) =>
        issue === 'eyes closed' ? selection.blinks : selection.posture,
      ),
    };
    lastVisionPacket = now;
    latestMonitor = {
      ...m,
      distanceRatio: selection.distance ? m.distanceRatio : null,
      closeSeconds: selection.distance ? m.closeSeconds : 0,
    };
    let blinkChanged = false;
    if (hasStudy(state.study)) {
      const delta = selection.blinks
        ? Math.max(0, m.totalBlinks - state.study.lastVisionBlinks)
        : 0;
      state.study.lastVisionBlinks = m.totalBlinks;
      if (
        state.study.status === 'running' &&
        state.study.steps[state.study.index]?.kind === 'study' &&
        delta > 0 &&
        m.present &&
        m.quality === 'clear'
      ) {
        state.study.blinks += delta;
        blinkChanged = true;
      }
    }
    if (now - lastMetricAt >= 15000) {
      lastMetricAt = now;
      if (
        m.present &&
        m.quality === 'clear' &&
        (!hasStudy(state.study) ||
          (state.study.status === 'running' &&
            state.study.steps[state.study.index]?.kind === 'study'))
      ) {
        if (m.blinksPerMinute !== null)
          store.log('blink-rate', m.blinksPerMinute, 'Observed minute');
        if (m.posture !== null) {
          store.log('posture-score', m.posture, 'Personal baseline');
          if (hasStudy(state.study) && state.study.status === 'running') {
            state.study.postureTotal += m.posture;
            state.study.postureSamples++;
          }
        }
      }
      emit();
    } else if (recordedAway || blinkChanged) emit();
    const pending = state.engine.pending;
    const recovered =
      recoveredDistance.observe(
        pending?.reason === 'distance' &&
          m.quality === 'clear' &&
          m.distanceState === 'comfortable',
        now,
      ) >= 2000;
    if (
      pending?.source === 'vision' &&
      (!m.present ||
        m.quality !== 'clear' ||
        recovered ||
        (pending.reason === 'posture' && m.posture !== null && m.posture >= 80))
    ) {
      state.engine.pending = null;
      store.log('vision-resolved', 1, pending.reason ?? pending.type);
      persist();
      emit();
      void syncPopup();
    }
    const can = (type: 'posture' | 'eyes' | 'break') =>
      (hasStudy(state.study)
        ? state.study.status === 'running' &&
          now < (state.study.deadline ?? Infinity) &&
          state.study.steps[state.study.index]?.kind === 'study' &&
          state.engine.disabledToday[type] !== dayKey(now) &&
          (type === 'posture' ? selection.posture || selection.distance : selection.blinks)
        : mayRemind(state.engine, state.settings, type, now)) &&
      now >= (state.engine.visionSnoozeUntil?.[type] ?? 0);
    const reason = visionAlerts.observe(m, effective, now, can('posture'), can('eyes'));
    const type =
      reason === 'distance' || reason === 'posture'
        ? 'posture'
        : reason === 'eyes-closed'
          ? 'break'
          : reason === 'low-blink'
            ? 'eyes'
            : null;
    if (reason && type && !state.engine.pending && can(type)) {
      state.engine.pending = {
        id: `vision-${reason}-${now}`,
        type,
        reason,
        createdAt: now,
        source: 'vision',
        soft: true,
      };
      visionAlerts.delivered(reason, now);
      store.log('vision-alert', 1, type);
      if (reason === 'distance') store.log('distance-alert', 1, 'Sustained proximity');
      persist();
      emit();
      void syncPopup();
    }
  });
  handle('suggest', (v) => {
    const accept = z.boolean().parse(v);
    const type = state.engine.suggestion;
    if (type && accept) {
      state.settings = {
        ...state.settings,
        ...(type === 'water'
          ? { waterInterval: Math.min(240, state.settings.waterInterval + 15) }
          : { interval: Math.min(240, state.settings.interval + 15) }),
      };
      store.set('settings', state.settings);
      for (const t of reminderTypes)
        state.engine.nextDue[t] = Date.now() + intervalMs(t, state.settings);
    }
    if (type) state.engine.skipStreak[type] = 0;
    state.engine.suggestion = null;
    persist();
    return emit();
  });
  handle('feedback', (value) => {
    store.feedback(z.string().trim().min(1).max(2000).parse(value));
  });
  handle('demo', (value) => {
    const on = z.boolean().parse(value);
    if (on === state.demo) return snapshot();
    stopCamera();
    if (on) {
      persist();
      store = new Store(':memory:');
      const settings = {
        ...state.settings,
        name: 'Alex',
        onboarded: true,
        cameraConsent: false,
        baseline: null,
        distanceBaseline: null,
        blinkThreshold: null,
        quietEnabled: false,
        startAtLogin: false,
      };
      state.settings = settings;
      state.engine = createEngine(settings);
      state.demo = true;
      state.study = null;
      seedDemo(store, settings);
      store.set('settings', settings);
      state.engine.nextDue.break = Date.now() + 15000;
    } else {
      store.close();
      store = realStore;
      const settings = store.settings();
      state.settings = settings;
      state.engine = store.engine() ?? createEngine(settings);
      state.engine.lastTick = Date.now() - 120000;
      state.demo = false;
      state.study = recoverStudy(store.get('study'), Date.now());
    }
    persist();
    void syncPopup();
    return emit();
  });
  handle('demo-reminder', (value) => {
    if (!state.demo) throw new Error('Only available in labelled demo mode');
    const type = z.enum(['break', 'water', 'stretch', 'eyes', 'posture']).parse(value);
    if (!mayRemind(state.engine, state.settings, type, Date.now())) return snapshot();
    state.engine.pending = {
      id: `demo-${Date.now()}`,
      type,
      createdAt: Date.now(),
      source: 'timer',
      soft: false,
    };
    persist();
    void syncPopup();
    return emit();
  });
  ipcMain.on('activity', (event) => {
    if (event.sender === win.webContents) lastActivity = Date.now();
  });
  handle('delete-data', async () => {
    const result = await dialog.showMessageBox(win, {
      type: 'warning',
      title: 'Delete your ScreenWell data?',
      message: 'Delete your profile, daily priorities, history, calibration, and local feedback?',
      detail: 'This cannot be undone. ScreenWell will return to the welcome screen.',
      buttons: ['Keep my data', 'Delete everything'],
      defaultId: 0,
      cancelId: 0,
    });
    if (result.response === 1) {
      stopCamera();
      if (state.demo) {
        store.close();
        store = realStore;
        state.demo = false;
      }
      updateLogin(false);
      store.clear();
      const s = store.settings();
      state.settings = s;
      state.engine = createEngine(s);
      state.study = null;
      persist();
      void syncPopup();
    }
    return emit();
  });
  handle('camera', (on) => {
    const allowed = z.boolean().parse(on) && studyCameraAllowed(state.settings, state.study);
    if (cameraOn) recordAway(cameraTracking.interrupt());
    cameraOn = allowed;
    cameraTracking = new CameraTracking();
    latestMonitor = null;
    if (cameraOn && hasStudy(state.study)) state.study.lastVisionBlinks = 0;
    win.webContents.setBackgroundThrottling(!cameraOn);
    lastVisionPacket = Date.now();
    if (!cameraOn) {
      latestMonitor = null;
      visionAlerts = new VisionAlerts();
      recoveredDistance.reset();
      if (state.engine.pending?.source === 'vision') {
        state.engine.pending = null;
        persist();
        void syncPopup();
      }
      win.webContents.send('camera-off');
    }
    emit();
  });
  win.on('focus', () => {
    if (popup && !popup.isDestroyed() && win.isVisible() && !win.isMinimized()) popup.hide();
  });
  win.on('minimize', () => {
    if (cameraOn) win.webContents.setBackgroundThrottling(false);
    emit();
    void syncPopup();
  });
  win.on('restore', () => emit());
  await win.loadURL('screenwell://app/');
  timer = setInterval(() => {
    if (cameraOn) publishMonitor();
    if (publishedDay !== dayKey()) {
      publishedDay = dayKey();
      emit();
    }
    if (cameraOn && Date.now() - lastVisionPacket > 2500) {
      if (recordAway(cameraTracking.interrupt())) emit();
      visionAlerts.resetEvidence();
      if (state.engine.pending?.source === 'vision') {
        state.engine.pending = null;
        persist();
        emit();
        void syncPopup();
      }
    }
    if (
      state.study &&
      (hasStudy(state.study) ||
        state.study.notices.length ||
        state.engine.pending?.source === 'session')
    ) {
      const previous = state.study,
        result = tickStudy(previous, Date.now());
      state.study = result.session;
      if (result.phaseChanged) {
        state.engine.pending = null;
        visionAlerts.resetEvidence();
        if (
          previous.status === 'running' &&
          result.session.completedStudySeconds > previous.completedStudySeconds
        )
          store.log(
            'focus-complete',
            previous.steps[previous.index].seconds / 60,
            'Guided study block',
          );
        if (result.session.status === 'completed') finishStudy();
        if (!result.session.cameraAuthorized) stopCamera();
      }
      const notice = syncStudyNotices();
      if (result.changed || notice) {
        persist();
        emit();
        void syncPopup();
      } else if (Math.floor(Date.now() / 1000) % 15 === 0) persist();
      if (
        hasStudy(state.study) ||
        state.study.notices.length ||
        state.engine.pending?.source === 'session'
      ) {
        updateTaskbar?.(state);
        return;
      }
    }
    const result = tick(state.engine, state.settings, Date.now(), lastActivity);
    state.engine = result.state;
    logEvents(result.events);
    if (result.changed) {
      persist();
      emit();
      void syncPopup();
    } else if (Math.floor(Date.now() / 1000) % 15 === 0) persist();
    updateTaskbar?.(state);
  }, 1000);
}
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const settingsSchema = z.object({
  onboarded: z.boolean(),
  name: z.string().trim().min(1).max(50),
  ageGroup: z.string().max(30),
  course: z.string().max(100),
  screenHours: z.string().max(30),
  glasses: z.string().max(10),
  device: z.string().max(30),
  style: z.enum(['popup', 'small', 'fullscreen']),
  interval: z.number().min(1).max(240),
  preset: z.enum(['balanced', '202020', 'pomodoro', 'custom']),
  quietStart: time,
  quietEnd: time,
  quietEnabled: z.boolean(),
  activeStart: time,
  activeEnd: time,
  theme: z.enum(['light', 'dark', 'system']),
  palette: z.enum([
    'aurora',
    'lagoon',
    'sunset',
    'orchid',
    'citrus',
    'forest',
    'cobalt',
    'nebula',
    'sakura',
    'custom',
  ]),
  primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  companionColor: z.string().regex(/^#[0-9a-f]{6}$/i),
  motionLevel: z.enum(['off', 'gentle', 'expressive']),
  ambientEffects: z.boolean(),
  fontScale: z.number().min(0.9).max(1.3),
  contrast: z.boolean(),
  reducedMotion: z.boolean(),
  startAtLogin: z.boolean(),
  sound: z.boolean(),
  voice: z.boolean(),
  autoDelay: z.boolean(),
  waterGoal: z.number().int().min(1).max(30),
  waterInterval: z.number().min(5).max(240),
  enabled: z.object({
    break: z.boolean(),
    water: z.boolean(),
    stretch: z.boolean(),
    eyes: z.boolean(),
    posture: z.boolean(),
  }),
  cameraConsent: z.boolean(),
  showPreview: z.boolean(),
  blinkThreshold: z.number().min(0.05).max(0.6).nullable(),
  baseline: z
    .object({
      faceSize: z.number(),
      headOffset: z.number(),
      shoulderY: z.number(),
      tilt: z.number(),
      lean: z.number(),
      version: z.literal(2).optional(),
      neckLength: z.number().optional(),
      shoulderSlope: z.number().optional(),
      headPitch: z.number().optional(),
      worldSpace: z.boolean().optional(),
      model: z.enum(['lite', 'full', 'heavy']).optional(),
      calibratedAt: z.number().optional(),
    })
    .nullable(),
  visionMode: z.enum(['lite', 'full', 'heavy']),
  distanceBaseline: z
    .object({
      version: z.literal(2),
      calibratedAt: z.number().min(0),
      faceSize: z.number().positive().max(2),
      eyeSpan: z.number().positive().max(2),
      faceHeight: z.number().positive().max(2),
      yaw: z.number().min(-180).max(180),
      pitch: z.number().min(-180).max(180),
      roll: z.number().min(-180).max(180),
    })
    .nullable(),
  distanceHoldSeconds: z.number().min(3).max(30),
  distanceScale: z.number().min(1.1).max(1.6),
  distanceCooldownSeconds: z.number().min(15).max(600),
  lowBlinkRate: z.number().min(1).max(30),
  postureHoldSeconds: z.number().min(5).max(120),
  cooldownMinutes: z.number().min(1).max(60),
});
app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.show();
  }
});
app.on('before-quit', () => {
  quitting = true;
  desktopDelivery.clear();
  cameraOn = false;
  clearInterval(timer);
  if (store) {
    recordAway(cameraTracking.interrupt());
    if (hasStudy(state.study)) state.study = actStudy(state.study, { type: 'pause' }, Date.now());
    persist();
    store.close();
    if (state.demo) realStore.close();
  }
});
app.on('window-all-closed', () => {
  if (testing) app.quit();
});
if (gotLock)
  app
    .whenReady()
    .then(boot)
    .catch((error) => {
      console.error('ScreenWell startup failed:', error);
      dialog.showErrorBox(
        'ScreenWell could not start',
        error instanceof Error ? error.message : 'Unknown startup error',
      );
      app.exit(1);
    });
