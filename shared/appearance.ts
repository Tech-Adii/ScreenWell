import { Settings, PaletteName } from './types';
export interface Palette {
  id: Exclude<PaletteName, 'custom'>;
  name: string;
  description: string;
  primary: string;
  companion: string;
}
export const palettes: Palette[] = [
  {
    id: 'cobalt',
    name: 'Cobalt',
    description: 'Blue hour & warm amber',
    primary: '#4778e8',
    companion: '#efb66e',
  },
  {
    id: 'nebula',
    name: 'Nebula',
    description: 'Cosmic violet & sky blue',
    primary: '#b65cdd',
    companion: '#47bbef',
  },
  {
    id: 'sakura',
    name: 'Sakura',
    description: 'Rose petals & morning sky',
    primary: '#dc658e',
    companion: '#8bb8fa',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Violet skies & fresh mint',
    primary: '#7964ef',
    companion: '#2fcbb4',
  },
  {
    id: 'lagoon',
    name: 'Lagoon',
    description: 'Ocean blue & turquoise',
    primary: '#247fe2',
    companion: '#22c7b8',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm coral & soft violet',
    primary: '#ed725c',
    companion: '#a78bed',
  },
  {
    id: 'orchid',
    name: 'Orchid',
    description: 'Electric lilac & rose',
    primary: '#a26cf0',
    companion: '#ee87b5',
  },
  {
    id: 'citrus',
    name: 'Citrus',
    description: 'Lime light & golden hour',
    primary: '#9cbb37',
    companion: '#f2b550',
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Evergreen & meadow',
    primary: '#31856d',
    companion: '#a6c966',
  },
];
export function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}
export function mix(a: string, b: string, amount: number): string {
  const left = rgb(a),
    right = rgb(b);
  return (
    '#' +
    left
      .map((v, i) =>
        Math.round(v + (right[i] - v) * amount)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
export function luminance(hex: string): number {
  const values = rgb(hex).map((v) => {
    const n = v / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}
export function contrast(a: string, b: string): number {
  const l = luminance(a),
    r = luminance(b);
  return (Math.max(l, r) + 0.05) / (Math.min(l, r) + 0.05);
}
export function readableOn(background: string): string {
  const white = contrast('#ffffff', background),
    ink = contrast('#101522', background);
  if (white >= 4.5 && white >= ink) return '#ffffff';
  if (ink >= 4.5) return '#101522';
  return white >= 4.5 ? '#ffffff' : '#000000';
}
export function readableAccent(accent: string, surface: string | string[], minimum = 4.5): string {
  const surfaces = Array.isArray(surface) ? surface : [surface];
  if (surfaces.every((background) => contrast(accent, background) >= minimum)) return accent;
  const target = readableOn(surfaces[0]);
  for (let n = 1; n <= 40; n++) {
    const color = mix(accent, target, n / 40);
    if (surfaces.every((background) => contrast(color, background) >= minimum)) return color;
  }
  return target;
}
export function chosenColors(
  settings: Pick<Settings, 'palette' | 'primaryColor' | 'companionColor'>,
) {
  const palette = palettes.find((p) => p.id === settings.palette);
  return {
    primary: palette?.primary ?? settings.primaryColor,
    companion: palette?.companion ?? settings.companionColor,
  };
}
export function themeTokens(
  settings: Pick<Settings, 'palette' | 'primaryColor' | 'companionColor' | 'contrast'>,
  dark: boolean,
): Record<string, string> {
  const { primary, companion } = chosenColors(settings);
  const bg = mix(dark ? '#090e1b' : '#f8f9ff', primary, dark ? 0.055 : 0.025),
    surface = mix(dark ? '#141b2b' : '#ffffff', primary, dark ? 0.035 : 0.005),
    raised = mix(dark ? '#1b2538' : '#ffffff', primary, 0.035);
  const accentSoft = mix(surface, primary, dark ? 0.16 : 0.085),
    secondarySoft = mix(surface, companion, dark ? 0.12 : 0.09),
    heroStart = mix(surface, primary, dark ? 0.18 : 0.105),
    heroEnd = mix(surface, companion, dark ? 0.11 : 0.13),
    surfaces = [bg, surface, raised, accentSoft, secondarySoft, heroStart, heroEnd];
  const ink = dark ? '#eff2ff' : '#20263d',
    muted = settings.contrast ? ink : readableAccent(dark ? '#acb7d0' : '#667086', surfaces);
  const accentInk = readableAccent(primary, surfaces),
    secondaryInk = readableAccent(companion, surfaces);
  return {
    '--bg': bg,
    '--surface': surface,
    '--surface-raised': raised,
    '--ink': ink,
    '--muted': muted,
    '--line': settings.contrast
      ? dark
        ? '#73829e'
        : '#7e889e'
      : mix(surface, dark ? '#74809d' : '#6d7998', dark ? 0.2 : 0.17),
    '--accent': primary,
    '--accent-ink': accentInk,
    '--on-accent': readableOn(primary),
    '--secondary': companion,
    '--secondary-ink': secondaryInk,
    '--on-secondary': readableOn(companion),
    '--accent-rgb': rgb(primary).join(', '),
    '--secondary-rgb': rgb(companion).join(', '),
    '--accent-soft': accentSoft,
    '--secondary-soft': secondarySoft,
    '--green': accentInk,
    '--soft': mix(surface, primary, dark ? 0.12 : 0.06),
    '--shadow': dark ? '0 12px 40px #00000022' : '0 8px 30px #25326c06',
    '--hero-start': heroStart,
    '--hero-end': heroEnd,
    '--art-leaf': mix(primary, dark ? '#e2deff' : '#d8f9df', dark ? 0.5 : 0.64),
    '--art-line': dark ? '#28233d' : mix(primary, '#182c35', 0.7),
    '--warning-bg': dark ? '#332d27' : '#fff4df',
    '--warning-ink': dark ? '#edc787' : '#8b651c',
    '--error-ink': dark ? '#f2a593' : '#a54336',
    '--chart-grid': mix(surface, dark ? '#74809d' : '#6d7998', 0.15),
    '--chart-a': accentInk,
    '--chart-b': secondaryInk,
  };
}
