import { useEffect, useState } from 'react';
import { Settings } from '../shared/types';
import { themeTokens } from '../shared/appearance';
export function applyAppearance(
  settings: Settings,
  dark: boolean,
  systemReduced = false,
  root = document.documentElement,
) {
  for (const [key, value] of Object.entries(themeTokens(settings, dark)))
    root.style.setProperty(key, value);
  const motion = settings.reducedMotion || systemReduced ? 'off' : settings.motionLevel;
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.palette = settings.palette;
  root.dataset.motion = String(motion !== 'off');
  root.dataset.motionLevel = motion;
  root.dataset.ambient = String(settings.ambientEffects && !settings.contrast);
  root.dataset.contrast = String(settings.contrast);
  root.style.fontSize = `${16 * settings.fontScale}px`;
  root.style.colorScheme = dark ? 'dark' : 'light';
}
export function useAppearance(settings: Settings, animateWhenVisible = false) {
  const {
    theme,
    palette,
    primaryColor,
    companionColor,
    motionLevel,
    ambientEffects,
    reducedMotion,
    contrast,
    fontScale,
  } = settings;
  useEffect(() => {
    const scheme = matchMedia('(prefers-color-scheme: dark)'),
      reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const paint = () =>
      applyAppearance(
        {
          ...settings,
          theme,
          palette,
          primaryColor,
          companionColor,
          motionLevel,
          ambientEffects,
          reducedMotion,
          contrast,
          fontScale,
        },
        theme === 'dark' || (theme === 'system' && scheme.matches),
        reduced.matches,
      );
    paint();
    scheme.addEventListener('change', paint);
    reduced.addEventListener('change', paint);
    return () => {
      scheme.removeEventListener('change', paint);
      reduced.removeEventListener('change', paint);
    };
  }, [
    theme,
    palette,
    primaryColor,
    companionColor,
    motionLevel,
    ambientEffects,
    reducedMotion,
    contrast,
    fontScale,
  ]);
  useEffect(() => {
    let nativeActive: boolean | undefined;
    const activity = () => {
      document.documentElement.dataset.active = String(
        nativeActive !== false &&
          document.visibilityState === 'visible' &&
          (animateWhenVisible || document.hasFocus()),
      );
    };
    const unsubscribe = window.screenwell.onWindowActivity((active) => {
      nativeActive = active;
      activity();
    });
    activity();
    window.addEventListener('focus', activity);
    window.addEventListener('blur', activity);
    document.addEventListener('visibilitychange', activity);
    return () => {
      unsubscribe();
      window.removeEventListener('focus', activity);
      window.removeEventListener('blur', activity);
      document.removeEventListener('visibilitychange', activity);
    };
  }, [animateWhenVisible]);
}
export function useSystemReducedMotion() {
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}
