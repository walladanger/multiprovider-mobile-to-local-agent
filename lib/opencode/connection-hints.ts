/** Pure helpers that turn connection settings and errors into user-facing hints. */

/** True when the URL's host is the device itself (localhost, 127.x, ::1, 0.0.0.0). */
export function isLoopbackServerUrl(value: string) {
  const raw = value.trim();
  if (!raw) return false;
  let host: string;
  try {
    host = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`).hostname.toLowerCase();
  } catch {
    return false;
  }
  host = host.replace(/^\[|\]$/g, '');
  return host === 'localhost' || host.endsWith('.localhost') || /^127(\.\d{1,3}){3}$/.test(host) || host === '::1' || host === '0.0.0.0';
}

export type ConnectionErrorKind = 'access' | 'unreachable' | 'timeout' | 'auth' | 'tls' | 'other';

/** Classifies a raw transport message (e.g. "fetch failed: ConnectException …"). */
export function classifyConnectionError(message: string): ConnectionErrorKind {
  const text = message.toLowerCase();
  if (/cloudflare access token missing or wrong|cloudflareaccess\.com/.test(text)) return 'access';
  if (/\b(401|403)\b|unauthori[sz]ed|forbidden|credentials rejected/.test(text)) return 'auth';
  if (/timed? ?out|timeout|deadline/.test(text)) return 'timeout';
  if (/ssl|tls|certificate|handshake/.test(text)) return 'tls';
  if (/fetch failed|network request failed|connectexception|econnrefused|econnreset|enotfound|ehostunreach|enetunreach|failed to connect|unable to resolve host|could not reach|socket|unreachable/.test(text)) return 'unreachable';
  return 'other';
}
