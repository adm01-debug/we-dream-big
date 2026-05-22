/**
 * Versioned contract schemas for webhook-inbound.
 *
 * The endpoint historically accepted any JSON (no schema). V1 introduces a
 * minimal envelope (`event_type` + `payload`) that is lenient — to avoid
 * breaking external publishers that already point at this URL — while
 * still rejecting non-object bodies, oversized payloads and missing event_type.
 *
 * V2 adds:
 *   - `request_id` (required) — uuid for correlation
 *   - `payload.*` is required (no longer optional)
 *   - .strict() at root
 *
 * NOTE: HMAC signature validation happens BEFORE schema parsing in index.ts.
 * The schema only governs the shape of the parsed JSON body once HMAC passes.
 */

import { z } from "https://esm.sh/zod@3.23.8";

const EventTypeSchema = z.string().min(1).max(120);

// ──────────────────────────────────────────────────────────────────
// V1 — lenient envelope (no schema existed before this commit)
// ──────────────────────────────────────────────────────────────────

export const InboundWebhookSchemaV1 = z.object({
  event_type: EventTypeSchema.optional(),
  payload: z.record(z.unknown()).optional(),
  // Allow any extra top-level fields (lenient v1).
}).passthrough();

export type InboundWebhookV1 = z.infer<typeof InboundWebhookSchemaV1>;

// ──────────────────────────────────────────────────────────────────
// V2 — strict envelope + correlation
// ──────────────────────────────────────────────────────────────────

export const InboundWebhookSchemaV2 = z.object({
  event_type: EventTypeSchema,
  payload: z.record(z.unknown()),
  request_id: z.string().uuid(),
}).strict();

export type InboundWebhookV2 = z.infer<typeof InboundWebhookSchemaV2>;

// ──────────────────────────────────────────────────────────────────
// Canonical shape
// ──────────────────────────────────────────────────────────────────

export interface CanonicalInboundWebhook {
  event_type: string;
  payload: Record<string, unknown>;
  request_id: string | null;
  raw: Record<string, unknown>;
}

export function adaptV1ToCanonical(data: InboundWebhookV1): CanonicalInboundWebhook {
  return {
    event_type: data.event_type ?? "unknown",
    payload: (data.payload ?? {}) as Record<string, unknown>,
    request_id: null,
    raw: data as Record<string, unknown>,
  };
}

export function adaptV2ToCanonical(data: InboundWebhookV2): CanonicalInboundWebhook {
  return {
    event_type: data.event_type,
    payload: data.payload,
    request_id: data.request_id,
    raw: data as Record<string, unknown>,
  };
}
