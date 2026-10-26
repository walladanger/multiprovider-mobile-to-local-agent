// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'dist-e2e/*', 'output/**', '.expo/*', 'test-results/**', 'playwright-report/**'],
  },
  {
    // Tabler's per-icon subpath exports use nested conditions eslint-plugin-import can't resolve; Metro can.
    files: ['components/ui/icon.tsx'],
    rules: { 'import/no-unresolved': ['error', { ignore: ['^@tabler/icons-react-native/'] }] },
  },
  {
    // These provider-owned state machines reconcile external events into state.
    files: ['providers/use-conversation-state.ts', 'providers/use-opencode-realtime.ts'],
    rules: { 'react-hooks/set-state-in-effect': 'off' },
  },
]);
