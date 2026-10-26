import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ACCESS_BLOCKED_MESSAGE, AccessBlockedError, getAccessHeaders, isAccessBlockedResponse, isAccessHost,
  setAccessCredentials, withAccessHeaderRecord, withAccessHeaders,
} from '@/lib/opencode/client/access';
import { fetchConnection, getRequestHeaders } from '@/lib/opencode/client/fetch';
import { probeConnection } from '@/lib/opencode/client/probe';
import { classifyConnectionFailure, getConnectionErrorMessage, isRetryableConnectionFailure } from '@/lib/opencode/client/errors';
import { classifyConnectionError } from '@/lib/opencode/connection-hints';

vi.mock('@/lib/opencode/data-usage', () => ({ recordBytes: vi.fn(), recordRequest: vi.fn() }));
vi.mock('@/lib/opencode/client/types', () => ({ defaultConnectionSettings: { serverUrl: 'http://localhost' } }));
vi.mock('expo/fetch', () => ({ fetch: (...args: any[]) => (globalThis.fetch as any)(...args) }));

// Fake placeholder values only; never real credentials.
const creds = { clientId: 'test-id.access', clientSecret: 'test-secret' };
const settings = { serverUrl: 'https://oc.example.test', username: '', password: '', directory: '' };

beforeEach(() => setAccessCredentials(undefined));
afterEach(() => { vi.unstubAllGlobals(); setAccessCredentials(undefined); });

