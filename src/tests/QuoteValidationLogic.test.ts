import { describe, it, expect } from 'vitest';
import { quoteFormSchema, quoteItemSchema } from '../lib/validations/quoteSchema';

describe('Quote Validation Logic Audit', () => {
  it('should require shipping cost when FOB is selected', () => {
    const data = {
      clientId: '123',
      contactId: '456',
      paymentTerms: '30 dias',
      deliveryTime: '10 dias',
      shippingType: 'fob',
      // shippingCost missing or 0
    };

    const result = quoteFormSchema.safeParse(data);
    expect(result.success).toBe(false);
    
    const errors = !result.success ? result.error.flatten().fieldErrors : {};
    expect(errors.shippingCost).toContain('Valor do frete é obrigatório para modalidade FOB');
  });

  it('should allow empty shipping cost when CIF is selected', () => {
    const data = {
      clientId: '123',
      contactId: '456',
      paymentTerms: '30 dias',
      deliveryTime: '10 dias',
      shippingType: 'cif',
      discountValue: 0
    };

    const result = quoteFormSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should validate quote items correctly', () => {
    const validItem = {
      product_id: 'prod-1',
      product_name: 'Garrafa',
      quantity: 50,
      unit_price: 15.5
    };
    
    expect(quoteItemSchema.safeParse(validItem).success).toBe(true);

    const invalidItem = {
      product_id: '',
      product_name: 'Garrafa',
      quantity: 0, // invalid
      unit_price: -1 // invalid
    };

    const result = quoteItemSchema.safeParse(invalidItem);
    expect(result.success).toBe(false);
  });

  it('should enforce maximum character limits on notes', () => {
    const longNotes = 'a'.repeat(2001);
    const data = {
      clientId: '123',
      contactId: '456',
      paymentTerms: '30 dias',
      deliveryTime: '10 dias',
      shippingType: 'cif',
      notes: longNotes
    };

    const result = quoteFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
