import { describe, it, expect } from 'vitest';
import { maskCnpj, maskPhone, validateCnpj, maskCep, ESTADOS_BR } from '@/utils/masks';

describe('maskCnpj', () => {
  it('should format full CNPJ', () => {
    expect(maskCnpj('11222333000181')).toBe('11.222.333/0001-81');
  });

  it('should handle partial input', () => {
    expect(maskCnpj('112')).toBe('11.2');
    expect(maskCnpj('11222')).toBe('11.222');
  });

  it('should strip non-digits', () => {
    expect(maskCnpj('11.222.333/0001-81')).toBe('11.222.333/0001-81');
  });

  it('should limit to 14 digits', () => {
    expect(maskCnpj('112223330001819999')).toBe('11.222.333/0001-81');
  });
});

describe('maskPhone', () => {
  it('should format landline (10 digits)', () => {
    expect(maskPhone('1133445566')).toBe('(11) 3344-5566');
  });

  it('should format mobile (11 digits)', () => {
    expect(maskPhone('11987654321')).toBe('(11) 98765-4321');
  });

  it('should handle partial input (2 digits = no formatting yet)', () => {
    // maskPhone only formats when there are 3+ digits after DDD
    expect(maskPhone('11')).toBe('11');
  });

  it('should format when 3+ digits present', () => {
    expect(maskPhone('119')).toBe('(11) 9');
  });
});

describe('validateCnpj', () => {
  it('should validate correct CNPJ', () => {
    expect(validateCnpj('11.222.333/0001-81')).toBe(true);
  });

  it('should reject all same digits', () => {
    expect(validateCnpj('11111111111111')).toBe(false);
    expect(validateCnpj('00000000000000')).toBe(false);
  });

  it('should reject invalid length', () => {
    expect(validateCnpj('123')).toBe(false);
    expect(validateCnpj('')).toBe(false);
  });

  it('should reject invalid check digits', () => {
    expect(validateCnpj('11222333000199')).toBe(false);
  });
});

describe('maskCep', () => {
  it('should format 8-digit CEP', () => {
    expect(maskCep('01001000')).toBe('01001-000');
  });

  it('should handle partial input', () => {
    expect(maskCep('0100')).toBe('0100');
    expect(maskCep('01001')).toBe('01001');
  });

  it('should limit to 8 digits', () => {
    expect(maskCep('010010001234')).toBe('01001-000');
  });
});

describe('ESTADOS_BR', () => {
  it('should contain 27 states', () => {
    expect(ESTADOS_BR).toHaveLength(27);
  });

  it('should include common states', () => {
    expect(ESTADOS_BR).toContain('SP');
    expect(ESTADOS_BR).toContain('RJ');
    expect(ESTADOS_BR).toContain('MG');
    expect(ESTADOS_BR).toContain('DF');
  });

  it('should be sorted alphabetically', () => {
    const sorted = [...ESTADOS_BR].sort();
    expect(ESTADOS_BR).toEqual(sorted);
  });
});
