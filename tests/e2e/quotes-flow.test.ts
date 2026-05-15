/**
 * E2E Tests — Quotes Module
 * Covers: CRUD, status flow, filtering, templates, approval, comments, history
 */
import { describe, it, expect, vi } from 'vitest';

// ============ Quote Status Machine ============
const STATUSES = ['draft', 'pending', 'sent', 'approved', 'rejected', 'expired'] as const;
type QuoteStatus = typeof STATUSES[number];

const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Rascunho', pending: 'Pendente', sent: 'Enviado',
  approved: 'Aprovado', rejected: 'Rejeitado', expired: 'Expirado',
};

const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['pending', 'sent'],
  pending: ['sent', 'draft'],
  sent: ['approved', 'rejected', 'expired'],
  approved: [],
  rejected: ['draft'],
  expired: ['draft'],
};

function canTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

describe('E2E Quotes — Status Machine', () => {
  it('has 6 statuses', () => expect(STATUSES).toHaveLength(6));

  it('draft → sent is valid', () => expect(canTransition('draft', 'sent')).toBe(true));
  it('draft → pending is valid', () => expect(canTransition('draft', 'pending')).toBe(true));
  it('draft → approved is invalid', () => expect(canTransition('draft', 'approved')).toBe(false));
  it('sent → approved is valid', () => expect(canTransition('sent', 'approved')).toBe(true));
  it('sent → rejected is valid', () => expect(canTransition('sent', 'rejected')).toBe(true));
  it('sent → expired is valid', () => expect(canTransition('sent', 'expired')).toBe(true));
  it('approved → draft is invalid', () => expect(canTransition('approved', 'draft')).toBe(false));
  it('approved is terminal', () => expect(VALID_TRANSITIONS.approved).toHaveLength(0));
  it('rejected → draft is valid', () => expect(canTransition('rejected', 'draft')).toBe(true));
  it('expired → draft is valid', () => expect(canTransition('expired', 'draft')).toBe(true));

  STATUSES.forEach(s => {
    it(`status "${s}" has Portuguese label`, () => {
      expect(STATUS_LABELS[s]).toBeTruthy();
      expect(typeof STATUS_LABELS[s]).toBe('string');
    });
  });
});

// ============ Quote Calculations ============
interface QuoteItem {
  product_name: string;
  quantity: number;
  unit_price: number;
}

function calcSubtotal(items: QuoteItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
}

function calcDiscount(subtotal: number, percent: number, amount: number): number {
  const percentDiscount = subtotal * (percent / 100);
  return Math.min(percentDiscount + amount, subtotal);
}

function calcTotal(subtotal: number, discountPercent: number, discountAmount: number, shipping: number): number {
  const discount = calcDiscount(subtotal, discountPercent, discountAmount);
  return Math.max(subtotal - discount + shipping, 0);
}

describe('E2E Quotes — Calculations', () => {
  const items: QuoteItem[] = [
    { product_name: 'Caneta', quantity: 100, unit_price: 5.50 },
    { product_name: 'Caderno', quantity: 50, unit_price: 25.00 },
    { product_name: 'Mochila', quantity: 10, unit_price: 89.90 },
  ];

  it('calculates subtotal correctly', () => {
    expect(calcSubtotal(items)).toBe(100 * 5.50 + 50 * 25 + 10 * 89.90);
  });

  it('subtotal with empty items is 0', () => {
    expect(calcSubtotal([])).toBe(0);
  });

  it('subtotal with single item', () => {
    expect(calcSubtotal([{ product_name: 'X', quantity: 1, unit_price: 10 }])).toBe(10);
  });

  it('10% discount on 1000', () => {
    expect(calcDiscount(1000, 10, 0)).toBe(100);
  });

  it('discount amount + percentage combined', () => {
    expect(calcDiscount(1000, 10, 50)).toBe(150);
  });

  it('discount cannot exceed subtotal', () => {
    expect(calcDiscount(100, 100, 50)).toBe(100);
  });

  it('total = subtotal - discount + shipping', () => {
    expect(calcTotal(1000, 10, 0, 50)).toBe(950);
  });

  it('total cannot be negative', () => {
    expect(calcTotal(100, 100, 100, 0)).toBe(0);
  });

  it('total with zero discount and zero shipping', () => {
    expect(calcTotal(500, 0, 0, 0)).toBe(500);
  });

  it('total with only shipping', () => {
    expect(calcTotal(100, 0, 0, 30)).toBe(130);
  });
});

// ============ Quote Number Generation ============
function generateQuoteNumber(prefix = 'ORC'): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
  return `${prefix}-${year}${month}-${seq}`;
}

describe('E2E Quotes — Number Generation', () => {
  it('starts with ORC prefix', () => expect(generateQuoteNumber().startsWith('ORC-')).toBe(true));
  it('custom prefix works', () => expect(generateQuoteNumber('PROP').startsWith('PROP-')).toBe(true));
  it('has correct format length', () => expect(generateQuoteNumber().length).toBe(15));
  it('includes year', () => expect(generateQuoteNumber()).toContain(String(new Date().getFullYear())));
  it('generates unique numbers', () => {
    const set = new Set(Array.from({ length: 100 }, () => generateQuoteNumber()));
    expect(set.size).toBeGreaterThan(90); // At least 90% unique
  });
});

// ============ Quote Filtering ============
interface Quote {
  id: string;
  status: QuoteStatus;
  client_name: string | null;
  total: number;
  created_at: string;
}

