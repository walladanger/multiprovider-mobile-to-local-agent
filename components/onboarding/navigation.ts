export const ONBOARDING_STEPS = ['index', 'permissions', 'connect', 'ai', 'project', 'transcript', 'look', 'background', 'general', 'ready'] as const;
export type OnboardingStepName = typeof ONBOARDING_STEPS[number];

/** Steps that need a connected server (they read providers, projects, or models). */
const SERVER_STEPS: readonly OnboardingStepName[] = ['ai', 'project', 'general'];

/** Icon shown in the stepper for each step (MaterialCommunityIcons names). */
export const ONBOARDING_STEP_ICONS: Record<OnboardingStepName, string> = {
  index: 'hand-wave-outline',
  permissions: 'shield-check-outline',
  connect: 'lan-connect',
  ai: 'robot-outline',
  project: 'folder-outline',
  transcript: 'message-text-outline',
  look: 'palette-outline',
  background: 'image-filter-hdr',
  general: 'tune-variant',
  ready: 'flag-checkered',
};

export function getOnboardingSteps(hasConnection: boolean) {
  return ONBOARDING_STEPS.filter((step) => hasConnection || !SERVER_STEPS.includes(step));
}

export function onboardingRoute(step: OnboardingStepName) {
  return step === 'index' ? '/onboarding' : `/onboarding/${step}` as const;
}

export type StepperDotState = 'done' | 'current' | 'upcoming';

/** Pure stepper model: one entry per visible step with its visual state. */
export function getStepperModel(steps: readonly OnboardingStepName[], current: OnboardingStepName) {
  const index = steps.indexOf(current);
  return steps.map((name, i) => ({
    name,
    number: i + 1,
    state: (i < index ? 'done' : i === index ? 'current' : 'upcoming') as StepperDotState,
  }));
}
