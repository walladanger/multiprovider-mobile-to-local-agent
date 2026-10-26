import { describe, expect, it, vi } from 'vitest';
import { deferred, hookRuntime, loadTs } from '../helpers/runtime.mjs';

type Element = { type: unknown; props: Record<string, any> };
function find(root: Element | Element[], testID: string): Element | undefined {
  if (Array.isArray(root)) return root.map((child) => find(child, testID)).find(Boolean);
  if (!root || typeof root !== 'object') return;
  if (root.props?.testID === testID || root.type === testID) return root;
  return find(root.props?.children, testID);
}
async function form(onSubmit = vi.fn()) {
  const hints = await import('@/lib/opencode/connection-hints');
  const runtime = hookRuntime();
  const probe = vi.fn(async () => ({ status: 'detected', contract: 'v2' }));
  const saveAccess = vi.fn(async () => {});
  const { ConnectionProfileDialog } = await loadTs('components/settings/connection-profile-dialog.tsx', {
    react: runtime.react,
    'react/jsx-runtime': { jsx: (type: unknown, props: Record<string, unknown>) => ({ type, props }), jsxs: (type: unknown, props: Record<string, unknown>) => ({ type, props }), Fragment: 'Fragment' },
    'react-i18next': { useTranslation: () => ({ t: (key: string) => key }) },
    'react-native': { Keyboard: { dismiss: () => {} }, StyleSheet: { create: (styles: unknown) => styles }, View: 'View', Modal: 'Modal', KeyboardAvoidingView: 'KeyboardAvoidingView', ScrollView: 'ScrollView' },
    'react-native-paper': { Appbar: { Header: 'Header', BackAction: 'BackAction', Content: 'Content' }, Button: 'Button', HelperText: 'HelperText', Text: 'Text', TextInput: { Icon: 'Icon' } },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '@/components/ui/text-input': { TextInput: 'Input' },
    '@/constants/theme': { Colors: { light: {} } },
    '@/hooks/use-update-blocker': { useUpdateBlocker: () => {} },
    '@/hooks/use-color-scheme': { useColorScheme: () => 'light' },
    '@/lib/opencode/client': { isValidServerUrl: () => true },
    '@/lib/opencode/client/url': { getServerHostname: () => '192.168.1.10' },
    '@/components/ui/connection-error-text': { LoopbackWarning: (props: { serverUrl: string; isLoopback: (url: string) => boolean; testID: string }) => (props.isLoopback(props.serverUrl) ? { type: 'Warning', props: { testID: props.testID } } : null) },
    '@/lib/opencode/connection-hints': hints,
    '@/lib/cloudflare-access-secrets': { saveCloudflareAccessCredentials: saveAccess, getCloudflareAccessCredentials: async () => ({ clientId: '', clientSecret: '' }) },
    '@/providers/opencode-contexts': { useConnection: () => ({ connectionProfiles: { probe } }) },
  }, { Error });
  const onDismiss = vi.fn();
  const onBusyChange = vi.fn();
  runtime.mount(ConnectionProfileDialog, { title: 'Add connection', submitLabel: 'Save', onSubmit, onDismiss, onBusyChange });
  const element = (id: string) => { const value = find(runtime.value, id); if (!value) throw new Error(`Missing ${id}`); return value; };
  const change = (id: string, value: string) => { element(id).props.onChangeText(value); runtime.flush(); };
  const press = async (id: string) => { element(id).props.onPress(); await runtime.settle(); };
  return { runtime, saveAccess, probe, onSubmit, onDismiss, onBusyChange, element, change, press };
}

