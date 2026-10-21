/** Bundled OFL-1.1 fonts registered with expo-font. Keys match lib/backgrounds/fonts.ts. */
import { useFonts } from 'expo-font';

const FONT_ASSETS = {
  Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
  Manrope_400Regular: require('@expo-google-fonts/manrope/400Regular/Manrope_400Regular.ttf'),
  Manrope_700Bold: require('@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf'),
  SpaceGrotesk_400Regular: require('@expo-google-fonts/space-grotesk/400Regular/SpaceGrotesk_400Regular.ttf'),
  SpaceGrotesk_700Bold: require('@expo-google-fonts/space-grotesk/700Bold/SpaceGrotesk_700Bold.ttf'),
  IBMPlexSans_400Regular: require('@expo-google-fonts/ibm-plex-sans/400Regular/IBMPlexSans_400Regular.ttf'),
  IBMPlexSans_700Bold: require('@expo-google-fonts/ibm-plex-sans/700Bold/IBMPlexSans_700Bold.ttf'),
  JetBrainsMono_400Regular: require('@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.ttf'),
  JetBrainsMono_700Bold: require('@expo-google-fonts/jetbrains-mono/700Bold/JetBrainsMono_700Bold.ttf'),
};

/** Loads the bundled fonts without blocking startup; system fonts are used until ready. */
export function useAppFonts() {
  const [loaded] = useFonts(FONT_ASSETS);
  return loaded;
}
