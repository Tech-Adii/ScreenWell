import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Baseline,
  Settings,
  VisionMetrics,
  FaceMeasurement,
  TrackingQuality,
  DistanceState,
  VisionSelection,
} from '../shared/types';
import { studySettings } from '../shared/study';
import { trackingMessages } from '../shared/monitor';
import {
  Point,
  calibratedThreshold,
  calibrateDistance,
  calibratePosture as stablePostureBaseline,
} from '../vision/math';
import { BlinkTracker } from '../vision/blink';
import { visionConfig as cfg } from '../vision/config';
import { poseModels } from '../vision/models';
import { Dwell } from '../vision/posture';
import { acquireCamera } from '../vision/acquire';
const initial: VisionMetrics = {
  blinksPerMinute: null,
  totalBlinks: 0,
  posture: null,
  present: false,
  message: 'Camera off. Timers are here for you.',
  issues: [],
  ear: 0,
  baseline: null,
  ready: false,
  quality: 'no-face',
  faceMeasurement: null,
  distanceRatio: null,
  distanceState: 'unknown',
  closeSeconds: 0,
  inferenceMs: 0,
  confidence: null,
};
export function useVision(
  settings: Settings,
  selection: VisionSelection = { blinks: true, posture: true, distance: true },
) {
  const [on, setOn] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [metrics, setMetrics] = useState(initial),
    [calibration, setCalibration] = useState<number | null>(null);
  const [positionCalibration, setPositionCalibration] = useState<{
    kind: 'posture' | 'distance';
    left: number;
  } | null>(null);
  const [calibrationMessage, setCalibrationMessage] = useState('');
  const [aspect, setAspect] = useState(4 / 3);
  const position = useRef<{
    kind: 'posture' | 'distance';
    begun: number;
    since: number;
    faces: FaceMeasurement[];
    poses: Baseline[];
  } | null>(null);
  const closeDwell = useRef(new Dwell());
  const mode = useRef(settings.visionMode);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const worker = useRef<Worker | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const startupTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(settings);
  latest.current = settings;
  const selected = useRef(selection);
  selected.current = selection;
  const capture = useRef<HTMLVideoElement | null>(null);
  const samples = useRef<number[]>([]);
  const calibrationAt = useRef<number | null>(null);
  const busy = useRef(false);
  const lastPersist = useRef(0);
  const lastFrameResult = useRef(0);
  const tracker = useRef(new BlinkTracker());
  const generation = useRef(0);
  const starting = useRef(false);
  const stop = useCallback(() => {
    generation.current++;
    starting.current = false;
    if (startupTimeout.current) clearTimeout(startupTimeout.current);
    if (interval.current) clearInterval(interval.current);
    interval.current = null;
    worker.current?.terminate();
    worker.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
    if (capture.current) capture.current.srcObject = null;
    capture.current = null;
    busy.current = false;
    setOn(false);
    setLoading(false);
    setMetrics(initial);
    setCalibration(null);
    setCalibrationMessage('');
    calibrationAt.current = null;
    position.current = null;
    setPositionCalibration(null);
    closeDwell.current.reset();
    void window.screenwell.camera(false).catch(() => {});
  }, []);
  useEffect(() => {
    return window.screenwell.onCameraOff(() => {
      if (!stream.current && !worker.current && !starting.current) return;
      const requestGeneration = generation.current;
      // An acknowledgement from an earlier Stop must not stop a newer camera session.
      void window.screenwell
        .snapshot()
        .then((snapshot) => {
          if (
            requestGeneration === generation.current &&
            !snapshot.privacy.cameraOn &&
            (stream.current || worker.current || starting.current)
          )
            stop();
        })
        .catch(() => {
          if (requestGeneration === generation.current) stop();
        });
    });
  }, [stop]);
  useEffect(() => {
    worker.current?.postMessage({ kind: 'settings', settings, selection });
    if (!settings.cameraConsent && (stream.current || worker.current || starting.current)) stop();
    if (worker.current && mode.current !== settings.visionMode) {
      stop();
      setError('Camera model changed. Start the camera again and recalibrate posture.');
    }
  }, [settings, stop, selection.blinks, selection.posture, selection.distance]);
  useEffect(
    () => () => {
      generation.current++;
      starting.current = false;
      if (interval.current) clearInterval(interval.current);
      if (startupTimeout.current) clearTimeout(startupTimeout.current);
      worker.current?.terminate();
      stream.current?.getTracks().forEach((t) => t.stop());
      void window.screenwell.camera(false).catch(() => {});
    },
    [],
  );
  const start = async () => {
    if (!latest.current.cameraConsent || stream.current || starting.current) return;
    starting.current = true;
    const run = ++generation.current;
    setError('');
    setLoading(true);
    tracker.current = new BlinkTracker();
    samples.current = [];
    closeDwell.current.reset();
    startupTimeout.current = setTimeout(() => {
      if (run === generation.current) {
        stop();
        setError(
          'Camera startup took too long. Check your camera and try again; timers still work.',
        );
      }
    }, 30000);
    try {
      await window.screenwell.camera(true);
      const media = await acquireCamera(
        () =>
          navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: cfg.width },
              height: { ideal: cfg.height },
              frameRate: { ideal: cfg.fps, max: 10 },
            },
            audio: false,
          }),
        () => run === generation.current && latest.current.cameraConsent,
      );
      if (run !== generation.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      for (const track of media.getVideoTracks())
        track.onended = () => {
          if (run !== generation.current) return;
          stop();
          setError('The camera disconnected. Timers are still working.');
        };
      capture.current = document.createElement('video');
      capture.current.muted = true;
      capture.current.srcObject = media;
      await capture.current.play();
      if (run !== generation.current) return;
      mode.current = latest.current.visionMode;
      setAspect(capture.current.videoWidth / capture.current.videoHeight || 4 / 3);
      setOn(true);
      const w = new Worker('screenwell://app/vision-worker.js');
      worker.current = w;
      w.onerror = () => {
        stop();
        setError(
          'Camera analysis could not load. Check the local model files and restart ScreenWell.',
        );
      };
      w.onmessage = (
        e: MessageEvent<{
          kind: string;
          confidence?: number | null;
          message?: string;
          ear: number | null;
          present: boolean;
          score: number | null;
          issues: string[];
          baseline: Baseline | null;
          face: Point[];
          pose: Point[];
          multiple: boolean;
          fps: number;
          quality: TrackingQuality;
          faceMeasurement: FaceMeasurement | null;
          distanceRatio: number | null;
          distanceState: DistanceState;
          inferenceMs: number;
        }>,
      ) => {
        if (run !== generation.current) return;
        const result = e.data;
        if (result.kind === 'error') {
          stop();
          setError('Camera analysis could not start. Your reminders still work.');
          return;
        }
        if (result.kind === 'ready') {
          starting.current = false;
          lastFrameResult.current = Date.now();
          if (startupTimeout.current) clearTimeout(startupTimeout.current);
          setLoading(false);
          if (selected.current.blinks && !latest.current.blinkThreshold) {
            calibrationAt.current = Date.now();
            samples.current = [];
            setCalibration(10);
          }
          interval.current = setInterval(() => {
            if (Date.now() - lastFrameResult.current > 8000) {
              stop();
              setError(
                'Camera analysis stopped responding. Your reminders still work. Start the camera again when you’re ready.',
              );
              return;
            }
            const v = capture.current;
            if (!v || v.readyState < 2 || busy.current) return;
            busy.current = true;
            void createImageBitmap(v, { resizeWidth: cfg.width })
              .then((bitmap) => {
                if (run !== generation.current || !worker.current) {
                  bitmap.close();
                  busy.current = false;
                  return;
                }
                worker.current.postMessage(
                  { kind: 'frame', bitmap, timestamp: performance.now() },
                  [bitmap],
                );
              })
              .catch(() => {
                busy.current = false;
              });
          }, 1000 / poseModels[mode.current].fps);
          return;
        }
        if (result.kind !== 'result') return;
        lastFrameResult.current = Date.now();
        busy.current = false;
        const now = Date.now();
        const calibrationStep = position.current;
        if (calibrationStep) {
          const f = result.faceMeasurement;
          const valid =
            result.quality === 'clear' &&
            f &&
            Math.abs(f.yaw) <= cfg.maxCalibratingYaw &&
            Math.abs(f.pitch) <= cfg.maxCalibratingPitch &&
            (calibrationStep.kind === 'distance' || result.baseline);
          if (!valid) {
            calibrationStep.faces = [];
            calibrationStep.poses = [];
            calibrationStep.since = now;
          } else {
            calibrationStep.faces.push(f);
            if (result.baseline) calibrationStep.poses.push(result.baseline);
          }
          const left = Math.max(
            0,
            Math.ceil((cfg.calibrationHoldMs - (now - calibrationStep.since)) / 1000),
          );
          setPositionCalibration({ kind: calibrationStep.kind, left });
          if (now - calibrationStep.begun > cfg.calibrationTimeoutMs) {
            position.current = null;
            setPositionCalibration(null);
            setError(
              'Calibration paused: keep one face clearly visible and hold a comfortable, steady position. Then try again.',
            );
          } else if (left === 0) {
            position.current = null;
            setPositionCalibration(null);
            const distanceBaseline = selected.current.distance
                ? calibrateDistance(calibrationStep.faces, now)
                : null,
              baseline =
                calibrationStep.kind === 'posture'
                  ? stablePostureBaseline(calibrationStep.poses, latest.current.visionMode, now)
                  : latest.current.baseline;
            if (
              (selected.current.distance ? !!distanceBaseline : true) &&
              (calibrationStep.kind === 'distance' || baseline)
            ) {
              const updated = { ...latest.current, baseline, distanceBaseline };
              latest.current = updated;
              closeDwell.current.reset();
              void window.screenwell
                .calibration({
                  ...(distanceBaseline ? { distanceBaseline } : {}),
                  ...(calibrationStep.kind === 'posture' && baseline ? { baseline } : {}),
                })
                .then((snapshot) => {
                  if (run !== generation.current) return;
                  latest.current = studySettings(snapshot.settings, snapshot.study);
                  setCalibrationMessage(
                    calibrationStep.kind === 'posture'
                      ? selected.current.distance
                        ? 'Comfortable posture and screen distance saved.'
                        : 'Comfortable posture saved for this session.'
                      : 'Comfortable screen distance saved.',
                  );
                })
                .catch(() => {
                  if (run === generation.current)
                    setError('Couldn’t save calibration. Please try again.');
                });
            } else
              setError(
                'The view moved too much for a stable calibration. Keep the camera still and hold your comfortable position for four seconds.',
              );
          }
        }
        if (selected.current.blinks && calibrationAt.current !== null) {
          if (result.quality === 'clear' && result.ear !== null) samples.current.push(result.ear);
          const left = Math.max(0, 10 - Math.floor((now - calibrationAt.current) / 1000));
          setCalibration(left);
          if (left === 0) {
            const threshold = calibratedThreshold(samples.current);
            calibrationAt.current = null;
            setCalibration(null);
            if (threshold) {
              const updated = { ...latest.current, blinkThreshold: threshold };
              latest.current = updated;
              void window.screenwell
                .calibration({ blinkThreshold: threshold })
                .then((snapshot) => {
                  if (run === generation.current)
                    latest.current = studySettings(snapshot.settings, snapshot.study);
                })
                .catch(() => {
                  if (run === generation.current)
                    setError('Couldn’t save calibration. Try calibrating again.');
                });
            } else
              setError(
                'Calibration needs a clear view of your eyes. Face a soft light and try again.',
              );
          }
        }
        const blink = selected.current.blinks
          ? tracker.current.update(
              result.quality === 'clear' ? result.ear : null,
              now,
              latest.current.blinkThreshold ?? cfg.defaultEarThreshold,
            )
          : { rate: null, total: 0, longClosure: false };
        const message =
          result.quality !== 'clear'
            ? trackingMessages[result.quality]
            : !result.present
              ? 'No clear face found. Try softer front lighting, or return when you’re ready.'
              : !selected.current.posture
                ? selected.current.blinks
                  ? 'Blink tracking is active. Posture checks are off for this session.'
                  : 'Screen-distance tracking is active. Blink and posture checks are off.'
                : !result.baseline
                  ? 'Keep your shoulders in view for posture checks.'
                  : !latest.current.baseline
                    ? 'Sit comfortably straight, then calibrate your posture.'
                    : result.issues.length
                      ? result.issues.includes('head tilt')
                        ? 'Gently bring your head toward your comfortable centre.'
                        : result.issues.includes('head angle')
                          ? 'Bring your head toward a comfortable, level position.'
                          : result.issues.includes('forward head')
                            ? 'Gently bring your head back over your shoulders.'
                            : 'Let your back and shoulders return to your comfortable position.'
                      : result.multiple
                        ? 'Using the largest face. Please keep one person in view for posture calibration.'
                        : 'Nice, you’re sitting well ✅';
        const next: VisionMetrics = {
          blinksPerMinute:
            calibrationAt.current !== null || !latest.current.blinkThreshold ? null : blink.rate,
          totalBlinks: blink.total,
          posture: selected.current.posture ? result.score : null,
          present: result.present,
          message: blink.longClosure
            ? 'Your eyes have been closed a while. A short break may help.'
            : message,
          issues: blink.longClosure ? [...result.issues, 'eyes closed'] : result.issues,
          ear: result.ear ?? 0,
          baseline: selected.current.posture ? result.baseline : null,
          ready: true,
          quality: position.current ? 'settling' : result.quality,
          faceMeasurement: result.faceMeasurement,
          distanceRatio: selected.current.distance ? result.distanceRatio : null,
          distanceState: selected.current.distance ? result.distanceState : 'unknown',
          closeSeconds:
            closeDwell.current.observe(
              selected.current.distance &&
                !position.current &&
                result.quality === 'clear' &&
                result.distanceState === 'close',
              now,
            ) / 1000,
          inferenceMs: result.inferenceMs,
          confidence: result.confidence ?? null,
        };
        setMetrics(next);
        const ctx = canvas.current?.getContext('2d');
        if (ctx && canvas.current) {
          ctx.clearRect(0, 0, 640, 480);
          ctx.fillStyle = '#c1ee8e';
          for (const point of [...result.face, ...result.pose]) {
            ctx.beginPath();
            ctx.arc(point.x * 640, point.y * 480, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        if (now - lastPersist.current >= 250) {
          lastPersist.current = now;
          void window.screenwell.vision(next).catch(() => {});
        }
      };
      w.postMessage({ kind: 'init', settings: latest.current, selection: selected.current });
    } catch (e) {
      if (run !== generation.current) return;
      stop();
      const name = e instanceof Error ? e.name : '';
      setError(
        name === 'NotAllowedError'
          ? window.screenwell.platform === 'darwin'
            ? 'Camera permission was denied. Allow ScreenWell in System Settings → Privacy & Security → Camera, then quit and reopen it. Timers still work.'
            : window.screenwell.platform === 'win32'
              ? 'Camera permission was denied. You can allow it in Windows privacy settings. Timers still work.'
              : 'Camera permission was denied. Check your desktop camera permissions. Timers still work.'
          : name === 'NotFoundError'
            ? 'No camera found. You can keep using ScreenWell with timers.'
            : name === 'NotReadableError'
              ? 'Your camera may be in use by another app. Try closing it there first.'
              : 'Couldn’t start the camera. Check your device and try again.',
      );
    }
  };
  const calibrateEyes = () => {
    if (!metrics.ready || !selected.current.blinks) return;
    samples.current = [];
    tracker.current = new BlinkTracker();
    calibrationAt.current = Date.now();
    setCalibration(10);
    setError('');
  };
  const beginPositionCalibration = (kind: 'posture' | 'distance') => {
    if (
      (kind === 'posture' && !selected.current.posture) ||
      (kind === 'distance' && !selected.current.distance)
    )
      return;
    if (
      !metrics.ready ||
      metrics.quality !== 'clear' ||
      (kind === 'posture' && !metrics.baseline)
    ) {
      setError(
        'Keep one clear face in view' +
          (kind === 'posture' ? ' with both shoulders visible.' : '.'),
      );
      return;
    }
    position.current = { kind, begun: Date.now(), since: Date.now(), faces: [], poses: [] };
    setPositionCalibration({ kind, left: 4 });
    setCalibrationMessage('');
    setError('');
  };
  const calibratePosture = async () => beginPositionCalibration('posture');
  const calibrateScreenDistance = () => beginPositionCalibration('distance');
  const attachPreview = () => {
    if (video.current && stream.current) {
      video.current.srcObject = stream.current;
      void video.current.play().catch(() => {});
    }
  };
  return {
    on,
    loading,
    error,
    metrics,
    calibration,
    video,
    canvas,
    start,
    stop,
    calibrateEyes,
    calibratePosture,
    attachPreview,
    positionCalibration,
    calibrationMessage,
    calibrateScreenDistance,
    aspect,
  };
}
export type VisionController = ReturnType<typeof useVision>;
