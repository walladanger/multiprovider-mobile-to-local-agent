import { describe, expect, it } from 'vitest';

import { blend, COLOR_THEME_IDS, COLOR_THEMES, contrastRatio, hexToRgb, suggestBackgroundColors } from '../../lib/backgrounds/color-themes';

describe('built-in color themes', () => {
  it('offers 6-8 themes with Deep Indigo first', () => {
    expect(COLOR_THEME_IDS.length).toBeGreaterThanOrEqual(6);
    expect(COLOR_THEME_IDS.length).toBeLessThanOrEqual(8);
    expect(COLOR_THEME_IDS[0]).toBe('deepIndigo');
  });

  it.each(COLOR_THEME_IDS)('%s meets WCAG AA for body text, muted text and buttons', (id) => {
    const th = COLOR_THEMES[id];
    const bg = hexToRgb(th.bg);
    // Strongest panel the skins use (solid) and the lightest glass panel.
    for (const alpha of [0.55, 0.7, 0.9, 0.95]) {
      const panel = blend(th.panelRgb, alpha, bg);
      expect(contrastRatio(hexToRgb(th.text), panel)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(hexToRgb(th.textMuted), panel)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrastRatio(hexToRgb(th.text), bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(hexToRgb(th.primarySoft), bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio([255, 255, 255], hexToRgb(th.primary))).toBeGreaterThanOrEqual(4.5);
  });

  it('suggests background colors per kind', () => {
    expect(suggestBackgroundColors(COLOR_THEMES.cosmicTeal, 'swirl').colorB).toBe('#00ffff');
    expect(suggestBackgroundColors(COLOR_THEMES.abyssBlue, 'gradient').colorBack).toBe('#040d20');
  });
});
