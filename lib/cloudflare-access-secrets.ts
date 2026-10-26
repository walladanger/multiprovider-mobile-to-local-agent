import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { getTestSecret, setTestSecret } from '@/lib/test-secrets';
import { setAccessCredentials } from '@/lib/opencode/client/access';

// Cloudflare Access service-token credentials. Stored only in secure storage
// (never AsyncStorage) and never logged.
// Loaded values are mirrored into lib/opencode/client/access.ts, which adds the
// CF-Access-Client-Id / CF-Access-Client-Secret headers to every server request.
const CLIENT_ID_KEY = 'opencode-mobile.cf-access-client-id';
const CLIENT_SECRET_KEY = 'opencode-mobile.cf-access-client-secret';

export type CloudflareAccessCredentials = { clientId: string; clientSecret: string };

async function write(key: string, value: string) {
  if (Platform.OS === 'web') { setTestSecret(key, value); return; }
  if (value) await SecureStore.setItemAsync(key, value);
  else await SecureStore.deleteItemAsync(key);
}

async function read(key: string) {
  if (Platform.OS === 'web') return getTestSecret(key);
  return (await SecureStore.getItemAsync(key)) ?? '';
}

export async function getCloudflareAccessCredentials(): Promise<CloudflareAccessCredentials> {
  return { clientId: await read(CLIENT_ID_KEY), clientSecret: await read(CLIENT_SECRET_KEY) };
}

/** Reads secure storage into the request-header cache. Call before connecting. */
export async function loadCloudflareAccessCredentials() {
  try {
    const credentials = await getCloudflareAccessCredentials();
    setAccessCredentials(credentials);
    return credentials;
  } catch {
    return { clientId: '', clientSecret: '' };
  }
}

export async function saveCloudflareAccessCredentials({ clientId, clientSecret }: CloudflareAccessCredentials) {
  await write(CLIENT_ID_KEY, clientId.trim());
  await write(CLIENT_SECRET_KEY, clientSecret);
  setAccessCredentials({ clientId, clientSecret });
}
