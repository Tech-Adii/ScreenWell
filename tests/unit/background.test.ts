import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { DesktopDelivery, parseWindowsSetting } from '../../main/notifications';
import { monitorReading, relativeDistance, MonitorPacket } from '../../shared/monitor';
import { signalConfidence } from '../../vision/confidence';
import { acquireCamera } from '../../vision/acquire';
import { createStudy, actStudy } from '../../engine/study';
import {
  defaultStudyConfig,
  studySettings,
  studyReady,
  studyVisionSelection,
} from '../../shared/study';
import { defaults } from '../../shared/defaults';
import { Reminder, WindowsNotificationSetting } from '../../shared/types';
const reminder: Reminder = {
  id: 'one',
  type: 'posture',
  createdAt: 100,
  source: 'vision',
  reason: 'posture',
  soft: true,
};
class Toast extends EventEmitter {
  show = vi.fn();
  close = vi.fn();
}
function delivery(setting: WindowsNotificationSetting = 'Enabled', supported = true) {
  const toast = new Toast(),
    changed = vi.fn(),
    open = vi.fn(),
    create = vi.fn(() => toast);
  return {
    manager: new DesktopDelivery({
      readSetting: async () => setting,
      supported: () => supported,
      create,
      changed,
      open,
    }),
    toast,
    changed,
    open,
    create,
  };
}
describe('Windows notifications and independent popup fallback', () => {
  it('uses macOS wording without claiming notification permission is granted', async () => {
    const toast = new Toast();
    const manager = new DesktopDelivery({
      osName: 'macOS',
      readSetting: async () => 'unknown',
      supported: () => true,
      create: () => toast,
      changed: vi.fn(),
      open: vi.fn(),
    });
    await manager.notify(reminder);
    expect(manager.status.native).toBe('requested');
    expect(manager.status.setting).toBe('unknown');
    expect(manager.status.message).toContain('macOS');
    expect(manager.status.message).not.toContain('Windows');
    toast.emit('failed', {}, 'Permission denied');
    expect(manager.status.message).toContain('macOS could not show');
  });
  it.each([
    'DisabledForApplication',
    'DisabledForUser',
    'DisabledByGroupPolicy',
    'DisabledByManifest',
  ] as const)('recognizes %s without attempting another toast', async (setting) => {
    const { manager, create } = delivery(setting);
    await manager.notify(reminder);
    expect(manager.status.native).toBe('blocked');
    expect(manager.status.message).toContain('ScreenWell');
    expect(create).not.toHaveBeenCalled();
  });
  it('keeps unknown distinct from blocked, deduplicates and handles native failure', async () => {
    const { manager, toast, create } = delivery('unknown');
    await manager.notify(reminder);
    await manager.notify(reminder);
    expect(create).toHaveBeenCalledTimes(1);
    expect(manager.status.native).toBe('requested');
    expect(manager.status.message).toContain('unavailable');
    toast.emit('failed', {}, 'test failure');
    expect(manager.status.native).toBe('failed');
    expect(manager.status.message).toContain('popup');
  });
  it('handles unsupported notifications and synchronous native errors', async () => {
    const unavailable = delivery('Enabled', false);
    await unavailable.manager.notify(reminder);
    expect(unavailable.manager.status.native).toBe('unavailable');
    const failing = delivery();
    failing.toast.show.mockImplementation(() => {
      throw new Error('native failure');
    });
    await failing.manager.notify(reminder);
    expect(failing.manager.status.native).toBe('failed');
  });
  it('ignores late notification callbacks after dismiss or replacement', async () => {
    const first = delivery();
    await first.manager.notify(reminder);
    first.manager.clear();
    first.toast.emit('click');
    first.toast.emit('failed', {}, 'late');
    expect(first.open).not.toHaveBeenCalled();
    expect(first.manager.status.native).toBe('requested');
    let resolve!: (s: WindowsNotificationSetting) => void;
    const changed = vi.fn(),
      manager = new DesktopDelivery({
        readSetting: () => new Promise((r) => (resolve = r)),
        supported: () => true,
        create: () => new Toast(),
        changed,
        open: vi.fn(),
      });
    const pending = manager.notify(reminder);
    manager.clear();
    resolve('DisabledForUser');
    await pending;
    expect(manager.status.native).toBe('checking');
  });
  it('only accepts documented Windows status values', () => {
    expect(parseWindowsSetting('Enabled\r\n')).toBe('Enabled');
    expect(parseWindowsSetting('Permission denied')).toBe('unknown');
  });
});
describe('bounded camera startup recovery', () => {
  it('retries a transient busy camera once', async () => {
    const camera = { id: 'test' },
      acquire = vi
        .fn()
        .mockRejectedValueOnce(new DOMException('Busy', 'NotReadableError'))
        .mockResolvedValue(camera),
      pause = vi.fn(async () => {});
    expect(await acquireCamera(acquire, () => true, pause)).toBe(camera);
    expect(acquire).toHaveBeenCalledTimes(2);
    expect(pause).toHaveBeenCalledWith(500);
  });
  it('never retries a permission denial', async () => {
    const acquire = vi.fn().mockRejectedValue(new DOMException('Denied', 'NotAllowedError')),
      pause = vi.fn(async () => {});
    await expect(acquireCamera(acquire, () => true, pause)).rejects.toMatchObject({
      name: 'NotAllowedError',
    });
    expect(acquire).toHaveBeenCalledTimes(1);
    expect(pause).not.toHaveBeenCalled();
  });
  it('does not reopen a camera after consent is withdrawn during the delay', async () => {
    let active = true;
    const acquire = vi.fn().mockRejectedValue(new DOMException('Busy', 'NotReadableError'));
    await expect(
      acquireCamera(
        acquire,
        () => active,
        async () => {
          active = false;
        },
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(acquire).toHaveBeenCalledTimes(1);
  });
  it('does not loop if the second attempt is also busy', async () => {
    const acquire = vi.fn().mockRejectedValue(new DOMException('Busy', 'NotReadableError'));
    await expect(
      acquireCamera(
        acquire,
        () => true,
        async () => {},
      ),
    ).rejects.toMatchObject({ name: 'NotReadableError' });
    expect(acquire).toHaveBeenCalledTimes(2);
  });
  it('does not acquire after cancellation', async () => {
    const acquire = vi.fn();
    await expect(acquireCamera(acquire, () => false)).rejects.toMatchObject({ name: 'AbortError' });
    expect(acquire).not.toHaveBeenCalled();
  });
});
describe('fresh and scoped live readings', () => {
  const packet: MonitorPacket = {
    posture: 65,
    quality: 'clear',
    issues: ['head tilt'],
    present: true,
    blinksPerMinute: 18,
    totalBlinks: 12,
    distanceState: 'close',
    confidence: 86,
    distanceRatio: 1.25,
    closeSeconds: 10,
  };
  const all = { blinks: true, posture: true, distance: true };
  it('shows measured confidence, position, session count and relative distance', () => {
    const live = monitorReading(packet, all, true, 1000, 1500, true, 24);
    expect(live.confidence).toBe(86);
    expect(live.position).toBe('head tilt');
    expect(live.blinks).toBe(24);
    expect(live.background).toBe(true);
    expect(relativeDistance(live.distanceRatio)).toBe('20% closer than baseline');
  });
  it('clears stale or unclear estimates rather than retaining a good score', () => {
    for (const p of [packet, { ...packet, quality: 'lighting' as const }]) {
      const live = monitorReading(p, all, true, 1000, p === packet ? 3501 : 1100, true);
      expect(live.confidence).toBeNull();
      expect(live.posture).toBeNull();
      expect(live.distanceRatio).toBeNull();
    }
    expect(monitorReading(packet, all, false, 1000, 1100, false).position).toBe('Camera off');
  });
  it('does not reveal unchecked statistics', () => {
    const live = monitorReading(
      packet,
      { blinks: false, posture: false, distance: false },
      true,
      1000,
      1100,
      true,
    );
    expect(live.posture).toBeNull();
    expect(live.blinks).toBeNull();
    expect(live.distanceRatio).toBeNull();
    expect(live.position).toBe('Posture check off');
  });
  it('describes inverse face scale without invented centimetres', () => {
    expect(relativeDistance(0.8)).toBe('25% farther than baseline');
    expect(relativeDistance(1)).toBe('Near your calibrated distance');
    expect(relativeDistance(null)).toContain('Calibrate');
  });
  it('supports distance-only calibration and retains other camera choices independently', () => {
    let s = createStudy(
      { ...defaultStudyConfig, distance: true, cameraConsent: true },
      'distance',
      1000,
    );
    expect(s.status).toBe('preparing');
    expect(studyReady(s)).toBe(false);
    s.calibration.distanceBaseline = {
      version: 2,
      calibratedAt: 1000,
      faceSize: 0.3,
      eyeSpan: 0.2,
      faceHeight: 0.4,
      yaw: 0,
      pitch: 0,
      roll: 0,
    };
    expect(studyReady(s)).toBe(true);
    expect(studyVisionSelection(s)).toEqual({ blinks: false, posture: false, distance: true });
    expect(studySettings(defaults, s).distanceBaseline).not.toBeNull();
    s = actStudy(s, { type: 'without-camera' }, 1100);
    expect(s.config.distance).toBe(false);
  });
});
describe('signal confidence is a transparent quality estimate', () => {
  const clear = {
    quality: 'clear' as const,
    yaw: 0,
    pitch: 0,
    facePixels: 200,
    lightMean: 128,
    lightDetail: 35,
    poseVisibility: 0.83,
  };
  it('uses actual visibility and lowers confidence with poor light, tiny faces or head rotation', () => {
    expect(signalConfidence(clear)).toBe(83);
    expect(signalConfidence({ ...clear, lightMean: 10 })).toBeLessThan(20);
    expect(signalConfidence({ ...clear, facePixels: 30 })).toBe(20);
    expect(signalConfidence({ ...clear, yaw: 30 })).toBeLessThan(60);
  });
  it('withholds a percentage for an unreliable view', () => {
    expect(signalConfidence({ ...clear, quality: 'no-face' })).toBeNull();
    expect(signalConfidence({ ...clear, quality: 'multiple' })).toBeNull();
  });
});