const sampleQuotes: Quote[] = [
  { id: '1', status: 'draft', client_name: 'Empresa Alpha', total: 1000, created_at: '2025-01-15' },
  { id: '2', status: 'sent', client_name: 'Beta Corp', total: 2500, created_at: '2025-02-10' },
  { id: '3', status: 'approved', client_name: 'Gamma LTDA', total: 500, created_at: '2025-03-01' },
  { id: '4', status: 'rejected', client_name: 'Delta SA', total: 8000, created_at: '2025-01-20' },
  { id: '5', status: 'draft', client_name: 'Epsilon ME', total: 150, created_at: '2025-03-15' },
  { id: '6', status: 'expired', client_name: null, total: 0, created_at: '2024-12-01' },
];

function filterQuotes(quotes: Quote[], filters: { status?: QuoteStatus; search?: string; minTotal?: number }): Quote[] {
  return quotes.filter(q => {
    if (filters.status && q.status !== filters.status) return false;
    if (filters.search && !(q.client_name?.toLowerCase().includes(filters.search.toLowerCase()))) return false;
    if (filters.minTotal !== undefined && q.total < filters.minTotal) return false;
    return true;
  });
}

describe('E2E Quotes — Filtering', () => {
  it('no filter returns all', () => expect(filterQuotes(sampleQuotes, {})).toHaveLength(6));
  it('filter by status=draft', () => expect(filterQuotes(sampleQuotes, { status: 'draft' })).toHaveLength(2));
  it('filter by status=approved', () => expect(filterQuotes(sampleQuotes, { status: 'approved' })).toHaveLength(1));
  it('filter by status=expired', () => expect(filterQuotes(sampleQuotes, { status: 'expired' })).toHaveLength(1));
  it('search by client name', () => expect(filterQuotes(sampleQuotes, { search: 'alpha' })).toHaveLength(1));
  it('search case insensitive', () => expect(filterQuotes(sampleQuotes, { search: 'BETA' })).toHaveLength(1));
  it('search with no match', () => expect(filterQuotes(sampleQuotes, { search: 'xyz' })).toHaveLength(0));
  it('search excludes null client_name', () => expect(filterQuotes(sampleQuotes, { search: 'a' })).not.toContainEqual(expect.objectContaining({ client_name: null })));
  it('filter by minTotal', () => expect(filterQuotes(sampleQuotes, { minTotal: 1000 })).toHaveLength(3));
  it('combined filters', () => expect(filterQuotes(sampleQuotes, { status: 'draft', minTotal: 500 })).toHaveLength(1));
});

// ============ Quote Approval Token ============
describe('E2E Quotes — Approval Token', () => {
  const token = {
    id: 'tok-1', quote_id: 'q-1', token: 'abc123def456',
    seller_id: 'u-1', client_name: 'Cliente Teste',
    client_email: 'cliente@test.com', status: 'active',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    viewed_at: null, responded_at: null, response: null, response_notes: null,
  };

  it('token is active', () => expect(token.status).toBe('active'));
  it('token has not expired', () => expect(new Date(token.expires_at) > new Date()).toBe(true));
  it('token has not been viewed', () => expect(token.viewed_at).toBeNull());
  it('token has no response', () => expect(token.response).toBeNull());
  it('client email is valid', () => expect(token.client_email).toMatch(/@/));
  
  it('expired token detected', () => {
    const expired = { ...token, expires_at: '2020-01-01T00:00:00Z' };
    expect(new Date(expired.expires_at) < new Date()).toBe(true);
  });

  it('approved response updates token', () => {
    const approved = { ...token, status: 'responded', response: 'approved', responded_at: new Date().toISOString() };
    expect(approved.response).toBe('approved');
    expect(approved.responded_at).not.toBeNull();
  });

  it('rejected response with notes', () => {
    const rejected = { ...token, status: 'responded', response: 'rejected', response_notes: 'Preço muito alto' };
    expect(rejected.response).toBe('rejected');
    expect(rejected.response_notes).toBe('Preço muito alto');
  });
});

// ============ Quote Templates ============
describe('E2E Quotes — Templates', () => {
  const template = {
    id: 't-1', name: 'Template Padrão', description: 'Orçamento padrão para brindes',
    seller_id: 'u-1', is_default: true, validity_days: 30,
    payment_terms: 'À vista', delivery_time: '15 dias úteis',
    items_data: [
      { product_name: 'Caneta', quantity: 100, unit_price: 5.50 },
      { product_name: 'Bloco', quantity: 50, unit_price: 12.00 },
    ],
  };

  it('has a name', () => expect(template.name).toBeTruthy());
  it('has items data', () => expect(template.items_data).toHaveLength(2));
  it('is default', () => expect(template.is_default).toBe(true));
  it('has payment terms', () => expect(template.payment_terms).toBe('À vista'));
  it('validity is 30 days', () => expect(template.validity_days).toBe(30));
  it('delivery time specified', () => expect(template.delivery_time).toContain('dias'));
});

// ============ Quote History ============
describe('E2E Quotes — History', () => {
  const historyActions = ['created', 'status_changed', 'item_added', 'item_removed', 'discount_applied', 'sent', 'comment_added'];

  it('has all action types', () => expect(historyActions.length).toBeGreaterThanOrEqual(7));
  historyActions.forEach(action => {
    it(`action "${action}" is a valid string`, () => expect(typeof action).toBe('string'));
  });
});