describe('manual connection form', () => {
  it('warns inline when the address points at the phone itself', async () => {
    const view = await form();
    const warning = () => {
      const element = view.element('connection-profile-loopback-warning');
      return (element.type as (props: unknown) => unknown)(element.props);
    };
    expect(warning()).toBeNull();
    view.change('connection-profile-url-input', 'http://127.0.0.1:4096');
    expect(warning()).toBeTruthy();
    view.change('connection-profile-url-input', 'http://10.0.2.2:4096');
    expect(warning()).toBeNull();
  });

  it('shows field hints and keeps Cloudflare Access collapsed until requested', async () => {
    const view = await form();
    expect(view.element('connection-profile-url-input').props.placeholder).toBe('https://opencode.example.com');
    expect(view.element('connection-profile-url-hint').props.children).toBe('settings:connection.setup.serverUrlFieldHint');
    expect(find(view.runtime.value, 'connection-profile-advanced')).toBeUndefined();
    await view.press('connection-profile-advanced-toggle');
    view.change('connection-profile-cf-client-id-input', 'id.access');
    view.change('connection-profile-cf-client-secret-input', 'cf-secret');
    expect(view.element('connection-profile-cf-client-secret-input').props.secureTextEntry).toBe(true);
    view.change('connection-profile-url-input', 'https://opencode.example.com');
    await view.press('connection-profile-continue');
    view.change('connection-profile-password-input', 'secret');
    await view.press('connection-profile-save-confirm');
    expect(view.saveAccess).toHaveBeenCalledWith({ clientId: 'id.access', clientSecret: 'cf-secret' });
    expect(view.onSubmit).toHaveBeenCalled();
  });

  it('shows V2 details without a username and preserves values when changing the address', async () => {
    const view = await form();
    view.change('connection-profile-url-input', 'http://192.168.1.10:49374');
    await view.press('connection-profile-continue');
    expect(find(view.runtime.value, 'connection-profile-username-input')).toBeUndefined();
    expect(view.element('connection-profile-name-input').props.placeholder).toBe('192.168.1.10');
    view.change('connection-profile-name-input', 'Office');
    view.change('connection-profile-password-input', 'secret');
    await view.press('connection-profile-change');
    expect(view.element('connection-profile-url-input').props.value).toBe('http://192.168.1.10:49374');
    await view.press('connection-profile-continue');
    expect(view.element('connection-profile-name-input').props.value).toBe('Office');
    expect(view.element('connection-profile-password-input').props.value).toBe('secret');
  });
  it('preserves uncertainty and allows V1 custom credentials', async () => {
    const view = await form();
    view.probe.mockResolvedValue({ status: 'authentication-required' } as any);
    view.change('connection-profile-url-input', 'http://example.test');
    await view.press('connection-profile-continue');
    expect(view.element('connection-profile-detection').props.children).toBe('settings:connection.setup.identify');
    expect(find(view.runtime.value, 'connection-profile-username-input')).toBeUndefined();
    await view.press('connection-profile-custom-username');
    view.change('connection-profile-username-input', 'alice');
    view.change('connection-profile-password-input', 'secret');
    view.probe.mockResolvedValue({ status: 'detected', contract: 'v1' });
    await view.press('connection-profile-save-confirm');
    expect(view.onSubmit).toHaveBeenCalledWith({ name: '', serverUrl: 'http://example.test', username: 'alice', password: 'secret' });
  });
  it('ignores a probe completed after Back and guards duplicate Continue', async () => {
    const view = await form();
    const gate = deferred();
    view.probe.mockReturnValue(gate.promise);
    view.change('connection-profile-url-input', 'http://example.test');
    view.element('connection-profile-continue').props.onPress();
    view.element('connection-profile-continue').props.onPress();
    view.runtime.flush();
    expect(view.probe).toHaveBeenCalledOnce();
    expect(view.onBusyChange).toHaveBeenLastCalledWith(true);
    await view.press('BackAction');
    expect(view.onDismiss).toHaveBeenCalledOnce();
    expect(view.onBusyChange).toHaveBeenLastCalledWith(false);
    gate.resolve({ status: 'detected', contract: 'v2' });
    await view.runtime.settle();
    expect(find(view.runtime.value, 'connection-profile-name-input')).toBeUndefined();
  });
});
