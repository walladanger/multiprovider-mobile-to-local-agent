/**
 * Single icon wrapper: <Icon name="settings" />. The active pack comes from
 * theme tokens (Settings > Appearance). Semantic names are mapped per pack; an
 * unknown name is treated as a MaterialCommunityIcons glyph, else a help icon.
 */
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as React from 'react';
import type { ColorValue, StyleProp, TextStyle } from 'react-native';

import { isIconName, MATERIAL_FALLBACK, MATERIAL_ICON_MAP, type IconName } from '@/lib/backgrounds/icon-map';
import { getThemeTokensVersion, iconSettings, subscribeThemeTokens } from '@/theme/tokens';

// Deep imports keep the bundle to just these glyphs.
import LuChevronRight from 'lucide-react-native/icons/chevron-right';
import LuHelp from 'lucide-react-native/icons/circle-question-mark';
import LuFolder from 'lucide-react-native/icons/folder';
import LuChat from 'lucide-react-native/icons/message-circle';
import LuPalette from 'lucide-react-native/icons/palette';
import LuRefresh from 'lucide-react-native/icons/refresh-cw';
import LuServer from 'lucide-react-native/icons/server';
import LuSettings from 'lucide-react-native/icons/settings';
import LuShield from 'lucide-react-native/icons/shield-check';
import LuTune from 'lucide-react-native/icons/sliders-horizontal';
import LuAi from 'lucide-react-native/icons/sparkles';
import LuTerminal from 'lucide-react-native/icons/square-terminal';
import LuBell from 'lucide-react-native/icons/bell';
import LuVoice from 'lucide-react-native/icons/audio-waveform';
import { ArrowClockwiseIcon } from 'phosphor-react-native/src/icons/ArrowClockwise';
import { BellIcon } from 'phosphor-react-native/src/icons/Bell';
import { CaretRightIcon } from 'phosphor-react-native/src/icons/CaretRight';
import { ChatCircleIcon } from 'phosphor-react-native/src/icons/ChatCircle';
import { FolderIcon } from 'phosphor-react-native/src/icons/Folder';
import { GearIcon } from 'phosphor-react-native/src/icons/Gear';
import { HardDrivesIcon } from 'phosphor-react-native/src/icons/HardDrives';
import { PaletteIcon } from 'phosphor-react-native/src/icons/Palette';
import { QuestionIcon } from 'phosphor-react-native/src/icons/Question';
import { ShieldCheckIcon } from 'phosphor-react-native/src/icons/ShieldCheck';
import { SlidersIcon } from 'phosphor-react-native/src/icons/Sliders';
import { SparkleIcon } from 'phosphor-react-native/src/icons/Sparkle';
import { TerminalWindowIcon } from 'phosphor-react-native/src/icons/TerminalWindow';
import { WaveformIcon } from 'phosphor-react-native/src/icons/Waveform';
import TbTune from '@tabler/icons-react-native/IconAdjustments';
import TbBell from '@tabler/icons-react-native/IconBell';
import TbChevronRight from '@tabler/icons-react-native/IconChevronRight';
import TbFolder from '@tabler/icons-react-native/IconFolder';
import TbHelp from '@tabler/icons-react-native/IconHelpCircle';
import TbChat from '@tabler/icons-react-native/IconMessage';
import TbVoice from '@tabler/icons-react-native/IconMicrophone';
import TbPalette from '@tabler/icons-react-native/IconPalette';
import TbRefresh from '@tabler/icons-react-native/IconRefresh';
import TbServer from '@tabler/icons-react-native/IconServer';
import TbSettings from '@tabler/icons-react-native/IconSettings';
import TbShield from '@tabler/icons-react-native/IconShieldLock';
import TbAi from '@tabler/icons-react-native/IconSparkles';
import TbTerminal from '@tabler/icons-react-native/IconTerminal2';

type SvgIcon = React.ComponentType<{ size?: number; color?: string }>;

const SVG_PACKS: Record<'lucide' | 'phosphor' | 'tabler', Record<IconName, SvgIcon>> = {
  lucide: { chat: LuChat, terminal: LuTerminal, folder: LuFolder, settings: LuSettings, server: LuServer, ai: LuAi, bell: LuBell, voice: LuVoice, palette: LuPalette, 'chevron-right': LuChevronRight, refresh: LuRefresh, tune: LuTune, shield: LuShield, help: LuHelp },
  phosphor: { chat: ChatCircleIcon, terminal: TerminalWindowIcon, folder: FolderIcon, settings: GearIcon, server: HardDrivesIcon, ai: SparkleIcon, bell: BellIcon, voice: WaveformIcon, palette: PaletteIcon, 'chevron-right': CaretRightIcon, refresh: ArrowClockwiseIcon, tune: SlidersIcon, shield: ShieldCheckIcon, help: QuestionIcon },
  tabler: { chat: TbChat, terminal: TbTerminal, folder: TbFolder, settings: TbSettings, server: TbServer, ai: TbAi, bell: TbBell, voice: TbVoice, palette: TbPalette, 'chevron-right': TbChevronRight, refresh: TbRefresh, tune: TbTune, shield: TbShield, help: TbHelp },
};

export type IconProps = {
  /** Semantic name (see lib/backgrounds/icon-map.ts) or any MaterialCommunityIcons glyph. */
  name: IconName | (string & {});
  size?: number;
  color: ColorValue;
  style?: StyleProp<TextStyle>;
};

export function Icon({ name, size = 24, color, style }: IconProps) {
  React.useSyncExternalStore(subscribeThemeTokens, getThemeTokensVersion, getThemeTokensVersion);
  const pack = iconSettings.pack;
  if (pack !== 'material' && isIconName(name)) {
    const Svg = SVG_PACKS[pack][name];
    return <Svg size={size} color={String(color)} />;
  }
  const glyph = isIconName(name) ? MATERIAL_ICON_MAP[name] : name;
  const valid = glyph in MaterialCommunityIcons.glyphMap ? glyph : MATERIAL_FALLBACK;
  return <MaterialCommunityIcons name={valid as React.ComponentProps<typeof MaterialCommunityIcons>['name']} size={size} color={color} style={style} />;
}
