import { contextBridge, ipcRenderer } from 'electron';
import type { ScreenWellAPI, Snapshot } from '../shared/types';
const invoke = (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args);
const api: ScreenWellAPI = {
  platform:
    process.platform === 'darwin' ? 'darwin' : process.platform === 'win32' ? 'win32' : 'other',
  snapshot: () => invoke('snapshot'),
  speak: (text) => invoke('speak', text),
  onSpeak: (cb) => {
    const listener = (_e: Electron.IpcRendererEvent, text: string | null) => cb(text);
    ipcRenderer.on('speak', listener);
    return () => ipcRenderer.removeListener('speak', listener);
  },
  checkNotifications: () => invoke('check-notifications'),
  plan: (action) => invoke('plan', action),
  startStudy: (config) => invoke('study-start', config),
  studyPreset: (action) => invoke('study-preset', action),
  studyAction: (action) => invoke('study-action', action),
  calibration: (update) => invoke('calibration', update),
  settings: (s) => invoke('settings', s),
  focus: (m) => invoke('focus', m),
  reminder: (a, expectedId) => invoke('reminder', a, expectedId),
  water: () => invoke('water'),
  event: (t, v, d) => invoke('event', t, v, d),
  vision: (m) => invoke('vision', m),
  camera: (on) => invoke('camera', on),
  export: (f, d) => invoke('export', f, d),
  deleteData: () => invoke('delete-data'),
  feedback: (t) => invoke('feedback', t),
  demo: (on) => invoke('demo', on),
  suggest: (a) => invoke('suggest', a),
  activity: () => ipcRenderer.send('activity'),
  demoReminder: (t) => invoke('demo-reminder', t),
  onChange: (cb) => {
    const listener = (_e: Electron.IpcRendererEvent, s: Snapshot) => cb(s);
    ipcRenderer.on('changed', listener);
    return () => ipcRenderer.removeListener('changed', listener);
  },
  onMonitor: (cb) => {
    const listener = (
      _e: Electron.IpcRendererEvent,
      monitor: import('../shared/types').LiveMonitor,
    ) => cb(monitor);
    ipcRenderer.on('monitor', listener);
    return () => ipcRenderer.removeListener('monitor', listener);
  },
  onCameraOff: (cb) => {
    ipcRenderer.on('camera-off', cb);
    return () => ipcRenderer.removeListener('camera-off', cb);
  },
  onWindowActivity: (cb) => {
    let listening = true;
    const listener = (_e: Electron.IpcRendererEvent, active: boolean) => cb(active);
    ipcRenderer.on('window-activity', listener);
    void invoke('window-activity')
      .then((active) => {
        if (listening) cb(active);
      })
      .catch(() => {});
    return () => {
      listening = false;
      ipcRenderer.removeListener('window-activity', listener);
    };
  },
};
contextBridge.exposeInMainWorld('screenwell', api);
