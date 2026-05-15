import { describe, it, expect } from 'vitest';
import { toTitleCase } from '@/lib/textUtils';

describe('toTitleCase', () => {
  it('should capitalize first letter of each word', () => {
    expect(toTitleCase('hello world')).toBe('Hello World');
  });

  it('should keep prepositions lowercase (except first word)', () => {
    expect(toTitleCase('caneta de metal')).toBe('Caneta de Metal');
    expect(toTitleCase('kit para escritorio')).toBe('Kit para Escritorio');
  });

  it('should capitalize first word even if preposition', () => {
    expect(toTitleCase('de metal caneta')).toBe('De Metal Caneta');
  });

  it('should handle single word', () => {
    expect(toTitleCase('caneta')).toBe('Caneta');
  });

  it('should handle empty string', () => {
    expect(toTitleCase('')).toBe('');
  });

  it('should handle all caps input', () => {
    expect(toTitleCase('CANETA DE METAL')).toBe('Caneta de Metal');
  });

  it('should handle multiple prepositions', () => {
    expect(toTitleCase('caixa de presente com tampa')).toBe('Caixa de Presente com Tampa');
  });
});
