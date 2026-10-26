/**
 * Semantic icon names -> per-pack glyph names. Used by components/ui/icon.tsx.
 * Material = MaterialCommunityIcons (@expo/vector-icons, Apache-2.0); Lucide (ISC);
 * Phosphor (MIT); Tabler (MIT). Unmapped names fall back to Material.
 */
export const ICON_NAMES = ['chat', 'terminal', 'folder', 'settings', 'server', 'ai', 'bell', 'voice', 'palette', 'chevron-right', 'refresh', 'tune', 'shield', 'help'] as const;
export type IconName = (typeof ICON_NAMES)[number];

export const MATERIAL_ICON_MAP: Record<IconName, string> = {
  chat: 'message', terminal: 'console', folder: 'folder', settings: 'cog-outline', server: 'server-network', ai: 'creation',
  bell: 'bell-outline', voice: 'waveform', palette: 'palette-outline', 'chevron-right': 'chevron-right', refresh: 'refresh',
  tune: 'tune', shield: 'shield-key-outline', help: 'help-circle-outline',
};

export const MATERIAL_FALLBACK = 'help-circle-outline';

export function isIconName(v: string): v is IconName {
  return (ICON_NAMES as readonly string[]).includes(v);
}
