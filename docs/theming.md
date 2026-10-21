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
| Aurora flow | Original, inspired by Ruixen UI (no code copied) | original |
| Hive | Original, inspired by Xor's Hive shader (no code copied; license not clear) | original |
| Paper mesh | Port of `MeshGradient` from `@paper-design/shaders` 0.0.81 | Apache-2.0, Copyright 2026 Paper (see `NOTICE`) |
| Mesh gradient / Soft Mesh | Original, presets are data in `lib/backgrounds/mesh-presets.ts` | original |

All shader backgrounds render at half resolution, unmount while the app is backgrounded and fall back to the
static gradient when reduce motion is on (`components/background/motion-background.tsx`).
