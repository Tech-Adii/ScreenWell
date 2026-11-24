import { VisionMode } from '../shared/types';
export const poseModels: Record<VisionMode, { file: string; fps: number; label: string }> = {
  lite: { file: 'pose_landmarker_lite.task', fps: 8, label: 'Lightweight' },
  full: { file: 'pose_landmarker_full.task', fps: 6, label: 'Balanced accuracy' },
  heavy: { file: 'pose_landmarker_heavy.task', fps: 5, label: 'Highest model detail' },
};
