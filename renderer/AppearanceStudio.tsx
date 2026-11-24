import { CSSProperties } from 'react';
import {
  Check,
  Leaf,
  Monitor,
  Moon,
  Palette,
  SlidersHorizontal,
  Sun,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { Settings } from '../shared/types';
import { chosenColors, palettes, themeTokens } from '../shared/appearance';
import { Toggle } from './components';
import { useSystemReducedMotion } from './useAppearance';
export const appearanceKeys = [
  'theme',
  'palette',
  'primaryColor',
  'companionColor',
  'motionLevel',
  'ambientEffects',
  'reducedMotion',
  'contrast',
  'fontScale',
] as const;
export function AppearanceStudio({
  draft,
  onChange,
  apply,
  busy,
}: {
  draft: Settings;
  onChange: (s: Settings) => void;
  apply: () => void;
  busy: boolean;
}) {
  const colors = chosenColors(draft),
    valid =
      /^#[0-9a-f]{6}$/i.test(draft.primaryColor) && /^#[0-9a-f]{6}$/i.test(draft.companionColor);
  const dark =
      draft.theme === 'dark' ||
      (draft.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches),
    systemReduced = useSystemReducedMotion();
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...draft, [key]: value });
  const customize = (key: 'primaryColor' | 'companionColor', value: string) =>
    onChange({
      ...draft,
      palette: 'custom',
      primaryColor: colors.primary,
      companionColor: colors.companion,
      [key]: value,
    });
  return (
    <section className="appearance-studio card" aria-label="Appearance studio">
      <div className="studio-title">
        <span className="studio-symbol">
          <Palette size={23} />
        </span>
        <div>
          <p className="eyebrow">A SPACE WITH YOUR COLOURS</p>
          <h2>Make it feel like you.</h2>
          <p>Pick a mood. Mix your colours. Find your kind of calm.</p>
        </div>
        <span className="studio-label">
          <Sparkles size={13} />
          YOUR CREATIVE SPACE
        </span>
      </div>
      <div className="studio-layout">
        <div className="studio-controls">
          <label className="studio-field-label">Set the light</label>
          <div className="theme-mode-options" role="group" aria-label="Colour mode">
            {(
              [
                ['light', 'Light', Sun],
                ['dark', 'Dark', Moon],
                ['system', window.screenwell.platform === 'darwin' ? 'macOS' : 'Windows', Monitor],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                type="button"
                key={id}
                aria-pressed={draft.theme === id}
                className={draft.theme === id ? 'selected' : ''}
                onClick={() => update('theme', id)}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
          <div className="studio-section-label">
            <span>Choose a colour story</span>
            <small>{palettes.length} colour stories</small>
          </div>
          <div className="palette-grid" role="group" aria-label="Colour palettes">
            {palettes.map((p) => (
              <button
                type="button"
                key={p.id}
                aria-label={`${p.name} palette`}
                aria-pressed={draft.palette === p.id}
                className={`palette-option ${draft.palette === p.id ? 'selected' : ''}`}
                style={
                  {
                    '--swatch-primary': p.primary,
                    '--swatch-companion': p.companion,
                  } as CSSProperties
                }
                onClick={() =>
                  onChange({
                    ...draft,
                    palette: p.id,
                    primaryColor: p.primary,
                    companionColor: p.companion,
                  })
                }
              >
                <span className="palette-art">
                  <i />
                  <i />
                  <i />
                  <span />
                </span>
                <span className="palette-name">
                  {p.name}
                  {draft.palette === p.id && <Check size={14} />}
                </span>
                <small>{p.description}</small>
              </button>
            ))}
          </div>
          <div className="custom-colour-heading">
            <div>
              <SlidersHorizontal size={15} />
              <strong>Or make your own mix</strong>
            </div>
            <button
              type="button"
              className={`custom-mix-button ${draft.palette === 'custom' ? 'selected' : ''}`}
              aria-pressed={draft.palette === 'custom'}
              onClick={() => update('palette', 'custom')}
            >
              Your mix{draft.palette === 'custom' && <Check size={13} />}
            </button>
          </div>
          <div className="custom-colours">
            {(
              [
                ['primaryColor', 'Primary colour', colors.primary],
                ['companionColor', 'Companion colour', colors.companion],
              ] as const
            ).map(([key, label, current]) => (
              <label className="colour-control" key={key}>
                <span>{label}</span>
                <div>
                  <input
                    type="color"
                    aria-label={`${label} picker`}
                    value={/^#[0-9a-f]{6}$/i.test(current) ? current : '#7964ef'}
                    onChange={(e) => customize(key, e.target.value)}
                  />
                  <input
                    aria-label={`${label} hex`}
                    maxLength={7}
                    spellCheck={false}
                    value={current}
                    onChange={(e) => customize(key, e.target.value)}
                    placeholder="#7964ef"
                    aria-invalid={!/^#[0-9a-f]{6}$/i.test(current)}
                  />
                </div>
              </label>
            ))}
          </div>
          <small className="studio-caption">
            Text colours adapt automatically to keep your mix readable.
          </small>
          {!valid && (
            <p role="alert" className="error">
              Use a six-digit hex colour, such as #7964ef.
            </p>
          )}
        </div>
        <div className="studio-preview-column">
          <div className="preview-label">
            <span>
              <i />
              LIVE COLOUR PREVIEW
            </span>
            <small>
              {dark ? 'After hours, in full colour.' : 'A little brighter. A little yours.'}
            </small>
          </div>
          <div
            className="theme-preview"
            data-preview-theme={dark ? 'dark' : 'light'}
            data-preview-motion={draft.reducedMotion ? 'off' : draft.motionLevel}
            style={
              themeTokens(
                {
                  ...draft,
                  primaryColor: /^#[0-9a-f]{6}$/i.test(draft.primaryColor)
                    ? draft.primaryColor
                    : '#7964ef',
                  companionColor: /^#[0-9a-f]{6}$/i.test(draft.companionColor)
                    ? draft.companionColor
                    : '#2fcbb4',
                },
                dark,
              ) as CSSProperties
            }
          >
            <div className="preview-window-bar">
              <span />
              <span />
              <span />
              <i>ScreenWell</i>
            </div>
            <div className="preview-dashboard">
              <div className="preview-mini-nav">
                <Leaf size={16} />
                <i />
                <i />
                <i />
              </div>
              <div className="preview-mini-content">
                <p>YOUR LITTLE WELLNESS SPACE</p>
                <h3>
                  Big focus.
                  <br />
                  <span>Little pauses.</span>
                </h3>
                <div className="preview-orbit">
                  <i />
                  <i />
                  <i />
                  <Leaf size={29} />
                  <span className="preview-orbit-dot" />
                </div>
                <span className="preview-cta">
                  Make a little room <Sparkles size={10} />
                </span>
                <div className="preview-mini-cards">
                  <span>
                    <i />
                    <b>Rest</b>
                  </span>
                  <span>
                    <i />
                    <b>Reset</b>
                  </span>
                  <span>
                    <i />
                    <b>Return</b>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="motion-options">
            <div className="studio-section-label">
              <span>
                <WandSparkles size={15} />
                Choose your motion
              </span>
            </div>
            <select
              aria-label="Motion level"
              value={draft.motionLevel}
              disabled={draft.reducedMotion || systemReduced}
              onChange={(e) => update('motionLevel', e.target.value as Settings['motionLevel'])}
            >
              <option value="off">Still · no animation</option>
              <option value="gentle">Gentle · slow and soothing</option>
              <option value="expressive">Expressive · a little more playful</option>
            </select>
            <Toggle
              label="Ambient colour glows"
              description="Soft background colour and floating accents."
              checked={draft.ambientEffects}
              onChange={(v) => update('ambientEffects', v)}
            />
            {systemReduced && (
              <p className="studio-caption">
                System reduced motion is on. Graphics will stay still.
              </p>
            )}
            <p className="studio-caption">
              Animations rest when ScreenWell is in the background. Reduced motion always takes
              priority.
            </p>
          </div>
          <button className="primary studio-apply" disabled={!valid || busy} onClick={apply}>
            <Check size={16} />
            {busy ? 'Applying…' : 'Apply appearance'}
          </button>
          <p className="studio-caption apply-caption">
            The preview is local. Apply when your colours feel right.
          </p>
        </div>
      </div>
    </section>
  );
}
