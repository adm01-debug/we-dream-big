import { describe, it, expect } from 'vitest';

// Inline copies of the validation functions for testing (edge function code not importable in vitest)
async function safeParseBody<T = Record<string, unknown>>(req: Request): Promise<T | null> {
  try {
    const text = await req.text();
    if (!text || text.trim() === '') return null;
    return JSON.parse(text) as T;
  } catch { return null; }
}

function validateRequired(body: Record<string, unknown> | null, fields: string[]): string | null {
  if (!body) return 'Request body is required';
  const missing = fields.filter(f => { const v = body[f]; return v === undefined || v === null || v === ''; });
  return missing.length > 0 ? `Missing required fields: ${missing.join(', ')}` : null;
}

function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.trim().length > 0;
}

function isPositiveNumber(val: unknown): val is number {
  return typeof val === 'number' && val > 0 && Number.isFinite(val);
}

describe('safeParseBody', () => {
  it('parses valid JSON', async () => {
    const req = new Request('http://test.com', { method: 'POST', body: JSON.stringify({ foo: 'bar' }) });
    expect(await safeParseBody(req)).toEqual({ foo: 'bar' });
  });
  it('returns null for empty body', async () => {
    const req = new Request('http://test.com', { method: 'POST', body: '' });
    expect(await safeParseBody(req)).toBeNull();
  });
  it('returns null for invalid JSON', async () => {
    const req = new Request('http://test.com', { method: 'POST', body: 'not json' });
    expect(await safeParseBody(req)).toBeNull();
  });
});

describe('validateRequired', () => {
  it('returns null when all fields present', () => {
    expect(validateRequired({ name: 'John', email: 'j@j.com' }, ['name', 'email'])).toBeNull();
  });
  it('returns error for missing fields', () => {
    expect(validateRequired({ name: 'John' }, ['name', 'email'])).toContain('email');
  });
  it('returns error for null body', () => {
    expect(validateRequired(null, ['name'])).toBe('Request body is required');
  });
  it('catches empty string values', () => {
    expect(validateRequired({ name: '' }, ['name'])).toContain('name');
  });
});

describe('isNonEmptyString', () => {
  it('returns true for non-empty strings', () => expect(isNonEmptyString('hello')).toBe(true));
  it('returns false for empty/whitespace', () => { expect(isNonEmptyString('')).toBe(false); expect(isNonEmptyString('   ')).toBe(false); });
  it('returns false for non-strings', () => { expect(isNonEmptyString(123)).toBe(false); expect(isNonEmptyString(null)).toBe(false); });
});

describe('isPositiveNumber', () => {
  it('returns true for positive numbers', () => { expect(isPositiveNumber(5)).toBe(true); expect(isPositiveNumber(0.1)).toBe(true); });
  it('returns false for zero/negative/NaN', () => { expect(isPositiveNumber(0)).toBe(false); expect(isPositiveNumber(-1)).toBe(false); expect(isPositiveNumber(NaN)).toBe(false); expect(isPositiveNumber(Infinity)).toBe(false); });
});
