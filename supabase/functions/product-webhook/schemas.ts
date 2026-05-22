/**
 * Versioned contract schemas for product-webhook.
 *
 * V1: matches the original inline schema (byte-compat with n8n).
 * V2: extends V1 with stricter / additional fields:
 *   - idempotency_key (required) — caller must supply a stable key per dispatch
 *   - metadata.source (required) — provenance string ("n8n", "manual", etc.)
 *   - .strict() at root — unknown top-level keys are rejected
 *
 * V1 → canonical adapter fills the new fields with safe defaults so the
 * single business-logic implementation operates on a uniform shape.
 */

import { z } from "https://esm.sh/zod@3.23.8";

// ──────────────────────────────────────────────────────────────────
// Shared sub-schemas (used by both v1 and v2)
// ──────────────────────────────────────────────────────────────────

const ProductPayloadSchema = z.object({
  external_id: z.string().max(255).optional(),
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  price: z.number().nonnegative(),
  min_quantity: z.number().int().positive().optional(),
  category_id: z.number().int().optional(),
  category_name: z.string().max(255).optional(),
  subcategory: z.string().max(255).optional(),
  supplier_id: z.string().max(255).optional(),
  supplier_name: z.string().max(255).optional(),
  stock: z.number().int().nonnegative().optional(),
  stock_status: z.string().max(50).optional(),
  is_kit: z.boolean().optional(),
  is_active: z.boolean().optional(),
  featured: z.boolean().optional(),
  new_arrival: z.boolean().optional(),
  on_sale: z.boolean().optional(),
  images: z.array(z.string().url().max(2000)).max(50).optional(),
  video_url: z.string().url().max(2000).optional().nullable(),
  colors: z.array(
    z.object({ name: z.string(), hex: z.string(), group: z.string().optional() }),
  ).max(100).optional(),
  materials: z.array(z.string().max(100)).max(50).optional(),
  tags: z.record(z.array(z.string())).optional(),
  kit_items: z.array(z.object({
    productId: z.string(),
    productName: z.string(),
    quantity: z.number(),
    sku: z.string(),
  })).max(50).optional(),
  variations: z.array(z.any()).max(200).optional(),
  metadata: z.record(z.any()).optional(),
});

export type ProductPayload = z.infer<typeof ProductPayloadSchema>;

const ActionEnum = z.enum(["sync", "upsert", "delete", "batch_upsert"]);

// ──────────────────────────────────────────────────────────────────
// V1 — legacy schema (matches inline schema from index.ts pre-change)
// ──────────────────────────────────────────────────────────────────

export const WebhookPayloadSchemaV1 = z.object({
  action: ActionEnum,
  products: z.array(ProductPayloadSchema).max(500).optional(),
  product: ProductPayloadSchema.optional(),
  external_ids: z.array(z.string().max(255)).max(500).optional(),
});

export type WebhookPayloadV1 = z.infer<typeof WebhookPayloadSchemaV1>;

// ──────────────────────────────────────────────────────────────────
// V2 — stricter, more observable
// ──────────────────────────────────────────────────────────────────

const MetadataV2 = z.object({
  source: z.string().min(1).max(100),
}).passthrough();

export const WebhookPayloadSchemaV2 = z.object({
  action: ActionEnum,
  products: z.array(ProductPayloadSchema).max(500).optional(),
  product: ProductPayloadSchema.optional(),
  external_ids: z.array(z.string().max(255)).max(500).optional(),
  idempotency_key: z.string().min(8).max(255),
  metadata: MetadataV2,
}).strict();

export type WebhookPayloadV2 = z.infer<typeof WebhookPayloadSchemaV2>;

// ──────────────────────────────────────────────────────────────────
// Canonical shape — what business logic consumes
// ──────────────────────────────────────────────────────────────────

export interface CanonicalProductWebhookPayload {
  action: "sync" | "upsert" | "delete" | "batch_upsert";
  products?: ProductPayload[];
  product?: ProductPayload;
  external_ids?: string[];
  idempotency_key: string | null;
  metadata: Record<string, unknown>;
}

export function adaptV1ToCanonical(
  data: WebhookPayloadV1,
): CanonicalProductWebhookPayload {
  return {
    action: data.action,
    products: data.products,
    product: data.product,
    external_ids: data.external_ids,
    idempotency_key: null,
    metadata: {},
  };
}

export function adaptV2ToCanonical(
  data: WebhookPayloadV2,
): CanonicalProductWebhookPayload {
  return {
    action: data.action,
    products: data.products,
    product: data.product,
    external_ids: data.external_ids,
    idempotency_key: data.idempotency_key,
    metadata: data.metadata,
  };
}
