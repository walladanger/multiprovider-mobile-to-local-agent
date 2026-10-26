# Theming

Everything visual flows from **`theme/tokens.ts`** (TS tokens) and **`global.css`** (the same values as CSS
variables for NativeWind / React Native Reusables).

## Runtime appearance (Settings > Appearance)

All appearance code lives in `lib/backgrounds/` (pure, unit-tested) with UI in
`components/settings/sections/background-section.tsx` and state in `providers/background-context.tsx`.

| Feature | Module | How it applies |
| --- | --- | --- |
| Color themes (Deep Indigo default + 6 more) | `color-themes.ts` | `resolveThemeTokens` -> `applyThemeTokens` |
| Style skins (Glass, Solid, Crisp, Compact) | `skins.ts` | radius / panel alpha / blur / border / spacing tokens |
| Fonts (Inter, Manrope, Space Grotesk, IBM Plex Sans, JetBrains Mono; all OFL-1.1) | `fonts.ts`, `components/ui/app-fonts.ts` | `typography` tokens -> `Fonts` + Paper fonts |
| Text size 85-130% (stacks with the OS font scale) | `fonts.ts` | `typography.scale` |
| Icon packs (Material, Lucide, Phosphor, Tabler) | `icon-map.ts`, `components/ui/icon.tsx` | `iconSettings.pack` |
| Animated backgrounds + user presets | `settings.ts`, `components/background/*` | `MotionBackground` registry |

`applyThemeTokens` mutates the token objects in place and notifies subscribers; `useColorScheme()`
subscribes, so any component that reads `Colors[...]`/`tokens` during render updates live. Values captured
in module-level `StyleSheet.create` calls do not update; read tokens at render time for anything themeable.

User presets (AsyncStorage `ui.background.presets.v1`) store the background settings and the whole
appearance (theme, skin, fonts, text size, icon pack).

Contrast: `tests/vitest/color-themes.test.ts` asserts WCAG AA (4.5:1) for body text, muted text, links and
button labels on every theme over every skin's panel opacity. Add new themes there.

### Icons

Use `<Icon name="settings" />`. Add semantic names to `ICON_NAMES` and every pack's table in
`icon-map.ts` / `icon.tsx` (deep imports only, to keep bundles small). Unknown names are rendered as a
MaterialCommunityIcons glyph, else a help icon. Many older screens still import `@expo/vector-icons`
directly; migrate them as they are touched.

## Swapping the UI kit at build time

App code should import primitives from `components/ui` (e.g. `components/ui/rnr` for Button, Card, Input,
Text, Dialog, GlassPanel) rather than from a kit package. To swap kits:

1. Add a sibling folder (e.g. `components/ui/tamagui/`) exporting the same names and props as
   `components/ui/rnr/index.ts`.
2. Point the barrel at it (change the re-export in `components/ui/rnr/index.ts`, or add a Metro
   `resolver.resolveRequest` alias selected by an env var such as `EXPO_PUBLIC_UI_KIT`, the same way
   `metro.config.js` already stubs FOSS-only modules).
3. Map the kit's theme to `theme/tokens.ts` (and `global.css` if the kit uses CSS variables).

## Background sources and licenses

| Background | Origin | License |
| --- | --- | --- |
| Flowing paths | Port of Kokonut UI `FloatingPathsBackground` (source supplied by Warwick) | MIT (Kokonut UI) |
| Cyber particles | Port of `FluidParticlesBackground` / CyberBackground (source supplied by Warwick; Ken Perlin's reference noise) | confirm with the source's author |
| Swirl | Original SkSL after Ali Imam's 21st.dev Swirl look (Bayer dither) | original |
| Liquid glow | Original approximation | original |
| Prismatic lattice, Halftone clouds | Original | original |
| Aurora flow | Original, inspired by Ruixen UI (no code copied); now two colliding light balls | original |
| 3-ball gradient, Bouncing balls, Gravity orbit, Repel & shockwave | Original SkSL + `lib/backgrounds/ball-physics.ts` | original |
| Silk waves, Star field, Plasma | Original | original |
| Hive | Original, inspired by Xor's Hive shader (no code copied; license not clear) | original |
| Paper mesh | Port of `MeshGradient` from `@paper-design/shaders` 0.0.81 | Apache-2.0, Copyright 2026 Paper (see `NOTICE`) |
| Mesh gradient / Soft Mesh | Original, presets are data in `lib/backgrounds/mesh-presets.ts` | original |

All shader backgrounds render at half resolution, unmount while the app is backgrounded and fall back to the
static gradient when reduce motion is on (`components/background/motion-background.tsx`).

## Reference vs default

Every ported or reference-inspired background keeps its faithful look as a `REFERENCE` constant
(`BACKGROUND_REFERENCES`, `MESH_PRESET_REFERENCES`) and ships a nudged **default** derived with
`applyNudge()` (`BACKGROUND_NUDGES` in `lib/backgrounds/settings.ts`). The default is never the reference
(`tests/vitest/reference-defaults.test.ts`).

| Preset | Hue shift | Other deltas (default vs reference) |
| --- | --- | --- |
| See `BACKGROUND_NUDGES` | 10–25° per kind | speed / density / intensity / scale multipliers plus per-kind extras (counts, offsets) |
| Mesh presets (Indigo Aurora, Deep Ocean, Soft Mesh) | +14° | stop x ±0.05, drift ×1.15, blur +6 |
| Aurora Flow (Deep Blue) | −14° | slower, larger balls, more glow, blur 4 |
| Gradient, Video | none | our own (theme / user video), not references |

The exact per-kind numbers sit in code next to each preset. In the UI, sliders show an offset from the
default (−100..+100, 0 = our default); **Reset** returns to 0. Saved presets store absolute values plus
`schema` (`PRESET_SCHEMA = 3`), so changing defaults later does not move saved presets.

Every default sits strictly inside its slider range, so each slider moves both ways
(`tests/vitest/slider-ranges.test.ts`). That is why defaults use opacity 0.9 and a light blur
(1.5px, 0.6px on the dither styles) while references keep opacity 1 / blur 0.

## Unified parameters (schema 3)

Every style exposes the same sliders (`UNIFIED_PARAMS` in `lib/backgrounds/params.ts`): speed, intensity,
scale, blur, opacity, particle density, chaos, edge & impact glow and invert (-1..1: positive inverts
brightness, negative flips hues around grey). `PARAM_SUPPORT` lists which ones a style uses; the UI labels the
rest "no effect on this style". Each style also has one color per light ball / particle layer / band
(`layerColors`, count in `LAYER_COUNTS`); `colorA`/`colorB` mirror the first two layers.

Schema-2 presets (and stored active settings without the new fields) migrate with chaos = glow = invert = 0,
which renders exactly the old look, and layer colors derived from the preset's own colors
(`migratePreset`, `tests/vitest/preset-migration.test.ts`). All SkSL compiles in CI via CanvasKit
(`tests/vitest/shader-compile.test.ts`).

## Text & fonts

`AppearanceSettings.text` (`lib/backgrounds/text-effects.ts`) holds text color, shadow (amount; black or a
darker shade of the surface), outline (color, 0-3px), glow, gradient text and soft emboss. Shadow, outline,
glow and emboss are RN `filter` drop shadows (Android 12+) on a transparent wrapper around the chat markdown;
gradient text is a true per-word gradient in the settings preview and a body -> heading/emphasis color sweep
in the native markdown renderer (it cannot clip a gradient to glyphs).
