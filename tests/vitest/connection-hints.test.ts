import { describe, expect, it } from 'vitest';

import { classifyConnectionError, isLoopbackServerUrl } from '@/lib/opencode/connection-hints';
import { readFileSync } from 'node:fs';

describe('connection hints', () => {
  it('flags addresses that point at the device itself', () => {
    for (const url of ['http://127.0.0.1:4096', '127.0.0.1:4096', 'http://localhost:4096', 'https://LOCALHOST', 'http://[::1]:4096', 'http://0.0.0.0:4096', 'http://127.1.2.3']) {
      expect(isLoopbackServerUrl(url), url).toBe(true);
    }
    for (const url of ['', 'http://10.0.2.2:4096', 'http://192.168.1.10:4096', 'https://opencode.example.com', 'https://localhost.example.com', 'not a url']) {
      expect(isLoopbackServerUrl(url), url).toBe(false);
    }
  });

  it('turns raw transport errors into friendly kinds', () => {
    expect(classifyConnectionError('fetch failed: ConnectException: Failed to connect to /127.0.0.1:4096')).toBe('unreachable');
    expect(classifyConnectionError('Network request failed')).toBe('unreachable');
    expect(classifyConnectionError('Request timed out after 10000ms')).toBe('timeout');
    expect(classifyConnectionError('HTTP 401 Unauthorized')).toBe('auth');
    expect(classifyConnectionError('SSL handshake aborted')).toBe('tls');
    expect(classifyConnectionError('Connected to OpenCode 2')).toBe('other');
  });

  it('gives sheets, dialogs and modals opaque surfaces and a dim scrim', () => {
    const theme = readFileSync('constants/theme.ts', 'utf8');
    expect(theme).toContain('sheet: palette.bgRaised');
    expect(theme).toContain('modalBackground: palette.bg');
    for (const file of ['components/ui/overlay-sheet.tsx', 'components/ui/native-select.tsx', 'components/chat/model-picker.tsx']) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).toContain('backgroundColor: palette.sheet');
      expect(source, file).toContain('palette.scrim');
    }
    const alpha = Number(/scrim: 'rgba\(0, 0, 0, ([\d.]+)\)'/.exec(theme)?.[1]);
    expect(alpha).toBeGreaterThanOrEqual(0.5);
  });
});
