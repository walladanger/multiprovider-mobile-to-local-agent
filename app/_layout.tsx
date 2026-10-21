import '../global.css';
import Constants from 'expo-constants';
import { DarkTheme, Stack, ThemeProvider, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useLayoutEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { getPaperTheme } from '@/constants/paper-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNotificationRoute } from '@/hooks/use-notification-route';
import { useQuickActionRoute } from '@/hooks/use-quick-action-route';
import { installGlobalErrorHandler } from '@/lib/error-reporting';
import '@/lib/i18n';
import { useOnboarding, useUpdates } from '@/providers/opencode-contexts';
import { UpdateNotice } from '@/components/ui/update-notice';
import { MotionBackground } from '@/components/background/motion-background';
import { BackgroundProvider } from '@/providers/background-context';
import { glass as themeGlass, palette as themePalette } from '@/theme/tokens';
import { OpencodeProvider } from '@/providers/opencode-provider';

function getNavigationTheme() {
  return {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: 'transparent',
    card: 'transparent',
    primary: themePalette.primarySoft,
    text: themePalette.text,
    border: themeGlass.border,
  },
  };
}

export const unstable_settings = {
  anchor: '(tabs)',
};

export { ErrorBoundary } from 'expo-router';

// Keep the native splash up until AsyncStorage/SecureStore hydration and the
// onboarding decision are known, so neither the assistant nor the app flashes.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  // Subscribes to live color-theme changes.
  useColorScheme();
  const paperTheme = getPaperTheme('dark');
  const navigationTheme = getNavigationTheme();
  const isE2EMode = Boolean(Constants.expoConfig?.extra?.e2eMode);

  useEffect(() => {
    if (Platform.OS === 'web' || isE2EMode) {
      return;
    }

    installGlobalErrorHandler();

    void import('@/lib/notifications')
      .then(({ initializeNotifications }) => initializeNotifications())
      .catch(() => undefined);

    void import('@/lib/voice/speech-output')
      .then(({ initializeVoiceAudioAsync }) => initializeVoiceAudioAsync())
      .catch(() => undefined);
  }, [isE2EMode]);

  return (
    <GestureHandlerRootView style={[styles.root, { backgroundColor: themePalette.bgDeep }]}>
      <SafeAreaProvider>
        <OpencodeProvider>
          <BackgroundProvider>
          <PaperProvider theme={paperTheme}>
            <ThemeProvider value={navigationTheme}>
              <MotionBackground />
              <RootNavigator />
              <UpdateHost />
              <StatusBar style="light" />
            </ThemeProvider>
          </PaperProvider>
          </BackgroundProvider>
        </OpencodeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function UpdateHost() {
  const pathname = usePathname();
  const updates = useUpdates();
  const { setSurfaceActive } = updates;
  const eligible = ['/', '/projects', '/settings', '/terminal'].includes(pathname);
  useLayoutEffect(() => {
    setSurfaceActive(eligible);
    return () => setSurfaceActive(false);
  }, [eligible, setSurfaceActive]);
  return <UpdateNotice {...updates} onDismissError={updates.clearError} />;
}

// The onboarding decision depends on persisted state, so routing waits for
// hydration. `Stack.Protected` swaps the assistant in and out without mounting
// the tab navigator behind it, which prevents any onboarding/app flash.
function RootNavigator() {
  const colorScheme = useColorScheme();
  const palette = Colors[colorScheme ?? 'light'];
  const { isHydrated, onboardingCompleted, onboardingActive } = useOnboarding();
  useNotificationRoute();
  useQuickActionRoute(isHydrated);

  useEffect(() => {
    if (isHydrated) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [isHydrated]);

  if (!isHydrated) {
    return (
      <View style={[styles.hydration, { backgroundColor: palette.backgroundSolid }]}>
        <ActivityIndicator size="large" color={palette.tint} />
      </View>
    );
  }

  const onboardingVisible = !onboardingCompleted || onboardingActive;

  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Protected guard={onboardingCompleted}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="session/[id]" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={onboardingVisible}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen name="share" options={{ headerShown: false }} />
      <Stack.Screen name="connect" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hydration: { alignItems: 'center', flex: 1, justifyContent: 'center' },
});
