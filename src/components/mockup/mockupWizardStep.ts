export interface MockupWizardStepState {
  hasClient: boolean;
  hasProduct: boolean;
  hasTechnique: boolean;
  hasLogo: boolean;
  hasPositioned: boolean;
  hasGenerated: boolean;
}

export function getMockupWizardStep(state: MockupWizardStepState): number {
  if (state.hasGenerated) return 6;
  if (state.hasLogo && state.hasPositioned) return 6;
  if (state.hasLogo) return 5;
  if (state.hasTechnique) return 4;
  if (state.hasProduct) return 3;
  if (state.hasClient) return 2;
  return 1;
}
