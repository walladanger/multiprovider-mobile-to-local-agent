import { useCallback, useRef } from 'react';

import {
  findMatchingProfile,
  pickModelPreferences,
  mutateConnectionProfiles,
} from '@/lib/connection-profiles';
import {
  buildClient,
  classifyConnectionFailure,
  detectServerContract,
  getConnectionError,
  getNormalizedServerUrl,
  isContractMismatchError,
  isAuthConnectionFailure,
  isValidServerUrl,
  type ConnectionFailureKind,
  type OpencodeConnectionSettings,
  type ScopedOpencodeClient,
  type ServerContract,
} from '@/lib/opencode/client';
import type { ChatPreferences, ConnectionState, ProjectCatalog } from '@/providers/opencode-provider-types';
import type { ConnectionActionsInput } from '@/providers/opencode-provider-action-inputs';

// Joining concurrent connects is keyed on the exact credentials and generation
// so a rotation that lands mid-flight starts a new attempt instead of adopting
// stale credentials.
function getConnectRequestKey(settings: OpencodeConnectionSettings, generation: number) {
  return [generation, settings.serverUrl, settings.username, settings.password].join('\u0000');
}

export function useConnectionConnectActions({
  setSettings,
  activeProjectPath,
  setActiveProjectPath,
  activeProjectPathRef,
  clearProjectState,
  isCurrentCatalogClient,
  loadProjectCatalog,
  serverProjectsRef,
  setServerProjects,
  setCurrentProjectPath,
  setServerRootPath,
  setSessions,
  setSessionStatuses,
  setCurrentConfig,
  setAvailableProviders,
  setProviderAuthMethodsById,
  setAvailableModels,
  setAvailableAgents,
  setMessagesBySession,
  setDiffsBySession,
  setTodosBySession,
  setChatPreferences,
  setDiagnostics,
  setSendingState,
  setConnection,
  setServerContract,
  settingsRef,
  chatPreferencesRef,
  serverContractRef,
  connectionRef,
  serverGenerationRef,
  catalogGenerationRef,
  scopeGenerationRef,
  initialConnectStartedRef,
}: ConnectionActionsInput) {
  const connectInFlightRef = useRef<{ key: string; promise: Promise<ConnectionState> } | undefined>(undefined);

  const performConnect = useCallback(async (targetSettings: OpencodeConnectionSettings): Promise<ConnectionState> => {
    initialConnectStartedRef.current = true;
    const generation = serverGenerationRef.current;
    const current = () => generation === serverGenerationRef.current;
    if (!isValidServerUrl(targetSettings.serverUrl)) {
      const failed: ConnectionState = {
        status: 'error',
        message: getConnectionError(targetSettings.serverUrl, new Error('Invalid server URL.')),
        kind: 'unknown',
        checkedAt: Date.now(),
      };
      setConnection(failed);
      return failed;
    }

    setConnection({
      status: 'connecting',
      message: `Connecting to ${getNormalizedServerUrl(targetSettings.serverUrl)}...`,
    });

    let detectedContract: ServerContract = 'v2';
    try {
      detectedContract = (await detectServerContract(targetSettings)).contract;
    } catch {
      detectedContract = 'v2';
    }
    if (!current()) return connectionRef.current;

    const candidates: ServerContract[] = detectedContract === 'v1' ? ['v1', 'v2'] : ['v2', 'v1'];
    let catalog: ProjectCatalog | undefined;
    let activeCatalogClient: ScopedOpencodeClient | undefined;
    let usedContract: ServerContract | undefined;
    let lastError: unknown;

    for (const candidate of candidates) {
      const candidateClient = buildClient({ ...targetSettings, directory: '' }, candidate);
      catalogGenerationRef.current.set(candidateClient, serverGenerationRef.current);
      try {
        const result = await loadProjectCatalog(true, candidateClient);
        if (!isCurrentCatalogClient(candidateClient)) {
          return connectionRef.current;
        }
        catalog = result;
        activeCatalogClient = candidateClient;
        usedContract = candidate;
        break;
      } catch (error) {
        if (!current()) return connectionRef.current;
        lastError = error;
        if (!isContractMismatchError(error)) {
          break;
        }
      }
    }

    if (!catalog || !activeCatalogClient || !usedContract) {
      const failure = lastError ?? new Error('Could not reach the OpenCode server.');
      const failed: ConnectionState = {
        status: 'error',
        message: getConnectionError(targetSettings.serverUrl, failure),
        kind: classifyConnectionFailure(failure),
        checkedAt: Date.now(),
      };
      setConnection(failed);
      if (!isAuthConnectionFailure(failed.kind ?? 'unknown')) return failed;
      serverProjectsRef.current = [];
      setServerProjects([]);
      setCurrentProjectPath(undefined);
      setServerRootPath(undefined);
      setSessions([]);
      setSessionStatuses({});
      setCurrentConfig(undefined);
      setAvailableProviders([]);
      setProviderAuthMethodsById({});
      setAvailableModels([]);
      setAvailableAgents([]);
      return failed;
    }

    if (usedContract !== serverContractRef.current) {
      serverContractRef.current = usedContract;
      setServerContract(usedContract);
    }

    const projectDirectory = catalog.currentProjectPath || catalog.serverRootPath;
    const connected: ConnectionState = {
      status: 'connected',
      message: `Connected to ${getNormalizedServerUrl(targetSettings.serverUrl)} (OpenCode ${usedContract === 'v2' ? '2.x' : '1.x'})`,
      checkedAt: Date.now(),
      projectDirectory,
    };
    setConnection(connected);

    if (!activeProjectPath && !catalog.currentProjectPath && !catalog.serverProjects[0]?.worktree) {
      setSessions([]);
      setSessionStatuses({});
      setCurrentConfig(undefined);
      setAvailableProviders([]);
      setProviderAuthMethodsById({});
      setAvailableModels([]);
      setAvailableAgents([]);
    }

    return connected;
  }, [activeProjectPath, catalogGenerationRef, clearProjectState, isCurrentCatalogClient, loadProjectCatalog, initialConnectStartedRef, serverContractRef, serverGenerationRef, setAvailableAgents, setAvailableModels, setAvailableProviders, setConnection, setCurrentConfig, setCurrentProjectPath, setProviderAuthMethodsById, setServerContract, setServerProjects, setServerRootPath, setSessionStatuses, setSessions, serverProjectsRef, connectionRef]);

  const runConnect = useCallback((targetSettings: OpencodeConnectionSettings) => {
    const inFlight = connectInFlightRef.current;
    if (inFlight && inFlight.key === getConnectRequestKey(targetSettings, serverGenerationRef.current)) return inFlight.promise;
    const record = { key: '', promise: Promise.resolve(connectionRef.current) };
    record.promise = performConnect(targetSettings).finally(() => {
      if (connectInFlightRef.current === record) connectInFlightRef.current = undefined;
    });
    record.key = getConnectRequestKey(targetSettings, serverGenerationRef.current);
    connectInFlightRef.current = record;
    return record.promise;
  }, [connectionRef, performConnect, serverGenerationRef]);

  const connect = useCallback(() => runConnect(settingsRef.current), [runConnect, settingsRef]);

  // A revoked or invalid credential on the data plane cannot heal by retrying,
  // so the user is asked to reconnect. Server-derived caches are cleared,
  // project selection is not.
  const handleStreamAuthFailure = useCallback((kind: ConnectionFailureKind) => {
    if (connectionRef.current.status === 'error' && connectionRef.current.kind === kind) return;
    scopeGenerationRef.current += 1;
    serverGenerationRef.current += 1;
    clearProjectState();
    setSendingState({ active: false });
    setConnection({
      status: 'error',
      kind,
      message: 'Authentication failed. Check the credentials and reconnect.',
      checkedAt: Date.now(),
    });
  }, [clearProjectState, connectionRef, scopeGenerationRef, serverGenerationRef, setConnection, setSendingState]);

  const updateSettings = useCallback((patch: Partial<OpencodeConnectionSettings>) => {
    const connectionChanged = (['serverUrl', 'username', 'password'] as const)
      .some((key) => patch[key] !== undefined && patch[key] !== settingsRef.current[key]);
    if (connectionChanged) {
      scopeGenerationRef.current += 1;
      serverGenerationRef.current += 1;
      setConnection({ status: 'idle', message: 'Connection settings changed. Reconnect to apply them.' });
      setActiveProjectPath(undefined);
      activeProjectPathRef.current = undefined;
      clearProjectState();
      setMessagesBySession({});
      setDiffsBySession({});
      setTodosBySession({});
      serverProjectsRef.current = [];
      setServerProjects([]);
      setCurrentProjectPath(undefined);
      setServerRootPath(undefined);
      setDiagnostics(undefined);
    }
    setSettings((current) => ({ ...current, ...patch }));
  }, [activeProjectPathRef, clearProjectState, scopeGenerationRef, serverGenerationRef, serverProjectsRef, settingsRef, setActiveProjectPath, setConnection, setCurrentProjectPath, setDiagnostics, setDiffsBySession, setMessagesBySession, setServerRootPath, setServerProjects, setSettings, setTodosBySession]);

  const captureActiveProfilePreferences = useCallback(async () => {
    const identity = settingsRef.current;
    const modelPreferences = pickModelPreferences(chatPreferencesRef.current);
    await mutateConnectionProfiles(async (profiles, save) => {
      const active = findMatchingProfile(profiles, identity);
      if (!active) {
        return;
      }
      await save(profiles.map((profile) => (
        profile.id === active.id ? { ...profile, modelPreferences } : profile
      )));
    });
  }, [chatPreferencesRef, settingsRef]);

  const switchConnection = useCallback(async (
    next: Pick<OpencodeConnectionSettings, 'serverUrl' | 'username' | 'password'>,
    modelPreferences?: Partial<ChatPreferences>,
  ) => {
    await captureActiveProfilePreferences().catch(() => undefined);

    const targetSettings: OpencodeConnectionSettings = { ...settingsRef.current, ...next };
    updateSettings(next);
    settingsRef.current = targetSettings;
    if (modelPreferences) {
      setChatPreferences((current) => ({ ...current, ...modelPreferences }));
    }

    return runConnect(targetSettings);
  }, [captureActiveProfilePreferences, runConnect, settingsRef, setChatPreferences, updateSettings]);

  return { connect, updateSettings, switchConnection, handleStreamAuthFailure };
}
