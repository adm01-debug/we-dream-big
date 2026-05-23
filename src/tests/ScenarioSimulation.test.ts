import { describe, it, expect } from 'vitest';
import { loginSchema, signupSchema } from '../lib/validations/authSchema';
import { quoteFormSchema } from '../lib/validations/quoteSchema';

describe('Real-World Scenario: Security & Validation Layer', () => {
  it('Scenario 1: User Login Attempt with Malformed Data', () => {
    const invalidData = { email: 'not-an-email', password: 'short' };
    const result = loginSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('Scenario 2: Complex Quote Creation with Shipping Logistics', () => {
    // Schema rule: if shippingType === "fob_pre", shippingCost must be > 0.
    // Any other shippingType (cif, etc.) MUST have shippingCost === 0.
    // paymentMethod was added to required fields after this test was written.
    const validCIF = {
      clientId: 'c-1',
      contactId: 'ct-1',
      paymentMethod: 'pix',
      paymentTerms: 'net30',
      deliveryTime: '10days',
      shippingType: 'cif',
      shippingCost: 0,
      discountValue: 0,
    };
    expect(quoteFormSchema.safeParse(validCIF).success).toBe(true);

    // fob_pre with shippingCost=0 should fail (FOB pré requires a positive cost)
    const invalidFOBPre = {
      clientId: 'c-1',
      contactId: 'ct-1',
      paymentMethod: 'pix',
      paymentTerms: 'net30',
      deliveryTime: '10days',
      shippingType: 'fob_pre',
      shippingCost: 0, // Should fail refine check
    };
    const fobResult = quoteFormSchema.safeParse(invalidFOBPre);
    expect(fobResult.success).toBe(false);
  });
});
