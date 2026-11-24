import { LiveMonitor, TrackingQuality, VisionMetrics, VisionSelection } from './types';
export const trackingMessages: Record<TrackingQuality, string> = {
  clear: '',
  'no-face': 'No face in view. Show your face to resume camera checks.',
  lighting:
    'The image is too dark or washed out. The camera keeps running and checks resume when the image is usable.',
  turned: 'Face the screen with your whole face visible to resume camera checks.',
  multiple: 'Camera checks resume when only one face is in view.',
  settling: 'Waiting for a steady view before resuming camera checks.',
};
export type MonitorPacket = Pick<
  VisionMetrics,
  'posture' | 'quality' | 'issues' | 'present' | 'blinksPerMinute' | 'totalBlinks' | 'distanceState'
> & { confidence?: number | null; distanceRatio?: number | null; closeSeconds?: number };
export function monitorReading(
  packet: MonitorPacket | null,
  selection: VisionSelection,
  cameraOn: boolean,
  at: number,
  now: number,
  background: boolean,
  blinks?: number,
): LiveMonitor {
  const fresh = cameraOn && !!packet && now >= at && now - at <= 2500,
    clear = fresh && packet!.present && packet!.quality === 'clear';
  const issues =
    clear && selection.posture
      ? packet!.issues.filter((i) => !['eyes closed', 'sitting close'].includes(i))
      : [];
  return {
    at,
    fresh,
    trackingPaused: cameraOn && !clear,
    trackingMessage: !fresh
      ? 'Waiting for fresh frames. Study and reminder timers keep running.'
      : clear
        ? ''
        : trackingMessages[packet!.quality === 'clear' ? 'no-face' : packet!.quality],
    background,
    cameraOn,
    confidence:
      clear && Number.isFinite(packet!.confidence)
        ? Math.round(Math.max(0, Math.min(100, packet!.confidence!)))
        : null,
    posture: clear && selection.posture ? packet!.posture : null,
    position: !cameraOn
      ? 'Camera off'
      : !fresh
        ? 'Waiting for fresh camera data'
        : !clear
          ? 'View unclear · estimates paused'
          : selection.posture
            ? packet!.posture === null
              ? 'Keep shoulders visible · check posture calibration'
              : issues.length
                ? issues.join(' · ')
                : 'Comfortable posture'
            : 'Posture check off',
    blinks: selection.blinks && cameraOn ? (blinks ?? packet?.totalBlinks ?? 0) : null,
    rate: clear && selection.blinks ? packet!.blinksPerMinute : null,
    distanceRatio:
      clear &&
      selection.distance &&
      Number.isFinite(packet!.distanceRatio) &&
      packet!.distanceRatio! > 0
        ? packet!.distanceRatio!
        : null,
    distanceState: clear && selection.distance ? packet!.distanceState : 'unknown',
    closeSeconds: clear && selection.distance ? (packet!.closeSeconds ?? 0) : 0,
  };
}
export function relativeDistance(ratio: number | null): string {
  if (ratio === null || !Number.isFinite(ratio) || ratio <= 0)
    return 'Calibrate or restore a clear view';
  const change = (1 / ratio - 1) * 100;
  return Math.abs(change) < 5
    ? 'Near your calibrated distance'
    : `${Math.round(Math.abs(change))}% ${change < 0 ? 'closer' : 'farther'} than baseline`;
}
