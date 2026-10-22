import { describe, expect, it } from 'vitest';

import { SKIN_IDS } from '@/lib/backgrounds/skins';
import { UI_FONT_IDS } from '@/lib/backgrounds/fonts';
import { GRADIENT_PRESETS, ONBOARDING_FONTS, ONBOARDING_SKINS, gradientPresetId, textSizeIdForScale } from '@/lib/onboarding-look';
import en from '@/lib/i18n/locales/en/onboarding.json';

describe('onboarding look & feel options', () => {
  it('offers only real fonts and every existing skin', () => {
    expect(ONBOARDING_FONTS.every((id) => (UI_FONT_IDS as readonly string[]).includes(id))).toBe(true);
    expect([...ONBOARDING_SKINS]).toEqual([...SKIN_IDS]);
  });

  it('maps stored text scales to the nearest size chip', () => {
    expect(textSizeIdForScale(1)).toBe('medium');
    expect(textSizeIdForScale(0.85)).toBe('small');
    expect(textSizeIdForScale(1.2)).toBe('large');
    expect(textSizeIdForScale(1.3)).toBe('xlarge');
  });

  it('recognises gradient presets and reports anything else as custom', () => {
    const ocean = GRADIENT_PRESETS[1];
    expect(gradientPresetId({ kind: 'gradient', ...ocean, colorA: '#ffffff' })).toBe('ocean');
    expect(gradientPresetId({ kind: 'mesh', ...ocean })).toBe('custom');
    expect(gradientPresetId({ kind: 'gradient', colorA: '#000', colorB: '#111', colorBack: '#222' })).toBe('custom');
  });

  it('has copy for every step, preset, and the Settings pointer', () => {
    for (const p of GRADIENT_PRESETS) expect(en.background.presets[p.id]).toBeTruthy();
    for (const step of Object.keys(en.steps)) expect(en.help[step === 'index' ? 'welcome' : step as keyof typeof en.help]).toBeTruthy();
    expect(en.look.later).toContain('Settings › Appearance');
    expect(en.background.later).toContain('Settings › Appearance');
  });
});
