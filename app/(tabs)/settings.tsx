import { Icon } from '@/components/ui/icon';
import { useFriendlyConnectionMessage } from '@/components/ui/connection-error-text';
import { tokens } from '@/theme/tokens';
import type { IconName } from '@/lib/backgrounds/icon-map';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Appbar,
  Button,
  Snackbar,
  Text,
} from 'react-native-paper';

import { Colors, Fonts } from '@/constants/theme';
import { WorkspaceScope, useWorkspaces } from '@/providers/workspace-context';
import { getConnectionUiScope } from '@/lib/connection-scope';
import { ServerContextPicker } from '@/components/settings/server-context-picker';
import { ServerApprovals } from '@/components/settings/server-approvals';
import { McpSection } from '@/components/settings/mcp-section';
import {
  EditorSection,
  ConnectionSection,
  DiagnosticsSection,
  GeneralSection,
  NotificationsSection,
  UpdateSection,
  VoiceSection,
} from '@/components/settings/settings-sections';
import { useNotificationSetup } from '@/components/settings/use-notification-setup';
import { BackgroundSection } from '@/components/settings/sections/background-section';
import { normalizeTranscriptFontSize, TRANSCRIPT_FONT_SIZE_MAX, TRANSCRIPT_FONT_SIZE_MIN } from '@/providers/opencode-preferences';
import { useBackground } from '@/providers/background-context';
import { AiSettingsPanel } from '@/components/settings/ai-settings-panel';
import { useVoiceSetup } from '@/components/settings/use-voice-setup';
import {
  RESPONSE_SCOPE_OPTIONS,
  WORKING_SOUND_OPTIONS,
} from '@/components/settings/settings-utils';
import { OverlaySheet } from '@/components/ui/overlay-sheet';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLastJsError } from '@/hooks/use-last-js-error';
import { getSpeechVoiceOptions, type SpeechVoiceOption } from '@/lib/voice/speech-output';
import { useApprovals, useCapabilities, useConnection, useDiagnostics, useMcp, useOnboarding, usePreferences, useProjects, useUpdates } from '@/providers/opencode-contexts';

// One entry per settings section. Adding a section means adding an entry here
// (and its presentational component); the row list and the overlay both derive
// from this array, so there is a single place to edit.
type SettingsSection = {
  id: string;
  icon: IconName;
  title: string;
  summary: string;
  onPress: () => void;
  render?: () => ReactNode;
};

export default function SettingsScreen() {
  const registry = useWorkspaces();
  return <WorkspaceScope target={registry.inspectionTarget ?? registry.focus}><SettingsContent /></WorkspaceScope>;
}

