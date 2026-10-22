import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { getTestSecret, setTestSecret } from '@/lib/test-secrets';

// Cloudflare Access service-token credentials. Stored only in secure storage
// (never AsyncStorage) and never logged.
// TODO: send these as CF-Access-Client-Id / CF-Access-Client-Secret headers
// once the OpenCode client supports custom request headers.
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

export async function saveCloudflareAccessCredentials({ clientId, clientSecret }: CloudflareAccessCredentials) {
  await write(CLIENT_ID_KEY, clientId.trim());
  await write(CLIENT_SECRET_KEY, clientSecret);
}
