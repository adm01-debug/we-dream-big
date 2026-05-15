/**
 * Tests for simulator wizard pure helpers from types/domain/simulator-wizard.ts
 * Tests: getStepIndex, getNextStep, getPreviousStep, isStepComplete, canNavigateToStep
 */
import { describe, it, expect } from 'vitest';
import {
  WIZARD_STEPS,
  getStepIndex,
  getNextStep,
  getPreviousStep,
  isStepComplete,
  canNavigateToStep,
  type SimulatorWizardState,
} from '@/types/domain/simulator-wizard';

const baseState: SimulatorWizardState = {
  currentStep: 'product',
  selectedProduct: null,
  quantity: 0,
  personalizations: [],
  currentPersonalizationIndex: 0,
  isEditingPersonalization: false,
  availableLocations: [],
  selectedLocation: null,
  engravingSpecs: { colors: 1, width: 5, height: 5 },
  comparisonResults: [],
  selectedComparison: null,
  isCalculating: false,
  error: null,
};

describe('WIZARD_STEPS', () => {
  it('has exactly 4 steps in correct order', () => {
    expect(WIZARD_STEPS).toEqual(['product', 'location', 'specs', 'comparison']);
  });
});

describe('getStepIndex', () => {
  it('returns correct indices', () => {
    expect(getStepIndex('product')).toBe(0);
    expect(getStepIndex('location')).toBe(1);
    expect(getStepIndex('specs')).toBe(2);
    expect(getStepIndex('comparison')).toBe(3);
  });
});

describe('getNextStep', () => {
  it('returns next step', () => {
    expect(getNextStep('product')).toBe('location');
    expect(getNextStep('location')).toBe('specs');
    expect(getNextStep('specs')).toBe('comparison');
  });

  it('returns null for last step', () => {
    expect(getNextStep('comparison')).toBeNull();
  });
});

describe('getPreviousStep', () => {
  it('returns previous step', () => {
    expect(getPreviousStep('comparison')).toBe('specs');
    expect(getPreviousStep('specs')).toBe('location');
    expect(getPreviousStep('location')).toBe('product');
  });

  it('returns null for first step', () => {
    expect(getPreviousStep('product')).toBeNull();
  });
});

describe('isStepComplete', () => {
  it('product step: requires product and quantity > 0', () => {
    expect(isStepComplete('product', baseState)).toBe(false);

    const withProduct = {
      ...baseState,
      selectedProduct: { id: 'p1', name: 'Test', sku: 'T1' } as any,
      quantity: 100,
    };
    expect(isStepComplete('product', withProduct)).toBe(true);
  });

  it('product step: fails with quantity 0', () => {
    const zeroQty = {
      ...baseState,
      selectedProduct: { id: 'p1' } as any,
      quantity: 0,
    };
    expect(isStepComplete('product', zeroQty)).toBe(false);
  });

  it('location step: requires selectedLocation', () => {
    expect(isStepComplete('location', baseState)).toBe(false);

    const withLocation = { ...baseState, selectedLocation: { id: 'loc1' } as any };
    expect(isStepComplete('location', withLocation)).toBe(true);
  });

  it('specs step: requires colors, width, height > 0', () => {
    expect(isStepComplete('specs', baseState)).toBe(true); // defaults are 1, 5, 5

    const zeroSpecs = {
      ...baseState,
      engravingSpecs: { colors: 0, width: 5, height: 5 },
    };
    expect(isStepComplete('specs', zeroSpecs)).toBe(false);
  });

  it('comparison step: requires selectedComparison', () => {
    expect(isStepComplete('comparison', baseState)).toBe(false);

    const withComparison = { ...baseState, selectedComparison: { id: 'c1' } as any };
    expect(isStepComplete('comparison', withComparison)).toBe(true);
  });

  it('returns false for unknown step', () => {
    expect(isStepComplete('unknown' as any, baseState)).toBe(false);
  });
});

describe('canNavigateToStep', () => {
  it('can always go back', () => {
    const atSpecs = { ...baseState, currentStep: 'specs' as const };
    expect(canNavigateToStep('product', atSpecs)).toBe(true);
    expect(canNavigateToStep('location', atSpecs)).toBe(true);
  });

  it('can go to comparison if personalizations exist', () => {
    const withPers = {
      ...baseState,
      personalizations: [{ id: 'p1' } as any],
    };
    expect(canNavigateToStep('comparison', withPers)).toBe(true);
  });

  it('cannot skip ahead without completing prior steps', () => {
    expect(canNavigateToStep('specs', baseState)).toBe(false);
  });

  it('can advance when prior steps are complete', () => {
    const complete = {
      ...baseState,
      currentStep: 'product' as const,
      selectedProduct: { id: 'p1' } as any,
      quantity: 100,
      selectedLocation: { id: 'loc1' } as any,
    };
    expect(canNavigateToStep('location', complete)).toBe(true);
    expect(canNavigateToStep('specs', complete)).toBe(true);
  });
});
