import CanvasKitInit from 'canvaskit-wasm';
import { describe, expect, it } from 'vitest';

import { BALLS_SOURCE, SHADER_KINDS, SHADER_SOURCES } from '../../lib/backgrounds/shader-sources';

// Compiles every SkSL source with CanvasKit (same SkSL compiler as react-native-skia) so a typo
// fails here instead of rendering a blank background on the phone.
describe('SkSL sources compile', () => {
  it('every shader and the ball shader compile', async () => {
    const CK = await CanvasKitInit();
    for (const [name, src] of [...SHADER_KINDS.map((k) => [k, SHADER_SOURCES[k]] as const), ['balls', BALLS_SOURCE] as const]) {
      let error = '';
      const effect = CK.RuntimeEffect.Make(src, (e: string) => { error += e; });
      expect(effect, `${name}: ${error}`).toBeTruthy();
      effect?.delete();
    }
  }, 30000);
});
