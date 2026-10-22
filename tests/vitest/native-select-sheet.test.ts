import { describe, expect, it } from 'vitest';
import { hookRuntime, loadTs } from '../helpers/runtime.mjs';

type Element = { type: unknown; props: Record<string, any> };
function find(root: unknown, testID: string): Element | undefined {
  if (Array.isArray(root)) return root.map((child) => find(child, testID)).find(Boolean);
  if (!root || typeof root !== 'object') return;
  const element = root as Element;
  if (element.props?.testID === testID) return element;
  return find(element.props?.children, testID);
}
const flatten = (style: unknown): Record<string, unknown> => Array.isArray(style) ? Object.assign({}, ...style.map(flatten)) : (style as Record<string, unknown>) ?? {};

async function mountSelect(insets = { top: 47, bottom: 34 }) {
  const runtime = hookRuntime();
  const el = (type: unknown, props: Record<string, unknown>) => ({ type, props });
  const module = await loadTs('components/ui/native-select.tsx', {
    react: runtime.react,
    'react/jsx-runtime': { jsx: el, jsxs: el, Fragment: 'Fragment' },
    '@expo/vector-icons': { MaterialCommunityIcons: 'Icon' },
    'react-i18next': { useTranslation: () => ({ t: (key: string) => key }) },
    'react-native': { ActionSheetIOS: {}, Modal: 'Modal', Platform: { OS: 'android' }, Pressable: 'Pressable', ScrollView: 'ScrollView', StyleSheet: { create: (s: unknown) => s, absoluteFill: {} }, Text: 'Text', View: 'View' },
    'react-native-gesture-handler': { GestureDetector: 'GestureDetector', GestureHandlerRootView: 'Root' },
    'react-native-reanimated': { __esModule: true, default: { View: 'AnimatedView' } },
    'react-native-safe-area-context': { useSafeAreaInsets: () => insets },
    '@/hooks/use-update-blocker': { useUpdateBlocker: () => {} },
    '@/constants/theme': { Colors: { light: {} }, Fonts: {} },
    '@/hooks/use-color-scheme': { useColorScheme: () => 'light' },
    '@/hooks/use-keyboard-height': { useKeyboardHeight: () => 0 },
    '@/components/ui/text-input': { TextInput: 'Input' },
    '@/components/ui/use-swipe-dismiss': { useSwipeDismiss: () => ({ pan: {}, sheetStyle: {}, backdropStyle: {}, handleSheetLayout: () => {} }) },
  });
  let open = () => {};
  runtime.mount(module.NativeSelect, {
    onValueChange: () => {}, title: 'Transcript detail', selectedValue: 'basic',
    options: [{ value: 'basic', label: 'Basic' }, { value: 'verbose', label: 'Verbose', description: 'Also show tool calls.' }],
    renderTrigger: (props: { open: () => void }) => { open = props.open; return null; },
  });
  open();
  runtime.flush();
  return { runtime, module };
}

describe('select sheet layout', () => {
  it('keeps the sheet above the navigation bar and below the status bar', async () => {
    const { runtime } = await mountSelect();
    const modal = ((runtime.value as Element).props.children as Element[]).find((child) => child?.type === 'Modal');
    expect(modal?.props.navigationBarTranslucent).toBe(true);
    const sheet = find(runtime.value, 'native-select-sheet');
    expect(flatten(sheet?.props.style).paddingBottom).toBe(34);
    expect(flatten(modal?.props.children.props.style).paddingTop).toBe(47 + 24);
  });

  it('uses a minimum bottom gap and yields to the keyboard', async () => {
    const { module } = await mountSelect({ top: 0, bottom: 0 });
    expect(module.sheetBottomInset({ bottom: 0 }, 0)).toBe(12);
    expect(module.sheetBottomInset({ bottom: 34 }, 300)).toBe(0);
  });
});
