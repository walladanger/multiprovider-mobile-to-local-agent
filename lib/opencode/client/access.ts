// Cloudflare Access service-token support. Every request and connection to the
// OpenCode server takes its Access headers from here. Credentials live in
// secure storage (lib/cloudflare-access-secrets.ts) and are mirrored into this
// in-memory cache; they are never logged.

export type AccessCredentials = { clientId: string; clientSecret: string };

export const ACCESS_BLOCKED_MESSAGE = 'Cloudflare Access token missing or wrong';

let cached: AccessCredentials = { clientId: '', clientSecret: '' };

export function setAccessCredentials(credentials: AccessCredentials | undefined) {
  cached = { clientId: credentials?.clientId.trim() ?? '', clientSecret: credentials?.clientSecret ?? '' };
}

export function hasAccessCredentials(credentials: AccessCredentials = cached) {
  return Boolean(credentials.clientId.trim() && credentials.clientSecret);
}

/** The Access headers, only when both values are set. */
export function getAccessHeaders(credentials: AccessCredentials = cached): Record<string, string> {
  if (!hasAccessCredentials(credentials)) return {};
  return { 'CF-Access-Client-Id': credentials.clientId.trim(), 'CF-Access-Client-Secret': credentials.clientSecret };
}

/** Merges the Access headers into any HeadersInit without dropping existing ones. */
export function withAccessHeaders(headers?: HeadersInit, credentials: AccessCredentials = cached): HeadersInit | undefined {
  const access = getAccessHeaders(credentials);
  if (!Object.keys(access).length) return headers;
  const merged = new Headers(headers);
  for (const [key, value] of Object.entries(access)) merged.set(key, value);
  return merged;
}

/** Plain-object variant for transports (WebSocket) that need a record. */
export function withAccessHeaderRecord(headers: Record<string, string> = {}, credentials: AccessCredentials = cached): Record<string, string> {
  return { ...headers, ...getAccessHeaders(credentials) };
}

export class AccessBlockedError extends Error {
  status: number;
  constructor(status: number) {
    super(ACCESS_BLOCKED_MESSAGE);
    this.name = 'AccessBlockedError';
    this.status = status;
  }
}

export function isAccessHost(value: string | null | undefined) {
  if (!value) return false;
  try {
    const host = new URL(value, 'https://placeholder.invalid').hostname.toLowerCase();
    return host === 'cloudflareaccess.com' || host.endsWith('.cloudflareaccess.com');
  } catch {
    return false;
  }
}

const ACCESS_BODY_PATTERN = /cloudflare\s*access|cloudflareaccess\.com|cf-access/i;

type ResponseLike = Pick<Response, 'status' | 'headers'> & { url?: string; redirected?: boolean; clone?: () => { text: () => Promise<string> } };

/**
 * True when Cloudflare Access (not OpenCode) answered: a redirect to
 * *.cloudflareaccess.com, a 403 carrying Access markers, or an Access HTML
 * login page where JSON was expected. Reads at most a cloned body.
 */
export async function isAccessBlockedResponse(response: ResponseLike, options: { expectJson?: boolean } = {}): Promise<boolean> {
  const { status, headers } = response;
  if (status >= 300 && status < 400 && isAccessHost(headers.get('location'))) return true;
  if (response.redirected && isAccessHost(response.url)) return true;
  const contentType = headers.get('content-type') || '';
  const accessHeaders = Boolean(headers.get('cf-access-domain') || headers.get('cf-access-aud') || /CF_Authorization/i.test(headers.get('set-cookie') || '') || /cloudflare-access|cloudflareaccess/i.test(headers.get('www-authenticate') || ''));
  if (status === 403 && accessHeaders) return true;
  const html = contentType.includes('text/html');
  if (status !== 403 && !(html && (options.expectJson ?? true))) return false;
  if (status !== 403 && accessHeaders) return true;
  const body = await readBody(response);
  return ACCESS_BODY_PATTERN.test(body);
}

async function readBody(response: ResponseLike) {
  try {
    const text = await response.clone?.().text();
    return (text ?? '').slice(0, 64 * 1024);
  } catch {
    return '';
  }
}
