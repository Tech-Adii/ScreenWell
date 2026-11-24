import { FaceLandmarker, FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { Settings, TrackingQuality, VisionSelection } from '../shared/types';
import { faceEar, largestFace, measureFace, measurePosture } from './math';
import { PostureFilter, ProximityFilter } from './posture';
import { poseModels } from './models';
import { visionConfig as cfg } from './config';
import { signalConfidence } from './confidence';
let face: FaceLandmarker | null = null,
  pose: PoseLandmarker | null = null,
  settings: Settings;
let selection: VisionSelection = { blinks: true, posture: true, distance: true };
const postureFilter = new PostureFilter(),
  proximityFilter = new ProximityFilter();
const lightCanvas = new OffscreenCanvas(32, 24),
  lightContext = lightCanvas.getContext('2d', { willReadFrequently: true });
let previousFace: { x: number; y: number; size: number } | null = null,
  lastFrame = 0,
  stableFrames = 0;
type Message =
  | { kind: 'init'; settings: Settings; selection?: VisionSelection }
  | { kind: 'settings'; settings: Settings; selection?: VisionSelection }
  | { kind: 'frame'; bitmap: ImageBitmap; timestamp: number };
self.onmessage = async (event: MessageEvent<Message>) => {
  const m = event.data;
  try {
    if (m.kind === 'settings') {
      if (
        settings &&
        (settings.baseline?.calibratedAt !== m.settings.baseline?.calibratedAt ||
          settings.distanceBaseline?.calibratedAt !== m.settings.distanceBaseline?.calibratedAt ||
          settings.distanceScale !== m.settings.distanceScale)
      ) {
        postureFilter.reset();
        proximityFilter.reset();
      }
      settings = m.settings;
      if (m.selection) selection = m.selection;
      return;
    }
    if (m.kind === 'init') {
      settings = m.settings;
      if (m.selection) selection = m.selection;
      const model = poseModels[settings.visionMode];
      const files = await FilesetResolver.forVisionTasks('screenwell://app/wasm', false);
      face = await FaceLandmarker.createFromOptions(files, {
        baseOptions: {
          modelAssetPath: 'screenwell://app/models/face_landmarker.task',
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
        numFaces: 2,
        minFaceDetectionConfidence: 0.7,
        minFacePresenceConfidence: 0.7,
        minTrackingConfidence: 0.7,
        outputFacialTransformationMatrixes: true,
      });
      pose = selection.posture
        ? await PoseLandmarker.createFromOptions(files, {
            baseOptions: {
              modelAssetPath: 'screenwell://app/models/' + model.file,
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.7,
            minPosePresenceConfidence: 0.7,
            minTrackingConfidence: 0.7,
            outputSegmentationMasks: false,
          })
        : null;
      self.postMessage({ kind: 'ready', fps: model.fps });
      return;
    }
    if (!face) return;
    const started = performance.now(),
      f = face.detectForVideo(m.bitmap, m.timestamp),
      p = selection.posture ? pose?.detectForVideo(m.bitmap, m.timestamp) : null;
    const largest = largestFace(f.faceLandmarks),
      index = largest ? f.faceLandmarks.findIndex((v) => v === largest) : -1;
    const aspect = m.bitmap.width / m.bitmap.height,
      measured = largest
        ? measureFace(largest, f.facialTransformationMatrixes[index]?.data ?? [], aspect)
        : null;
    let lightMean: number | null = null,
      lightDetail: number | null = null;
    let quality: TrackingQuality = !largest
      ? 'no-face'
      : f.faceLandmarks.length > 1
        ? 'multiple'
        : !measured
          ? 'turned'
          : 'clear';
    if (measured && (Math.abs(measured.yaw) > 30 || Math.abs(measured.pitch) > 40))
      quality = 'turned';
    if (lightContext && (quality === 'clear' || quality === 'no-face')) {
      let x = 0,
        y = 0,
        width = m.bitmap.width,
        height = m.bitmap.height;
      if (largest) {
        const xs = largest.map((v) => v.x),
          ys = largest.map((v) => v.y);
        x = Math.max(0, Math.min(...xs)) * m.bitmap.width;
        y = Math.max(0, Math.min(...ys)) * m.bitmap.height;
        width = Math.max(1, Math.min(1, Math.max(...xs)) * m.bitmap.width - x);
        height = Math.max(1, Math.min(1, Math.max(...ys)) * m.bitmap.height - y);
      }
      lightContext.drawImage(m.bitmap, x, y, width, height, 0, 0, 32, 24);
      const pixels = lightContext.getImageData(0, 0, 32, 24).data;
      let total = 0,
        squared = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const luma = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
        total += luma;
        squared += luma * luma;
      }
      const mean = total / (pixels.length / 4),
        std = Math.sqrt(Math.max(0, squared / (pixels.length / 4) - mean * mean));
      lightMean = mean;
      lightDetail = std;
      if (
        (mean < cfg.lowLightMean || mean > cfg.blownLightMean) &&
        (!largest || std < cfg.lowDetailStd)
      )
        quality = 'lighting';
    }
    if (quality === 'no-face' && (!lightContext || p?.landmarks.length)) quality = 'turned';
    const center =
      largest && measured ? { x: largest[1].x, y: largest[1].y, size: measured.faceSize } : null;
    const jumped = !!(
      center &&
      previousFace &&
      (Math.hypot((center.x - previousFace.x) * aspect, center.y - previousFace.y) > 0.2 ||
        Math.max(center.size / previousFace.size, previousFace.size / center.size) > 1.6)
    );
    if (quality !== 'clear' || jumped || m.timestamp - lastFrame > cfg.maxTrackingGapMs) {
      stableFrames = 0;
      postureFilter.reset();
      proximityFilter.reset();
    }
    if (quality === 'clear') {
      stableFrames++;
      if (stableFrames < cfg.settleFrames) quality = 'settling';
    }
    previousFace = center;
    lastFrame = m.timestamp;
    const body = p?.landmarks[0],
      world = p?.worldLandmarks[0] ?? [];
    const matched =
      largest &&
      body &&
      Math.hypot((largest[1].x - body[0].x) * aspect, largest[1].y - body[0].y) < 0.18;
    const reliable = quality === 'clear';
    const baseline =
      selection.posture && reliable && matched
        ? measurePosture(largest, body, world, measured, aspect)
        : null;
    const posture = postureFilter.update(
      baseline,
      settings.baseline?.model === settings.visionMode ? settings.baseline : null,
      m.timestamp,
    );
    const proximity = proximityFilter.update(
      selection.distance && reliable ? measured : null,
      settings.distanceBaseline,
      settings.distanceScale,
      m.timestamp,
    );
    self.postMessage({
      kind: 'result',
      ear: selection.blinks && largest ? faceEar(largest, aspect) : null,
      present: !!largest,
      baseline,
      score: posture.score,
      issues: posture.issues,
      faceMeasurement: reliable ? measured : null,
      quality,
      distanceRatio: proximity.ratio,
      distanceState: proximity.state,
      inferenceMs: performance.now() - started,
      confidence: measured
        ? signalConfidence({
            quality,
            yaw: measured.yaw,
            pitch: measured.pitch,
            facePixels: measured.faceHeight * m.bitmap.height,
            lightMean,
            lightDetail,
            poseVisibility: selection.posture
              ? matched
                ? Math.min(
                    ...[0, 11, 12].map((i) =>
                      Math.min(body?.[i]?.visibility ?? 0, body?.[i]?.presence ?? 1),
                    ),
                  )
                : 0
              : null,
          })
        : null,
      face: largest?.filter((_, i) => [1, 33, 133, 263, 362, 152, 10].includes(i)) ?? [],
      pose: (body ?? []).filter((_, i) => [0, 7, 8, 11, 12].includes(i)),
      multiple: f.faceLandmarks.length > 1,
    });
  } catch (error) {
    self.postMessage({
      kind: 'error',
      message: error instanceof Error ? error.message : 'Camera analysis could not start.',
    });
  } finally {
    if (m.kind === 'frame') m.bitmap.close();
  }
};
