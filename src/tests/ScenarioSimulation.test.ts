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
    // QA: o schema foi expandido — paymentMethod virou obrigatório e a
    // modalidade FOB pré-negociada agora é "fob_pre" (não "fob"). Testes
    // atualizados para refletir essas regras de negócio atuais.
    const validCIF = {
      clientId: 'c-1',
      contactId: 'ct-1',
      paymentMethod: 'boleto',
      paymentTerms: 'net30',
      deliveryTime: '10days',
      shippingType: 'cif',
      discountValue: 0,
    };
    expect(quoteFormSchema.safeParse(validCIF).success).toBe(true);

    // fob_pre com shippingCost=0 dispara refine: "informe o valor do frete"
    const invalidFOB = {
      clientId: 'c-1',
      contactId: 'ct-1',
      paymentMethod: 'boleto',
      paymentTerms: 'net30',
      deliveryTime: '10days',
      shippingType: 'fob_pre',
      shippingCost: 0,
    };
    const fobResult = quoteFormSchema.safeParse(invalidFOB);
    expect(fobResult.success).toBe(false);
  });
});
