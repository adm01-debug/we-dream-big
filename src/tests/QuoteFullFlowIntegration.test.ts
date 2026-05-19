import { describe, it, expect } from 'vitest';
import * as QuoteCalc from '../logic/quotes/calculations';

describe('Módulo de Orçamentos: Teste de Integração de Cálculo (Fim-a-Fim)', () => {
  it('deve realizar o fluxo completo de cálculo: Itens -> Markup -> Desconto -> Total Final', () => {
    // 1. Definição de itens (simulando estado do useQuoteItems)
    const items = [
      {
        quantity: 100,
        unitPrice: 10.00, // Subtotal item: 1000.00
        personalizations: [
          { total_cost: 50.00 }, // Total gravações: 50.00
          { total_cost: 25.50 }  // Total gravações: 25.50
        ]
      },
      {
        quantity: 50,
        unitPrice: 20.00, // Subtotal item: 1000.00
        personalizations: []
      }
    ];

    // 2. Cálculos de Item
    const item1Total = QuoteCalc.calculateItemTotal(items[0]);
    expect(item1Total).toBe(1075.50); // (100 * 10) + 50 + 25.50

    const item2Total = QuoteCalc.calculateItemTotal(items[1]);
    expect(item2Total).toBe(1000.00); // 50 * 20

    // 3. Subtotal do Orçamento (Real Subtotal - sem markup)
    const realSubtotal = QuoteCalc.calculateSubtotal(items);
    expect(realSubtotal).toBe(2075.50);

    // 4. Aplicação de Markup de Negociação (Ex: 10%)
    const presentedSubtotal = QuoteCalc.applyMarkup(realSubtotal, 10);
    // 2075.50 * 1.1 = 2283.05
    expect(presentedSubtotal).toBe(2283.05);

    // 5. Aplicação de Desconto (Ex: 5% sobre o valor com markup)
    const discountValue = 5;
    const discountAmount = QuoteCalc.calculateDiscountAmount(presentedSubtotal, 'percent', discountValue);
    // 2283.05 * 0.05 = 114.1525 -> round2 -> 114.15
    expect(discountAmount).toBe(114.15);

    // 6. Total antes do Frete
    const totalBeforeShipping = QuoteCalc.round2(presentedSubtotal - discountAmount);
    // 2283.05 - 114.15 = 2168.90
    expect(totalBeforeShipping).toBe(2168.90);

    // 7. Cálculo de Alçada: Desconto Real (Comparado ao custo original sem markup)
    // Se o vendedor inflou o preço e deu desconto, queremos saber o desconto sobre o preço original
    const realDiscountPercent = QuoteCalc.calculateRealDiscountPercent(realSubtotal, presentedSubtotal, discountAmount);
    // ((2075.50 - 2168.90) / 2075.50) * 100 = -4.50 (O preço final ainda é maior que o original)
    // Nota: O cálculo de real discount percent no calculations.ts retorna um valor negativo se o preço final for maior que o real subtotal
    expect(realDiscountPercent).toBe(-4.50);

    // 8. Adição de Frete (FOB Pré-negociado)
    const shippingCost = 150.00;
    const finalTotal = QuoteCalc.round2(totalBeforeShipping + shippingCost);
    expect(finalTotal).toBe(2318.90);
  });

  it('deve lidar corretamente com arredondamentos de precisão crítica (Floating point)', () => {
    // 0.1 + 0.2 no JS é 0.30000000000000004
    // Nosso round2 usa Number.EPSILON para evitar isso
    const value = 0.1 + 0.2;
    expect(QuoteCalc.round2(value)).toBe(0.30);

    // Teste de arredondamento half-up (1.005 deve ser 1.01)
    expect(QuoteCalc.round2(1.005)).toBe(1.01);
  });
});