import { describe, it, expect } from 'vitest';
import { maskCnpj, maskPhone, validateCnpj } from '@/utils/masks';

describe('maskCnpj', () => {
  it('formats a complete CNPJ', () => {
    expect(maskCnpj('11222333000181')).toBe('11.222.333/0001-81');
  });

  it('formats partial input progressively', () => {
    expect(maskCnpj('11')).toBe('11');
    expect(maskCnpj('112')).toBe('11.2');
    expect(maskCnpj('11222')).toBe('11.222');
    expect(maskCnpj('112223')).toBe('11.222.3');
    expect(maskCnpj('11222333')).toBe('11.222.333');
    expect(maskCnpj('112223330')).toBe('11.222.333/0');
    expect(maskCnpj('1122233300011')).toBe('11.222.333/0001-1');
  });

  it('strips non-digit characters', () => {
    expect(maskCnpj('11.222.333/0001-81')).toBe('11.222.333/0001-81');
    expect(maskCnpj('ab11cd222ef')).toBe('11.222');
  });

  it('truncates to 14 digits', () => {
    expect(maskCnpj('112223330001819999')).toBe('11.222.333/0001-81');
  });

  it('handles empty string', () => {
    expect(maskCnpj('')).toBe('');
  });
});

describe('maskPhone', () => {
  it('formats a 10-digit landline number', () => {
    expect(maskPhone('1133334444')).toBe('(11) 3333-4444');
  });

  it('formats an 11-digit mobile number', () => {
    expect(maskPhone('11999887766')).toBe('(11) 99988-7766');
  });

  it('formats partial input', () => {
    // With only 2 digits, the regex replaces but no trailing space is forced
    expect(maskPhone('11')).toMatch(/\(?11\)?/);
    expect(maskPhone('119')).toBe('(11) 9');
  });

  it('strips non-digit characters', () => {
    expect(maskPhone('(11) 99988-7766')).toBe('(11) 99988-7766');
  });

  it('truncates to 11 digits', () => {
    expect(maskPhone('1199988776699')).toBe('(11) 99988-7766');
  });

  it('handles empty string', () => {
    expect(maskPhone('')).toBe('');
  });
});

describe('validateCnpj', () => {
  it('validates a known valid CNPJ', () => {
    expect(validateCnpj('11.222.333/0001-81')).toBe(true);
    expect(validateCnpj('11222333000181')).toBe(true);
  });

  it('rejects repeated digits', () => {
    expect(validateCnpj('11111111111111')).toBe(false);
    expect(validateCnpj('00000000000000')).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(validateCnpj('123')).toBe(false);
    expect(validateCnpj('')).toBe(false);
  });

  it('rejects invalid check digits', () => {
    expect(validateCnpj('11222333000182')).toBe(false);
  });
});
