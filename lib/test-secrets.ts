import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Web credentials exist only in the explicit development E2E build and vanish
// on reload. Product web builds continue to have no credential persistence.
const testSecrets = new Map<string, string>();

function enabled() {
  const extra = Constants.expoConfig?.extra;
  return Platform.OS === 'web' && extra?.e2eMode === true && extra?.webTestSecrets === true;
}

export function getTestSecret(key: string) {
  return enabled() ? testSecrets.get(key) ?? '' : '';
}

export function setTestSecret(key: string, value: string) {
  if (!enabled()) return;
  if (value) testSecrets.set(key, value); else testSecrets.delete(key);
}
