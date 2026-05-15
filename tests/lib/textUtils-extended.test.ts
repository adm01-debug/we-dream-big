/**
 * Extended textUtils tests — comprehensive coverage of toTitleCase
 */
import { describe, it, expect } from 'vitest';
import { toTitleCase } from '@/lib/textUtils';

describe('toTitleCase — comprehensive', () => {
  it('capitalizes single word', () => {
    expect(toTitleCase('hello')).toBe('Hello');
  });

  it('capitalizes all-caps input', () => {
    expect(toTitleCase('HELLO WORLD')).toBe('Hello World');
  });

  it('keeps prepositions lowercase', () => {
    expect(toTitleCase('caneta de metal')).toBe('Caneta de Metal');
    expect(toTitleCase('kit para escritório')).toBe('Kit para Escritório');
  });

  it('always capitalizes first word even if preposition', () => {
    // "ao" is not in LOWERCASE_WORDS list, so it gets capitalized
    expect(toTitleCase('de volta ao escritório')).toBe('De Volta Ao Escritório');
    expect(toTitleCase('para todos')).toBe('Para Todos');
    expect(toTitleCase('em promoção')).toBe('Em Promoção');
  });

  it('handles all Portuguese prepositions', () => {
    expect(toTitleCase('caixa do produto')).toBe('Caixa do Produto');
    expect(toTitleCase('caixa da marca')).toBe('Caixa da Marca');
    expect(toTitleCase('caixa das canetas')).toBe('Caixa das Canetas');
    expect(toTitleCase('caixa dos materiais')).toBe('Caixa dos Materiais');
    expect(toTitleCase('feito com amor')).toBe('Feito com Amor');
    expect(toTitleCase('produto em oferta')).toBe('Produto em Oferta');
    expect(toTitleCase('item na lista')).toBe('Item na Lista');
    expect(toTitleCase('item no carrinho')).toBe('Item no Carrinho');
    expect(toTitleCase('presentes nas caixas')).toBe('Presentes nas Caixas');
    expect(toTitleCase('itens nos pacotes')).toBe('Itens nos Pacotes');
    expect(toTitleCase('feito por profissionais')).toBe('Feito por Profissionais');
  });

  it('handles conjunction "e"', () => {
    expect(toTitleCase('caneta e lápis')).toBe('Caneta e Lápis');
  });

  it('handles empty string', () => {
    expect(toTitleCase('')).toBe('');
  });

  it('handles single character', () => {
    expect(toTitleCase('a')).toBe('A');
  });

  it('handles mixed case input', () => {
    expect(toTitleCase('cAnEtA dE mEtAl')).toBe('Caneta de Metal');
  });

  it('handles multiple spaces (splits on space)', () => {
    // Note: split(' ') preserves empty strings between multiple spaces
    const result = toTitleCase('caneta  azul');
    expect(result).toContain('Caneta');
    expect(result).toContain('Azul');
  });
});
