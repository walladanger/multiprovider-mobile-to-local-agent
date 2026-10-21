import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';

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

type BackgroundContextValue = {
  settings: BackgroundSettings;
  presets: BackgroundPreset[];
  update: (patch: Partial<BackgroundSettings>) => void;
  selectKind: (kind: BackgroundKind) => void;
  savePreset: (name: string) => void;
  loadPreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;
  deletePreset: (id: string) => void;
};

const BackgroundContext = React.createContext<BackgroundContextValue | null>(null);

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<BackgroundSettings>(BACKGROUND_DEFAULTS.gradient);
  const [presets, setPresets] = React.useState<BackgroundPreset[]>([]);
  const hydrated = React.useRef(false);

  React.useEffect(() => {
    let cancelled = false;
    void AsyncStorage.multiGet([BACKGROUND_STORAGE_KEYS.active, BACKGROUND_STORAGE_KEYS.presets])
      .then(([[, active], [, stored]]) => {
        if (cancelled) return;
        if (active) setSettings(normalizeSettings(JSON.parse(active)));
        if (stored) setPresets(normalizePresets(JSON.parse(stored)));
      })
      .catch(() => undefined)
      .finally(() => { hydrated.current = true; });
    return () => { cancelled = true; };
  }, []);

  const persistActive = React.useCallback((next: BackgroundSettings) => {
    if (hydrated.current) void AsyncStorage.setItem(BACKGROUND_STORAGE_KEYS.active, JSON.stringify(next)).catch(() => undefined);
  }, []);
  const persistPresets = React.useCallback((next: BackgroundPreset[]) => {
    void AsyncStorage.setItem(BACKGROUND_STORAGE_KEYS.presets, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const value = React.useMemo<BackgroundContextValue>(() => ({
    settings,
    presets,
    update: (patch) => setSettings((prev) => { const next = normalizeSettings({ ...prev, ...patch }); persistActive(next); return next; }),
    selectKind: (kind) => { const next = BACKGROUND_DEFAULTS[kind]; persistActive(next); setSettings(next); },
    savePreset: (name) => setPresets((prev) => { const next = saveToList(prev, name, settings); persistPresets(next); return next; }),
    loadPreset: (id) => { const p = presets.find((x) => x.id === id); if (p) { persistActive(p.settings); setSettings(p.settings); } },
    renamePreset: (id, name) => setPresets((prev) => { const next = renameInList(prev, id, name); persistPresets(next); return next; }),
    deletePreset: (id) => setPresets((prev) => { const next = deleteFromList(prev, id); persistPresets(next); return next; }),
  }), [settings, presets, persistActive, persistPresets]);

  return <BackgroundContext.Provider value={value}>{children}</BackgroundContext.Provider>;
}

export function useBackground(): BackgroundContextValue {
  const ctx = React.useContext(BackgroundContext);
  if (!ctx) throw new Error('useBackground must be used inside BackgroundProvider');
  return ctx;
}
