import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';

import { DEFAULT_APPEARANCE, normalizeAppearance, resolveThemeTokens, type AppearanceSettings } from '@/lib/backgrounds/appearance';
import { COLOR_THEMES, suggestBackgroundColors, type ColorThemeId } from '@/lib/backgrounds/color-themes';
import { FONT_FAMILIES } from '@/lib/backgrounds/fonts';
import {
  BACKGROUND_DEFAULTS,
  BACKGROUND_STORAGE_KEYS,
  deletePreset as deleteFromList,
  normalizePresets,
  normalizeSettings,
  renamePreset as renameInList,
  savePreset as saveToList,
  type BackgroundKind,
  type BackgroundPreset,
  type BackgroundSettings,
} from '@/lib/backgrounds/settings';
import { useAppFonts } from '@/components/ui/app-fonts';
import { applyThemeTokens } from '@/theme/tokens';

type BackgroundContextValue = {
  settings: BackgroundSettings;
  appearance: AppearanceSettings;
  presets: BackgroundPreset[];
  fontsLoaded: boolean;
  update: (patch: Partial<BackgroundSettings>) => void;
  selectKind: (kind: BackgroundKind) => void;
  /** Applies a color theme live and suggests matching background colors. */
  selectTheme: (id: ColorThemeId) => void;
  updateAppearance: (patch: Partial<AppearanceSettings>) => void;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;
  deletePreset: (id: string) => void;
};

const BackgroundContext = React.createContext<BackgroundContextValue | null>(null);

function applyAppearance(appearance: AppearanceSettings, fontsLoaded: boolean) {
  const ui = appearance.uiFont !== 'system' && fontsLoaded ? FONT_FAMILIES[appearance.uiFont] : undefined;
  const code = appearance.codeFont !== 'system' && fontsLoaded ? FONT_FAMILIES[appearance.codeFont] : undefined;
  applyThemeTokens({
    ...resolveThemeTokens(appearance),
    typography: { sans: ui?.regular, sansBold: ui?.bold, mono: code?.regular, scale: appearance.textScale },
    iconSettings: { pack: appearance.iconPack },
  });
}

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const fontsLoaded = useAppFonts();
  const [settings, setSettings] = React.useState<BackgroundSettings>(BACKGROUND_DEFAULTS.gradient);
  const [appearance, setAppearance] = React.useState<AppearanceSettings>(DEFAULT_APPEARANCE);
  const [presets, setPresets] = React.useState<BackgroundPreset[]>([]);
  const hydrated = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    void AsyncStorage.multiGet([BACKGROUND_STORAGE_KEYS.active, BACKGROUND_STORAGE_KEYS.presets, BACKGROUND_STORAGE_KEYS.appearance])
      .then(([[, active], [, stored], [, look]]) => {
        if (cancelled) return;
        if (active) setSettings(normalizeSettings(JSON.parse(active)));
        if (stored) setPresets(normalizePresets(JSON.parse(stored)));
        if (look) setAppearance(normalizeAppearance(JSON.parse(look)));
      })
      .catch(() => undefined)
      .finally(() => { hydrated.current = true; });
    return () => { cancelled = true; };
  }, []);

  // Live: push appearance into theme tokens; useColorScheme() consumers re-render.
  React.useEffect(() => { applyAppearance(appearance, fontsLoaded); }, [appearance, fontsLoaded]);

  const persist = React.useCallback((key: string, value: unknown) => {
    if (hydrated.current) void AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => undefined);
  }, []);

  const value = React.useMemo<BackgroundContextValue>(() => {
    const setActive = (next: BackgroundSettings) => { persist(BACKGROUND_STORAGE_KEYS.active, next); setSettings(next); };
    const setLook = (next: AppearanceSettings) => { persist(BACKGROUND_STORAGE_KEYS.appearance, next); setAppearance(next); };
    const setList = (next: BackgroundPreset[]) => { hydrated.current = true; persist(BACKGROUND_STORAGE_KEYS.presets, next); setPresets(next); };
    return {
      settings,
      appearance,
      presets,
      fontsLoaded,
      update: (patch) => setActive(normalizeSettings({ ...settings, ...patch })),
      selectKind: (kind) => setActive(normalizeSettings({ ...BACKGROUND_DEFAULTS[kind], ...suggestBackgroundColors(COLOR_THEMES[appearance.themeId], kind) })),
      selectTheme: (id) => {
        setLook({ ...appearance, themeId: id });
        setActive(normalizeSettings({ ...settings, ...suggestBackgroundColors(COLOR_THEMES[id], settings.kind) }));
      },
      updateAppearance: (patch) => setLook(normalizeAppearance({ ...appearance, ...patch })),
      savePreset: (name) => setList(saveToList(presets, name, settings, undefined, appearance)),
      loadPreset: (id) => {
        const p = presets.find((x) => x.id === id);
        if (!p) return;
        setActive(p.settings);
        if (p.appearance) setLook(p.appearance);
      },
      renamePreset: (id, name) => setList(renameInList(presets, id, name)),
      deletePreset: (id) => setList(deleteFromList(presets, id)),
    };
  }, [settings, appearance, presets, fontsLoaded, persist]);

  return <BackgroundContext.Provider value={value}>{children}</BackgroundContext.Provider>;
}

export function useBackground(): BackgroundContextValue {
  const ctx = React.useContext(BackgroundContext);
  if (!ctx) throw new Error('useBackground must be used inside BackgroundProvider');
  return ctx;
}
