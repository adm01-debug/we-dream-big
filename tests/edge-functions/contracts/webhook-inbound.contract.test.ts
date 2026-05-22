/**
 * Contract tests — webhook-inbound (v1).
 *
 * Cobre:
 *   - Envelope mínimo: { event OR type, data }
 *   - Aceita data livre (schema-on-read intencional para upstreams variados)
 *   - Rejeita ausência de identificador de evento
 *   - Aceita meta opcional, source_event_id, occurred_at em ISO ou epoch
 */

import { describe, expect, it } from 'vitest';
import {
  WebhookInboundV1Schema,
  WebhookInboundSchemaByVersion,
  WebhookInboundVersions,
} from '../../../supabase/functions/_shared/contracts/webhook-inbound';

describe('webhook-inbound v1 — válidos', () => {
  it('aceita { event, data: {} }', () => {
    expect(
      WebhookInboundV1Schema.safeParse({
        event: 'order.created',
        data: { id: 'o1' },
      }).success,
    ).toBe(true);
  });

  it('aceita { type, data } (sinônimo de event)', () => {
    expect(
      WebhookInboundV1Schema.safeParse({
        type: 'push',
        data: { ref: 'main' },
      }).success,
    ).toBe(true);
  });

  it('aceita data como array', () => {
    expect(
      WebhookInboundV1Schema.safeParse({
        event: 'bulk.update',
        data: [{ id: 1 }, { id: 2 }],
      }).success,
    ).toBe(true);
  });

  it('aceita data como string (formato livre)', () => {
    expect(
      WebhookInboundV1Schema.safeParse({
        event: 'log.line',
        data: 'raw log content',
      }).success,
    ).toBe(true);
  });

  it('aceita source_event_id + occurred_at em ISO 8601', () => {
    expect(
      WebhookInboundV1Schema.safeParse({
        event: 'sync',
        data: {},
        source_event_id: 'evt-12345',
        occurred_at: '2026-05-21T12:00:00Z',
      }).success,
    ).toBe(true);
  });

  it('aceita occurred_at como epoch ms', () => {
    expect(
      WebhookInboundV1Schema.safeParse({
        event: 'sync',
        data: {},
        occurred_at: Date.now(),
      }).success,
    ).toBe(true);
  });

  it('aceita meta opcional', () => {
    expect(
      WebhookInboundV1Schema.safeParse({
        event: 'sync',
        data: {},
        meta: { source: 'github', delivery_id: 'gh-123' },
      }).success,
    ).toBe(true);
  });
});

describe('webhook-inbound v1 — inválidos', () => {
  it('rejeita ausência de event E type', () => {
    const res = WebhookInboundV1Schema.safeParse({ data: { x: 1 } });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.issues.some((i) => i.path.join('.') === 'event')).toBe(true);
  });

  it('rejeita body completamente vazio', () => {
    expect(WebhookInboundV1Schema.safeParse({}).success).toBe(false);
  });

  it('rejeita event como string vazia', () => {
    const res = WebhookInboundV1Schema.safeParse({ event: '', data: {} });
    expect(res.success).toBe(false);
  });

  it('rejeita occurred_at em formato não-datetime / não-epoch', () => {
    const res = WebhookInboundV1Schema.safeParse({
      event: 'x',
      data: {},
      occurred_at: 'ontem',
    });
    expect(res.success).toBe(false);
  });

  it('rejeita data ausente', () => {
    const res = WebhookInboundV1Schema.safeParse({ event: 'x' });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error.issues.some((i) => i.path.join('.') === 'data')).toBe(true);
  });
});

describe('webhook-inbound — manifesto', () => {
  it('expõe apenas v1', () => {
    expect(WebhookInboundVersions).toEqual(['v1']);
    expect(WebhookInboundSchemaByVersion.v1).toBeDefined();
  });
});
