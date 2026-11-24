import { TrackingQuality } from '../shared/types';
export function signalConfidence(input: {
  quality: TrackingQuality;
  yaw: number;
  pitch: number;
  facePixels: number;
  lightMean: number | null;
  lightDetail: number | null;
  poseVisibility?: number | null;
}): number | null {
  if (input.quality !== 'clear') return null;
  const clamp = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);
  const angle = clamp(1 - Math.abs(input.yaw) / 70) * clamp(1 - Math.abs(input.pitch) / 90);
  const framing = clamp(input.facePixels / 150);
  const lighting =
    input.lightMean === null
      ? 0
      : clamp(Math.min(input.lightMean / 65, (255 - input.lightMean) / 55)) *
        clamp((input.lightDetail ?? 0) / 22);
  const visibility = input.poseVisibility == null ? 1 : clamp(input.poseVisibility);
  return Math.round(100 * Math.min(angle, framing, lighting, visibility));
}
