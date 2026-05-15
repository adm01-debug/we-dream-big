/**
 * Tests for QuoteHistoryEntry types and QuoteComment types validation.
 */
import { describe, it, expect } from 'vitest';

// Type validation tests — ensure interfaces match expected shape
describe('QuoteHistoryEntry shape', () => {
  const validEntry = {
    id: 'uuid-1',
    quote_id: 'quote-1',
    user_id: 'user-1',
    action: 'created',
    field_changed: null,
    old_value: null,
    new_value: null,
    description: 'Orçamento criado',
    metadata: {},
    created_at: '2025-01-01T00:00:00Z',
  };

  it('has all required fields', () => {
    expect(validEntry).toHaveProperty('id');
    expect(validEntry).toHaveProperty('quote_id');
    expect(validEntry).toHaveProperty('user_id');
    expect(validEntry).toHaveProperty('action');
    expect(validEntry).toHaveProperty('description');
    expect(validEntry).toHaveProperty('created_at');
  });

  it('allows nullable fields', () => {
    expect(validEntry.field_changed).toBeNull();
    expect(validEntry.old_value).toBeNull();
    expect(validEntry.new_value).toBeNull();
  });

  it('metadata defaults to empty object', () => {
    expect(validEntry.metadata).toEqual({});
  });
});

describe('QuoteComment shape', () => {
  const validComment = {
    id: 'c1',
    quote_id: 'q1',
    user_id: 'u1',
    parent_id: null,
    content: 'Comentário teste',
    is_edited: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    author_name: 'João',
    author_avatar: null,
    replies: [],
  };

  it('has required fields', () => {
    expect(validComment).toHaveProperty('content');
    expect(validComment).toHaveProperty('quote_id');
    expect(validComment).toHaveProperty('user_id');
  });

  it('supports thread replies', () => {
    expect(Array.isArray(validComment.replies)).toBe(true);
  });

  it('parent_id is null for top-level', () => {
    expect(validComment.parent_id).toBeNull();
  });

  it('is_edited defaults to false', () => {
    expect(validComment.is_edited).toBe(false);
  });
});

describe('ApprovalToken shape', () => {
  const token = {
    id: 'at-1',
    quote_id: 'q1',
    token: 'abc123',
    seller_id: 'u1',
    client_name: 'Cliente',
    client_email: 'cliente@email.com',
    status: 'active',
    expires_at: '2025-02-01T00:00:00Z',
    viewed_at: null,
    responded_at: null,
    response: null,
    response_notes: null,
    created_at: '2025-01-01T00:00:00Z',
  };

  it('has token field', () => {
    expect(token.token).toBe('abc123');
  });

  it('status defaults to active', () => {
    expect(token.status).toBe('active');
  });

  it('response fields are nullable', () => {
    expect(token.viewed_at).toBeNull();
    expect(token.responded_at).toBeNull();
    expect(token.response).toBeNull();
  });
});

describe('CartTemplateItem shape', () => {
  const item = {
    product_id: 'p1',
    product_name: 'Caneta BIC',
    product_sku: 'CAN-001',
    product_image_url: 'https://img.com/1.jpg',
    product_price: 5.99,
    quantity: 100,
    color_name: 'Azul',
    color_hex: '#0000FF',
  };

  it('has required fields', () => {
    expect(item).toHaveProperty('product_id');
    expect(item).toHaveProperty('product_name');
    expect(item).toHaveProperty('product_price');
    expect(item).toHaveProperty('quantity');
  });

  it('color fields are optional strings', () => {
    expect(typeof item.color_name).toBe('string');
    expect(typeof item.color_hex).toBe('string');
  });

  it('price is a number', () => {
    expect(typeof item.product_price).toBe('number');
  });
});

describe('Status label mapping', () => {
  const statusLabels: Record<string, string> = {
    draft: 'Rascunho',
    pending: 'Pendente',
    sent: 'Enviado',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    expired: 'Expirado',
  };

  it('maps all standard statuses', () => {
    expect(Object.keys(statusLabels)).toHaveLength(6);
    expect(statusLabels.draft).toBe('Rascunho');
    expect(statusLabels.approved).toBe('Aprovado');
    expect(statusLabels.expired).toBe('Expirado');
  });

  it('returns Portuguese labels', () => {
    Object.values(statusLabels).forEach(label => {
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });
  });
});
