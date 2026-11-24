import { describe, expect, it } from 'vitest';
import { defaults } from '../../shared/defaults';
import { contrast, palettes, readableOn, themeTokens } from '../../shared/appearance';
import { applyAppearance } from '../../renderer/useAppearance';
describe('colour readability and motion preferences', () => {
  it('uses the standard relative-luminance contrast calculation', () => {
    expect(contrast('#000000', '#ffffff')).toBe(21);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.478, 3);
  });
  it('keeps button labels readable throughout the RGB colour cube', () => {
    for (const r of [0, 51, 102, 153, 204, 255])
      for (const g of [0, 51, 102, 153, 204, 255])
        for (const b of [0, 51, 102, 153, 204, 255]) {
          const hex = '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
          expect(contrast(readableOn(hex), hex), hex).toBeGreaterThanOrEqual(4.5);
        }
  });
  it('keeps text readable on every generated theme surface, including extreme custom colours', () => {
    const schemes = [
      ...palettes.map((p) => ({ ...defaults, palette: p.id })),
      ...['#000000', '#ffffff', '#ffff00', '#00ffff', '#ff00ff', '#777777'].map((primaryColor) => ({
        ...defaults,
        palette: 'custom' as const,
        primaryColor,
        companionColor: primaryColor,
      })),
    ];
    for (const settings of schemes)
      for (const dark of [false, true]) {
        const tokens = themeTokens(settings, dark);
        for (const surface of [
          '--bg',
          '--surface',
          '--surface-raised',
          '--accent-soft',
          '--secondary-soft',
          '--hero-start',
          '--hero-end',
        ])
          for (const text of ['--ink', '--muted', '--accent-ink', '--secondary-ink'])
            expect(
              contrast(tokens[text], tokens[surface]),
              `${settings.palette}/${settings.primaryColor}/${dark}/${text}/${surface}`,
            ).toBeGreaterThanOrEqual(4.5);
      }
  });
  it('gives Windows and app reduced-motion settings priority over expressive motion', () => {
    const root = {
      dataset: {},
      style: { setProperty: () => {}, fontSize: '', colorScheme: '' },
    } as unknown as HTMLElement;
    applyAppearance({ ...defaults, motionLevel: 'expressive' }, true, true, root);
    expect(root.dataset.motionLevel).toBe('off');
    expect(root.dataset.motion).toBe('false');
    applyAppearance(
      { ...defaults, motionLevel: 'expressive', reducedMotion: true },
      false,
      false,
      root,
    );
    expect(root.dataset.motionLevel).toBe('off');
    applyAppearance({ ...defaults, motionLevel: 'expressive' }, true, false, root);
    expect(root.dataset.motionLevel).toBe('expressive');
    expect(root.dataset.theme).toBe('dark');
  });
});
