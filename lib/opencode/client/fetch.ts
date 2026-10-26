import { encode as encodeBase64 } from 'base-64';
import { fetch as expoFetch } from 'expo/fetch';

import { recordBytes, recordRequest } from '../data-usage';
import { joinUrlPath } from './url';
import type { OpencodeConnectionSettings } from './types';
import { fetchWithReadDeadline } from './read-deadline';
import { AccessBlockedError, getAccessHeaders, isAccessBlockedResponse, withAccessHeaders } from './access';

export function createAuthHeader(settings: OpencodeConnectionSettings) {
  const password = settings.password;
  if (!password) {
    return undefined;
  }

  const username = settings.username.trim() || 'opencode';
  const bytes = new TextEncoder().encode(`${username}:${password}`);
  return `Basic ${encodeBase64(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))}`;
}

export function getRequestHeaders(settings: OpencodeConnectionSettings) {
  const authHeader = createAuthHeader(settings);
  const headers: Record<string, string> = { ...(authHeader ? { Authorization: authHeader } : {}), ...getAccessHeaders() };
  return Object.keys(headers).length ? headers : undefined;
}

export async function fetchConnection(input: RequestInfo | URL, init?: RequestInit, settings?: OpencodeConnectionSettings) {
  // RN's XHR ignores redirect rejection. Use Expo for one-use local pairing
  // requests; other connections retain their transport.
  // `manual` (health checks) also needs Expo so an Access 302 stays visible.
  const redirect = init?.redirect;
  const transport = redirect === 'error' || redirect === 'manual'
    ? (input: RequestInfo | URL, init?: RequestInit) => expoFetch(input as string, { ...init, redirect } as never) as unknown as Promise<Response>
    : fetch;
  // Every OpenCode request (SDK calls, SSE, probes, pairing) passes through
  // here, so this is the one place the Cloudflare Access headers are added.
  const inputHeaders = typeof input === 'object' && !(input instanceof URL) ? input.headers : undefined;
  init = { ...init, headers: withAccessHeaders(init?.headers ?? inputHeaders) };
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const method = init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET');
  const finiteRead = /^(GET|HEAD)$/i.test(method) && !/\/event\/?(?:\?|$)/.test(url);
  const response = finiteRead ? await fetchWithReadDeadline(transport, input, init) : await transport(input, init);
  recordRequest();
  measureResponseBytes(response);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream') && (response.status === 403 || (response.status >= 300 && response.status < 400) || response.redirected || contentType.includes('text/html'))
    && await isAccessBlockedResponse(response)) {
    throw new AccessBlockedError(response.status);
  }
  return response;
}

// shortcut: counts advertised body sizes only; add streaming accounting if exact
// network diagnostics become necessary, never buffer a second copy to count it.
function measureResponseBytes(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream')) {
    return;
  }
  const lengthHeader = response.headers.get('content-length');
  const length = lengthHeader ? Number(lengthHeader) : NaN;
  if (Number.isFinite(length) && length >= 0) {
    recordBytes(length);
    return;
  }
}

export function createScopedFetch(baseUrl: string, pathPrefix: string, directory?: string, settings?: OpencodeConnectionSettings) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const currentUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const parsed = new URL(currentUrl, baseUrl);

    if (parsed.origin === baseUrl && pathPrefix && !parsed.pathname.startsWith(`${pathPrefix}/`) && parsed.pathname !== pathPrefix) {
      parsed.pathname = joinUrlPath(pathPrefix, parsed.pathname);
    }
    if (parsed.origin === baseUrl && directory && !parsed.searchParams.has('directory')) {
      parsed.searchParams.set('directory', directory);
    }

    if (typeof input === 'string' || input instanceof URL) {
      return fetchConnection(parsed.toString(), init, settings);
    }

    return fetchConnection(parsed.toString(), {
      body: input.method === 'GET' || input.method === 'HEAD' ? undefined : await input.text(),
      credentials: input.credentials,
      headers: input.headers,
      method: input.method,
      signal: input.signal,
      ...init,
    }, settings);
  };
}

export function createPrefixFetch(origin: string, pathPrefix: string, settings?: OpencodeConnectionSettings) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const currentUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const parsed = new URL(currentUrl, origin);

    if (parsed.origin === origin && pathPrefix && !parsed.pathname.startsWith(`${pathPrefix}/`) && parsed.pathname !== pathPrefix) {
      parsed.pathname = joinUrlPath(pathPrefix, parsed.pathname);
    }

    if (typeof input === 'string' || input instanceof URL) {
      return fetchConnection(parsed.toString(), init, settings);
    }

    return fetchConnection(parsed.toString(), {
      body: input.method === 'GET' || input.method === 'HEAD' ? undefined : await input.text(),
      credentials: input.credentials,
      headers: input.headers,
      method: input.method,
      signal: input.signal,
      ...init,
    }, settings);
  };
}
