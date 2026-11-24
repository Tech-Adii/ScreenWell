import { execFile } from 'node:child_process';
import { NotificationDelivery, WindowsNotificationSetting, Reminder } from '../shared/types';
import { labels } from '../shared/defaults';
export function parseWindowsSetting(value: string): WindowsNotificationSetting {
  return (
    (
      [
        'Enabled',
        'DisabledForApplication',
        'DisabledForUser',
        'DisabledByGroupPolicy',
        'DisabledByManifest',
      ] as const
    ).find((v) => v === value.trim()) ?? 'unknown'
  );
}
export function readWindowsNotificationSetting(): Promise<WindowsNotificationSetting> {
  if (process.platform !== 'win32') return Promise.resolve('unknown');
  const script =
    "$ErrorActionPreference='Stop'; [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime] > $null; [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('in.screenwell.desktop').Setting.ToString()";
  return new Promise((resolve) =>
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', script],
      { windowsHide: true, timeout: 3500, maxBuffer: 2048 },
      (error, stdout) => resolve(error ? 'unknown' : parseWindowsSetting(stdout)),
    ),
  );
}
interface NativeToast {
  on(event: 'failed', callback: (event: unknown, error: string) => void): NativeToast;
  on(event: 'click', callback: () => void): NativeToast;
  show(): void;
  close(): void;
}
export class DesktopDelivery {
  status: NotificationDelivery = {
    native: 'idle',
    setting: 'unknown',
    message: 'ScreenWell desktop popups are ready.',
  };
  private id: string | null = null;
  private toast: NativeToast | null = null;
  private generation = 0;
  constructor(
    private deps: {
      osName?: 'Windows' | 'macOS';
      supported: () => boolean;
      readSetting: () => Promise<WindowsNotificationSetting>;
      create: (title: string, body: string) => NativeToast;
      changed: () => void;
      open: () => void;
    },
  ) {}
  clear() {
    this.generation++;
    this.id = null;
    try {
      this.toast?.close();
    } catch {
      /* The OS may already have dismissed it. */
    }
    this.toast = null;
  }
  async notify(reminder: Reminder) {
    const os = this.deps.osName ?? 'Windows';
    if (this.id === reminder.id) return;
    this.clear();
    this.id = reminder.id;
    const run = this.generation;
    this.status = {
      native: 'checking',
      setting: 'unknown',
      message: `ScreenWell popup active · checking ${os} notification support.`,
    };
    this.deps.changed();
    let setting: WindowsNotificationSetting = 'unknown';
    try {
      setting = await this.deps.readSetting();
    } catch {
      /* A portable app may not be registered. */
    }
    if (run !== this.generation) return;
    if (setting.startsWith('Disabled')) {
      this.status = {
        native: 'blocked',
        setting,
        message: `${os} notifications are blocked. ScreenWell is showing this desktop popup.`,
      };
      this.deps.changed();
      return;
    }
    if (!this.deps.supported()) {
      this.status = {
        native: 'unavailable',
        setting,
        message: `${os} notifications are unavailable. ScreenWell desktop popup is active.`,
      };
      this.deps.changed();
      return;
    }
    try {
      const title =
        reminder.reason === 'distance'
          ? 'Move back a little'
          : reminder.reason === 'study-rest'
            ? 'Your study block is up'
            : reminder.reason === 'study-exercise'
              ? 'Time for a little movement'
              : reminder.reason === 'study-finished'
                ? 'Study session complete'
                : labels[reminder.type];
      const toast = this.deps.create(
        title,
        'Open ScreenWell for your reminder, live camera readings and snooze controls.',
      );
      this.toast = toast;
      toast.on('failed', () => {
        if (run !== this.generation) return;
        this.status = {
          native: 'failed',
          setting,
          message: `${os} could not show the native alert. ScreenWell desktop popup is active.`,
        };
        this.deps.changed();
      });
      toast.on('click', () => {
        if (run === this.generation) this.deps.open();
      });
      this.status = {
        native: 'requested',
        setting,
        message:
          setting === 'unknown'
            ? `${os} delivery status is unavailable. ScreenWell desktop popup stays visible.`
            : `${os} alert requested · ScreenWell desktop popup stays visible, including when ${os} silences banners.`,
      };
      this.deps.changed();
      toast.show();
    } catch {
      if (run === this.generation) {
        this.status = {
          native: 'failed',
          setting,
          message: `${os} could not show the native alert. ScreenWell desktop popup is active.`,
        };
        this.deps.changed();
      }
    }
  }
}
