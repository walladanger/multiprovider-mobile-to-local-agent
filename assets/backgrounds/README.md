# Motion background

Put the looping background video here as `motion.mp4` (H.264, muted, short loop, ~720p is plenty).

Then edit `constants/motion-background.ts` and set:

```ts
export const MOTION_BACKGROUND_SOURCE: number | null = require('@/assets/backgrounds/motion.mp4');
```

Until then, and whenever the OS "reduce motion" setting is on, `components/background/motion-background.tsx`
shows a static indigo gradient instead. The tint drawn over the video lives in `theme/tokens.ts` (`overlay.tint`).
