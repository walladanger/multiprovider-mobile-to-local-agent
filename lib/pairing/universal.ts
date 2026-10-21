/**
 * Versioned universal pairing payloads, e.g.
 *   opencodemobile://connect?v=1&type=opencode&url=https://host:4096&code=abc
 *   https://opencode.8466crosstimbers.com/connect?v=1&type=opencode&url=...&code=...
 * Existing OpenCode pair links / QR payloads (see lib/opencode/pairing.ts) are
 * still accepted and mapped to type "opencode".
 *
 * Connection types live in an extensible registry; only "opencode" is
 * implemented, the others are stubs that the UI shows as "coming soon".
 * Pure module: never logs or echoes secrets.
 */
import { parseLocalPairing } from '@/lib/opencode/pairing';

export const PAIRING_SCHEME = 'opencodemobile';
export const DEFAULT_PAIRING_HOST = 'opencode.8466crosstimbers.com';
export const PAIRING_VERSION = 1;

export type ConnectionTypeId = 'opencode' | 'models' | 'invoke' | 'comfyui';

export type UniversalPairing = {
  version: number;
  type: ConnectionTypeId;
  /** Server addresses (no credentials). */
  urls: string[];
  /** Input for the type's own pairing implementation (may contain a one-time secret; never log it). */
  input: string;
};

export type ConnectionTypeDefinition = {
  id: ConnectionTypeId;
  label: string;
  status: 'available' | 'comingSoon';
  /** Build the type-specific pairing input from universal params. Throws on invalid input. */
  fromParams: (params: PairingParams) => { urls: string[]; input: string };
};

export class UniversalPairingError extends Error {
  constructor(public reason: 'invalid' | 'unsupportedVersion' | 'unknownType') { super(reason); }
}

/** Minimal query parser (React Native's URL/URLSearchParams polyfills are incomplete for custom schemes). */
export class PairingParams {
  private entries: [string, string][];
  constructor(query: string) {
    this.entries = query.replace(/^\?/, '').split('&').filter(Boolean).map((part) => {
      const i = part.indexOf('=');
      const dec = (v: string) => decodeURIComponent(v.replace(/\+/g, ' '));
      return i < 0 ? [dec(part), ''] : [dec(part.slice(0, i)), dec(part.slice(i + 1))];
    });
  }
  get(key: string) { return this.entries.find(([k]) => k === key)?.[1] ?? null; }
  getAll(key: string) { return this.entries.filter(([k]) => k === key).map(([, v]) => v); }
  has(key: string) { return this.entries.some(([k]) => k === key); }
}

function httpUrls(params: PairingParams) {
  const urls = params.getAll('url').map((u) => u.trim()).filter(Boolean);
  if (!urls.length || urls.length > 16) throw new UniversalPairingError('invalid');
  for (const u of urls) {
    const parsed = new URL(u);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new UniversalPairingError('invalid');
  }
  return urls;
}

const stub = (id: ConnectionTypeId, label: string): ConnectionTypeDefinition => ({
  id, label, status: 'comingSoon',
  fromParams: (params) => ({ urls: httpUrls(params), input: '' }),
});

export const CONNECTION_TYPES: Record<ConnectionTypeId, ConnectionTypeDefinition> = {
  opencode: {
    id: 'opencode',
    label: 'OpenCode',
    status: 'available',
    fromParams: (params) => {
      // `pair` carries a complete legacy OpenCode pair URL / JSON payload.
      const legacy = params.get('pair');
      if (legacy) {
        const parsed = parseLocalPairing(legacy);
        return { urls: parsed.urls, input: legacy };
      }
      const urls = httpUrls(params);
      const code = params.get('code') ?? '';
      if (!/^[A-Za-z0-9_-]{1,256}$/.test(code)) throw new UniversalPairingError('invalid');
      const input = JSON.stringify({ urls, code });
      parseLocalPairing(input); // validate with the existing parser
      return { urls, input };
    },
  },
  models: stub('models', 'Model server'),
  invoke: stub('invoke', 'InvokeAI'),
  comfyui: stub('comfyui', 'ComfyUI'),
};

export function registerConnectionType(def: ConnectionTypeDefinition) {
  CONNECTION_TYPES[def.id] = def;
}

const SCHEME_RE = new RegExp(`^${PAIRING_SCHEME}://connect/?(?:\\?([^#]*))?(?:#.*)?$`, 'i');
const HTTPS_RE = /^https:\/\/([^/?#:]+)(?::\d+)?\/connect[^?#]*\?([^#]*)/i;

/** Returns the query string when `value` is a universal pairing link. */
function universalQuery(value: string, hosts: string[]): string | undefined {
  const scheme = SCHEME_RE.exec(value);
  if (scheme) return scheme[1] ?? '';
  const https = HTTPS_RE.exec(value);
  if (https && hosts.map((h) => h.toLowerCase()).includes(https[1].toLowerCase())) return https[2];
  return undefined;
}

/** Parses a scanned / opened value into a universal pairing. */
export function parseUniversalPairing(value: string, hosts: string[] = [DEFAULT_PAIRING_HOST]): UniversalPairing {
  const trimmed = value.trim();
  if (trimmed.length > 16_384) throw new UniversalPairingError('invalid');
  const query = universalQuery(trimmed, hosts);
  const params = query !== undefined ? new PairingParams(query) : undefined;
  if (params?.has('v')) {
    const version = Number(params.get('v'));
    if (!Number.isInteger(version) || version < 1) throw new UniversalPairingError('invalid');
    if (version > PAIRING_VERSION) throw new UniversalPairingError('unsupportedVersion');
    const type = (params.get('type') ?? 'opencode') as ConnectionTypeId;
    const def = Object.prototype.hasOwnProperty.call(CONNECTION_TYPES, type) ? CONNECTION_TYPES[type] : undefined;
    if (!def) throw new UniversalPairingError('unknownType');
    try {
      return { version, type, ...def.fromParams(params) };
    } catch (e) {
      throw e instanceof UniversalPairingError ? e : new UniversalPairingError('invalid');
    }
  }
  // Legacy OpenCode pair links and QR payloads.
  try {
    const parsed = parseLocalPairing(trimmed);
    return { version: 0, type: 'opencode', urls: parsed.urls, input: trimmed };
  } catch {
    throw new UniversalPairingError('invalid');
  }
}

/** Builds a universal pairing link (used by scripts/make-pair-qr.mjs and tests). */
export function buildUniversalPairingUrl(type: ConnectionTypeId, urls: string[], extra: Record<string, string> = {}, base = `${PAIRING_SCHEME}://connect`) {
  const enc = encodeURIComponent;
  const parts = [`v=${PAIRING_VERSION}`, `type=${enc(type)}`, ...urls.map((u) => `url=${enc(u)}`), ...Object.entries(extra).map(([k, v]) => `${enc(k)}=${enc(v)}`)];
  return `${base}?${parts.join('&')}`;
}
