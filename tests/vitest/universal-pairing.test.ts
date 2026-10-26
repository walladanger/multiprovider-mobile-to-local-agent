import { describe, expect, it, vi } from 'vitest';

import { buildUniversalPairingUrl, CONNECTION_TYPES, parseUniversalPairing, UniversalPairingError } from '@/lib/pairing/universal';

vi.mock('@/lib/opencode/client/types', () => ({ defaultConnectionSettings: { serverUrl: 'http://127.0.0.1:4096' } }));
vi.mock('@/lib/opencode/client/fetch', () => ({ fetchConnection: vi.fn() }));
vi.mock('@/lib/opencode/client/probe', () => ({ probeConnection: vi.fn() }));


const reason = (fn: () => unknown) => { try { fn(); } catch (e) { return (e as UniversalPairingError).reason; } return 'ok'; };

describe('universal pairing payload', () => {
  it('parses an opencode v1 custom-scheme link into the existing pairing input', () => {
    const link = buildUniversalPairingUrl('opencode', ['http://192.168.1.5:4096'], { code: 'abc_123' });
    const p = parseUniversalPairing(link);
    expect(p).toMatchObject({ version: 1, type: 'opencode', urls: ['http://192.168.1.5:4096'] });
    expect(JSON.parse(p.input)).toEqual({ urls: ['http://192.168.1.5:4096'], code: 'abc_123' });
  });

  it('accepts the https App Link host and rejects other hosts as universal', () => {
    const link = buildUniversalPairingUrl('opencode', ['https://box.example:4096'], { code: 'x' }, 'https://opencode.8466crosstimbers.com/connect');
    expect(parseUniversalPairing(link).version).toBe(1);
    const other = buildUniversalPairingUrl('opencode', ['https://box.example:4096'], { code: 'x' }, 'https://evil.example/connect');
    expect(reason(() => parseUniversalPairing(other))).toBe('invalid');
  });

  it('keeps accepting existing opencode pair URLs and JSON payloads', () => {
    expect(parseUniversalPairing('http://10.0.0.2:4096/auth/connect/CODE1')).toMatchObject({ version: 0, type: 'opencode', urls: ['http://10.0.0.2:4096'] });
    expect(parseUniversalPairing('{"urls":["http://10.0.0.2:4096"],"code":"c"}').type).toBe('opencode');
    const wrapped = buildUniversalPairingUrl('opencode', [], { pair: 'http://10.0.0.2:4096/auth/connect/CODE1' });
    expect(parseUniversalPairing(wrapped).urls).toEqual(['http://10.0.0.2:4096']);
  });

  it('marks other types as coming soon', () => {
    for (const type of ['models', 'invoke', 'comfyui'] as const) {
      expect(CONNECTION_TYPES[type].status).toBe('comingSoon');
      expect(parseUniversalPairing(buildUniversalPairingUrl(type, ['http://10.0.0.3:8188'])).type).toBe(type);
    }
  });

  it('rejects bad versions, types and credentials in URLs', () => {
    expect(reason(() => parseUniversalPairing('opencodemobile://connect?v=9&type=opencode&url=http://a&code=x'))).toBe('unsupportedVersion');
    expect(reason(() => parseUniversalPairing('opencodemobile://connect?v=1&type=nope&url=http://a'))).toBe('unknownType');
    expect(reason(() => parseUniversalPairing('opencodemobile://connect?v=1&type=opencode&url=http://u:p@a&code=x'))).toBe('invalid');
    expect(reason(() => parseUniversalPairing('opencodemobile://connect?v=1&type=opencode&url=http://a'))).toBe('invalid');
    expect(reason(() => parseUniversalPairing('hello'))).toBe('invalid');
  });
});
