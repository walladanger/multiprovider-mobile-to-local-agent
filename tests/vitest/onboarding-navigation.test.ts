import { describe, expect, it } from 'vitest';

import { getOnboardingSteps, getStepperModel, ONBOARDING_STEP_ICONS, ONBOARDING_STEPS, onboardingRoute } from '@/components/onboarding/navigation';
import { getVisibleModels, type ModelOption } from '@/providers/opencode-model-selection';

const models = [
  { id: 'openai/mini', providerID: 'openai', variants: [] },
  { id: 'openai/full', providerID: 'openai', variants: [] },
  { id: 'openrouter/auto', providerID: 'openrouter', variants: [] },
] as unknown as ModelOption[];

describe('onboarding navigation and model choices', () => {
  it('inserts AI after connection and General before review', () => {
    expect(getOnboardingSteps(true)).toEqual(['index', 'permissions', 'connect', 'ai', 'project', 'transcript', 'look', 'background', 'general', 'ready']);
    expect(getOnboardingSteps(true).map(onboardingRoute)).toEqual([
      '/onboarding', '/onboarding/permissions', '/onboarding/connect', '/onboarding/ai',
      '/onboarding/project', '/onboarding/transcript', '/onboarding/look', '/onboarding/background',
      '/onboarding/general', '/onboarding/ready',
    ]);
  });

  it('skips server-dependent steps in both directions without a connection', () => {
    const steps = getOnboardingSteps(false);
    expect(steps).toEqual(['index', 'permissions', 'connect', 'transcript', 'look', 'background', 'ready']);
    expect(steps[steps.indexOf('transcript') - 1]).toBe('connect');
  });

  it('marks completed, current, and upcoming stepper dots', () => {
    const model = getStepperModel(getOnboardingSteps(false), 'connect');
    expect(model.map((dot) => dot.state)).toEqual(['done', 'done', 'current', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
    expect(model[2]).toEqual({ name: 'connect', number: 3, state: 'current' });
    expect(Object.keys(ONBOARDING_STEP_ICONS)).toEqual([...ONBOARDING_STEPS]);
  });

  it('uses the same configured, enabled models in Chat, General, and Review', () => {
    expect(getVisibleModels(models, [{ id: 'openai' }], ['openai/full', 'openrouter/auto']))
      .toEqual([models[1]]);
    expect(getVisibleModels(models, [{ id: 'openai' }], [])).toEqual(models.slice(0, 2));
    expect(getVisibleModels(models, [], ['openai/mini'])).toEqual([]);
    expect(getVisibleModels([], [{ id: 'openai' }], [])).toEqual([]);
    expect(getVisibleModels(models, [{ id: 'openai' }], ['removed/model'])).toEqual([]);
  });
});