function SettingsContent() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const { t } = useTranslation();
  const friendlyConnection = useFriendlyConnectionMessage();
  const { configuredProviders, currentConfig } = useCapabilities();
  const { addMcpServer, mcpOAuth, connectMcpServer, disconnectMcpServer, mcpStatuses, refreshMcpServers, setMcpServerEnabled } = useMcp();
  const { chatPreferences, updateChatPreferences } = usePreferences();
  const { connect, connection, settings, serverCapabilities } = useConnection();
  const { activeProjectPath } = useProjects();
  const { diagnostics, eventStreamStatus, refreshDiagnostics } = useDiagnostics();
  const { lastJsError, refreshLastJsError } = useLastJsError();
  const { approvals } = useApprovals();
  const { startOnboardingReview } = useOnboarding();
  const updates = useUpdates();
  const background = useBackground();
  const router = useRouter();
  const notifications = useNotificationSetup();
  const voiceSetup = useVoiceSetup({
    locale: chatPreferences.speechLocale,
    rate: chatPreferences.speechRate,
    voiceId: chatPreferences.speechVoiceId,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [advancedTab, setAdvancedTab] = useState<'mcp' | 'diagnostics'>('mcp');
  const [openSection, setOpenSection] = useState<string>();
  const [availableSpeechVoices, setAvailableSpeechVoices] = useState<SpeechVoiceOption[]>([]);
  const [isRefreshingSpeechVoices, setIsRefreshingSpeechVoices] = useState(false);

  async function handleConnect() {
    setIsConnecting(true);
    try {
      await connect();
    } finally {
      setIsConnecting(false);
    }
  }

  async function refreshSpeechVoices() {
    setIsRefreshingSpeechVoices(true);
    try {
      setAvailableSpeechVoices(await getSpeechVoiceOptions());
    } catch {
      setAvailableSpeechVoices([]);
    } finally {
      setIsRefreshingSpeechVoices(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate speech status once on mount.
    void refreshSpeechVoices();
  }, []);

  const selectedSpeechVoiceLabel = useMemo(
    () => availableSpeechVoices.find((voice) => voice.id === chatPreferences.speechVoiceId)?.label || t('common:labels.systemDefault'),
    [availableSpeechVoices, chatPreferences.speechVoiceId, t],
  );
  const selectedResponseScope = useMemo(
    () => RESPONSE_SCOPE_OPTIONS.find((option) => option.value === chatPreferences.responseScope) || RESPONSE_SCOPE_OPTIONS[0],
    [chatPreferences.responseScope],
  );
  const selectedWorkingSound = useMemo(
    () => WORKING_SOUND_OPTIONS.find((option) => option.value === chatPreferences.workingSoundVariant) || WORKING_SOUND_OPTIONS[0],
    [chatPreferences.workingSoundVariant],
  );

  const sections: SettingsSection[] = [
    {
      id: 'connection',
      icon: 'server',
      title: t('settings:screen.categories.connection'),
      summary: connection.status === 'connected' ? t('common:labels.connected') : friendlyConnection(connection.message),
      onPress: () => setOpenSection('connection'),
      render: () => <ConnectionSection connection={connection} palette={palette} />,
    },
    {
      id: 'ai',
      icon: 'ai',
      title: t('settings:screen.categories.ai'),
      summary: t('settings:screen.summaries.configuredCount', { value: configuredProviders.length }),
      onPress: () => setOpenSection('ai'),
      render: () => <AiSettingsPanel />,
    },
    {
      id: 'notifications',
      icon: 'bell',
      title: t('settings:screen.categories.notifications'),
      summary: notifications.status?.permissionGranted ? t('common:labels.enabled') : t('common:labels.off'),
      onPress: () => setOpenSection('notifications'),
      render: () => <NotificationsSection isRefreshingNotificationStatus={notifications.isRefreshing} notificationStatus={notifications.status} onEnableNotifications={() => void notifications.enable()} onOpenAppSettings={() => void notifications.openAppSettings()} onOpenBatterySaverSettings={() => void notifications.openBatterySaverSettings()} onOpenBatterySettings={() => void notifications.openBatterySettings()} onOpenNotificationSettings={() => void notifications.openNotificationSettings()} onRefreshStatus={() => void notifications.refreshStatus()} palette={palette} />,
    },
    {
      id: 'voice',
      icon: 'voice',
      title: t('settings:screen.categories.voice'),
      summary: chatPreferences.autoPlayAssistantReplies ? t('settings:screen.summaries.replyPlaybackOn') : t('settings:screen.summaries.replyPlaybackOff'),
      onPress: () => setOpenSection('voice'),
      render: () => <VoiceSection availableSpeechVoices={availableSpeechVoices} chatPreferences={chatPreferences} isRefreshingSpeechVoices={isRefreshingSpeechVoices} isRefreshingVoiceCapabilities={voiceSetup.isRefreshing} isTestingVoice={voiceSetup.isTesting} onEnableVoiceInput={() => void voiceSetup.enable()} onOpenVoiceSettings={() => void voiceSetup.openAppSettings()} onRefreshVoiceCapabilities={() => void voiceSetup.refreshStatus()} onTestVoicePlayback={() => void voiceSetup.testPlayback()} palette={palette} selectedResponseScope={selectedResponseScope} selectedSpeechVoiceLabel={selectedSpeechVoiceLabel} selectedWorkingSound={selectedWorkingSound} updateChatPreferences={updateChatPreferences} voiceCapabilities={voiceSetup.capabilities} />,
    },
    {
      id: 'appearance',
      icon: 'palette',
      title: t('settings:screen.categories.appearance'),
      summary: t('settings:backgrounds.summary', { value: t(`settings:backgrounds.kinds.${background.settings.kind}`) }),
      onPress: () => setOpenSection('appearance'),
      render: () => <BackgroundSection palette={palette} chatTextSize={{
        value: normalizeTranscriptFontSize(chatPreferences.transcriptFontSize), min: TRANSCRIPT_FONT_SIZE_MIN, max: TRANSCRIPT_FONT_SIZE_MAX,
        onChange: (transcriptFontSize) => updateChatPreferences({ transcriptFontSize }),
      }} />,
    },
    {
      id: 'general', icon: 'settings', title: t('common:servers.appSettings'), summary: t('common:servers.appSettingsSummary'),
      onPress: () => setOpenSection('general'), render: () => <>
          <EditorSection chatPreferences={chatPreferences} contract={serverCapabilities.contract} palette={palette} updateChatPreferences={updateChatPreferences} />
          <GeneralSection chatPreferences={chatPreferences} palette={palette} updateChatPreferences={updateChatPreferences} onResetOnboarding={() => {
            setOpenSection(undefined);
            startOnboardingReview();
            router.push('/onboarding');
          }} />
          {updates.supported ? <UpdateSection checkPeriod={updates.checkPeriod} enabled={updates.enabled} onCheckPeriodChange={updates.setCheckPeriod} onEnabledChange={updates.setEnabled} palette={palette} /> : null}
      </>,
    },
    {
      id: 'advanced',
      icon: 'tune',
      title: t('settings:screen.categories.advanced'),
      summary: t('common:servers.serverToolsSummary'),
      onPress: () => setOpenSection('advanced'),
      render: () => (
        <>
          <View style={{ flexDirection: 'row', gap: 8 }}><Button mode={advancedTab === 'mcp' ? 'contained-tonal' : 'text'} onPress={() => setAdvancedTab('mcp')}>MCP</Button><Button mode={advancedTab === 'diagnostics' ? 'contained-tonal' : 'text'} onPress={() => setAdvancedTab('diagnostics')}>{t('settings:diagnostics.title')}</Button></View>
          {advancedTab === 'mcp' ? <>
          <McpSection configs={currentConfig?.mcp} mcpStatuses={mcpStatuses} onAdd={addMcpServer} onConnect={connectMcpServer} onDisconnect={disconnectMcpServer} onRefresh={refreshMcpServers} onSetEnabled={setMcpServerEnabled} mcpOAuth={mcpOAuth} persistentConfigAvailable={serverCapabilities.configWrite} requiresIntegrationId={serverCapabilities.contract === 'v2'} oauthAvailable={serverCapabilities.mcpOAuth} palette={palette} />
          </> : <>
          <DiagnosticsSection diagnostics={diagnostics} eventStreamStatus={eventStreamStatus} formatterAvailable={serverCapabilities.formatter} lastJsError={lastJsError} lspAvailable={serverCapabilities.lsp} onRefresh={() => { void refreshDiagnostics(); refreshLastJsError(); }} palette={palette} />
          </>}
        </>
      ),
    },
    ...(serverCapabilities.savedPermissions ? [{
      id: 'permissions',
      icon: 'shield' as const,
      title: t('settings:screen.categories.permissions'),
      summary: t('settings:screen.summaries.permissions', { value: approvals.savedPermissions.length }),
      onPress: () => {
        setOpenSection('permissions');
        void approvals.refreshSavedPermissions();
      },
      render: () => <ServerApprovals />,
    }] : []),
  ];

  const activeSection = sections.find((section) => section.id === openSection);

  return (
    <>
      <Appbar.Header
        style={[styles.header, { backgroundColor: palette.surface, paddingTop: insets.top, height: 64 + insets.top }]}
        statusBarHeight={0}
        elevated>
        <View style={styles.headerMain}>
          <Text variant="titleMedium" style={[styles.headerTitle, { color: palette.text }]}>{t('common:tabs.settings')}</Text>
        </View>
        <View style={styles.headerActions}>
          <Appbar.Action icon="refresh" accessibilityLabel={t('common:actions.reconnect')} loading={isConnecting} disabled={isConnecting} onPress={() => void handleConnect()} />
        </View>
      </Appbar.Header>
      <ScrollView style={[styles.screen, { backgroundColor: palette.background }]} contentContainerStyle={styles.content}>
        {[{ label: t('common:servers.serverSettings'), ids: ['ai', 'advanced', 'permissions'], server: true },
          { label: t('common:servers.appSettings'), ids: ['connection', 'appearance', 'general', 'notifications', 'voice'], server: false }].map((group) => <View key={group.label} style={{ gap: tokens.spacing.md, marginBottom: tokens.spacing.xl - 4 }}>
          <Text variant="titleMedium">{group.label}</Text>
          {group.server ? <ServerContextPicker /> : null}
          <View style={[styles.categoryGroup, { backgroundColor: palette.surface, borderColor: palette.border, borderRadius: tokens.radius.lg }]}>
          {sections.filter((section) => group.ids.includes(section.id)).map((section, index) => <Pressable key={section.id} accessibilityRole="button" accessibilityLabel={`${section.title}. ${section.summary}`} onPress={section.onPress} style={[styles.category, index > 0 && { borderTopColor: palette.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
            <Icon name={section.icon} size={22} color={palette.tint} />
            <View style={styles.categoryText}><Text variant="titleMedium" style={{ color: palette.text }}>{section.title}</Text><Text variant="bodyMedium" numberOfLines={1} style={{ color: palette.muted }}>{section.summary}</Text></View>
            <Icon name="chevron-right" size={20} color={palette.muted} />
          </Pressable>)}
          </View>
        </View>)}
      </ScrollView>

      <OverlaySheet visible={Boolean(activeSection)} fitContent testID="settings-section-overlay" title={activeSection?.title ?? t('common:tabs.settings')} onClose={() => setOpenSection(undefined)}>
        {['ai', 'advanced', 'permissions'].includes(activeSection?.id ?? '') ? <ServerContextPicker project={activeSection?.id === 'advanced'} /> : null}
        <View key={['ai', 'advanced', 'permissions'].includes(activeSection?.id ?? '') ? `${getConnectionUiScope(settings)}:${activeProjectPath ?? ''}` : activeSection?.id}>{activeSection?.render?.() ?? null}</View>
      </OverlaySheet>

      <Snackbar
        visible={Boolean(notifications.feedback)}
        onDismiss={notifications.clearFeedback}
        duration={4000}>
        {notifications.feedback}
      </Snackbar>
      <Snackbar
        visible={Boolean(voiceSetup.feedback)}
        onDismiss={voiceSetup.clearFeedback}
        duration={4000}>
        {voiceSetup.feedback}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 28, width: '100%', maxWidth: 800, alignSelf: 'center' },
  header: { elevation: 0 },
  headerMain: { alignSelf: 'stretch', flex: 1, justifyContent: 'center', minWidth: 0 },
  headerActions: { alignItems: 'center', flexDirection: 'row', flexShrink: 0 },
  headerTitle: { fontFamily: Fonts.display, fontWeight: '700' },
  categoryGroup: { borderWidth: 1, overflow: 'hidden' },
  category: { minHeight: 76, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 16 },
  categoryText: { flex: 1, gap: 2 },
});