describe('Access header helper', () => {
  it('sends nothing unless both values are set', () => {
    expect(getAccessHeaders({ clientId: '', clientSecret: '' })).toEqual({});
    expect(getAccessHeaders({ clientId: 'id', clientSecret: '' })).toEqual({});
    expect(getAccessHeaders({ clientId: '  ', clientSecret: 's' })).toEqual({});
    expect(getAccessHeaders({ clientId: ' id ', clientSecret: 's' })).toEqual({ 'CF-Access-Client-Id': 'id', 'CF-Access-Client-Secret': 's' });
  });

  it('uses the cached credentials and merges without dropping existing headers', () => {
    expect(withAccessHeaders({ Accept: 'application/json' })).toEqual({ Accept: 'application/json' });
    setAccessCredentials(creds);
    const merged = new Headers(withAccessHeaders({ Accept: 'application/json', Authorization: 'Basic x' }));
    expect(merged.get('accept')).toBe('application/json');
    expect(merged.get('authorization')).toBe('Basic x');
    expect(merged.get('cf-access-client-id')).toBe('test-id.access');
    expect(merged.get('cf-access-client-secret')).toBe('test-secret');
    expect(withAccessHeaderRecord({ Authorization: 'Basic x' })).toEqual({ Authorization: 'Basic x', 'CF-Access-Client-Id': 'test-id.access', 'CF-Access-Client-Secret': 'test-secret' });
    expect(getRequestHeaders(settings)).toEqual({ 'CF-Access-Client-Id': 'test-id.access', 'CF-Access-Client-Secret': 'test-secret' });
  });

  it('adds the headers to every fetchConnection request, including Request inputs and event streams', async () => {
    setAccessCredentials(creds);
    const transport = vi.fn(async () => new Response('{}', { headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', transport);
    await fetchConnection('https://oc.example.test/api/info');
    await fetchConnection(new Request('https://oc.example.test/api/session', { headers: { 'x-a': '1' } }));
    await fetchConnection('https://oc.example.test/api/event', { headers: { Accept: 'text/event-stream' } });
    await fetchConnection('https://oc.example.test/auth/connect/code', { redirect: 'manual' });
    expect(transport).toHaveBeenCalledTimes(4);
    for (const call of transport.mock.calls as unknown as [unknown, RequestInit][]) {
      expect(new Headers(call[1].headers).get('cf-access-client-id')).toBe('test-id.access');
      expect(new Headers(call[1].headers).get('cf-access-client-secret')).toBe('test-secret');
    }
    expect(new Headers((transport.mock.calls[1] as any)[1].headers).get('x-a')).toBe('1');
  });
});

describe('Access block detection', () => {
  const response = (body: string, init: ResponseInit) => new Response(body, init);

  it('matches Access hosts only', () => {
    expect(isAccessHost('https://team.cloudflareaccess.com/cdn-cgi/access/login')).toBe(true);
    expect(isAccessHost('https://cloudflareaccess.com/')).toBe(true);
    expect(isAccessHost('https://evilcloudflareaccess.com/')).toBe(false);
    expect(isAccessHost('https://oc.example.test/login')).toBe(false);
    expect(isAccessHost(null)).toBe(false);
  });

  it('detects a redirect to cloudflareaccess.com', async () => {
    expect(await isAccessBlockedResponse(response('', { status: 302, headers: { location: 'https://team.cloudflareaccess.com/cdn-cgi/access/login/oc' } }))).toBe(true);
    expect(await isAccessBlockedResponse(response('', { status: 301, headers: { location: 'https://team.cloudflareaccess.com/' } }))).toBe(true);
    expect(await isAccessBlockedResponse(response('', { status: 302, headers: { location: 'https://oc.example.test/other' } }))).toBe(false);
  });

  it('detects a 403 from Access by headers or body, but not a plain 403', async () => {
    expect(await isAccessBlockedResponse(response('denied', { status: 403, headers: { 'cf-access-domain': 'oc.example.test' } }))).toBe(true);
    expect(await isAccessBlockedResponse(response('<html>Forbidden. Cloudflare Access denied this request</html>', { status: 403, headers: { 'content-type': 'text/html' } }))).toBe(true);
    expect(await isAccessBlockedResponse(response('{"error":"forbidden"}', { status: 403, headers: { 'content-type': 'application/json' } }))).toBe(false);
  });

  it('detects an Access HTML login page where JSON was expected', async () => {
    const login = '<html><head><title>Sign in ・ Cloudflare Access</title></head><body><form action="https://team.cloudflareaccess.com/cdn-cgi/access/login"></form></body></html>';
    expect(await isAccessBlockedResponse(response(login, { status: 200, headers: { 'content-type': 'text/html' } }))).toBe(true);
    expect(await isAccessBlockedResponse(response(login, { status: 200, headers: { 'content-type': 'text/html' } }), { expectJson: false })).toBe(false);
    expect(await isAccessBlockedResponse(response('<html>OpenCode web</html>', { status: 200, headers: { 'content-type': 'text/html' } }))).toBe(false);
    expect(await isAccessBlockedResponse(response('{}', { status: 200, headers: { 'content-type': 'application/json' } }))).toBe(false);
  });

  it('fetchConnection throws AccessBlockedError and leaves normal errors alone', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 302, headers: { location: 'https://team.cloudflareaccess.com/x' } })));
    await expect(fetchConnection('https://oc.example.test/api/info', { redirect: 'manual' })).rejects.toBeInstanceOf(AccessBlockedError);
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })));
    expect((await fetchConnection('https://oc.example.test/api/info')).status).toBe(500);
  });

  it('the health check reports access-blocked instead of unreachable/auth', async () => {
    const transport = vi.fn(async (_url: string, init: RequestInit) => {
      expect(init.redirect).toBe('manual');
      return new Response('', { status: 302, headers: { location: 'https://team.cloudflareaccess.com/login' } });
    });
    vi.stubGlobal('fetch', transport);
    expect(await probeConnection(settings)).toEqual({ status: 'access-blocked' });
  });

  it('maps an Access block to the clear message, not the generic offline error, and stops retries', () => {
    const error = new AccessBlockedError(403);
    expect(error.message).toBe('Cloudflare Access token missing or wrong');
    expect(getConnectionErrorMessage(error, settings.serverUrl)).toBe(ACCESS_BLOCKED_MESSAGE);
    expect(classifyConnectionFailure(error)).toBe('access-blocked');
    expect(isRetryableConnectionFailure('access-blocked')).toBe(false);
    expect(classifyConnectionError(error.message)).toBe('access');
  });
});
