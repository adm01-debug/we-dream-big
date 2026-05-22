/**
 * Contratos do webhook-dispatcher (v1 + v2).
 *
 * v1 — comportamento atual: dispatch de um event para todos os webhooks assinados.
 *      Suporta replay_delivery_id e test_mode.
 *
 * v2 — adiciona:
 *      - `priority`           (enum 'low'|'normal'|'high') — afeta retry policy
 *      - `dedupe_window_ms`   (0..60000) — evita reentrega do mesmo event_id
 *      - `event_id`           (uuid) — chave de deduplicação
 *      - mutual-exclusion explícita: dispatch | replay | test (uma operação por chamada)
 */

import { z } from "https://esm.sh/zod@3.23.8";

// ---------------------------------------------------------------------------
// v1 — schema atual do webhook-dispatcher (importado de index.ts original)
// ---------------------------------------------------------------------------

export const WebhookDispatcherV1Schema = z.object({
  event: z.string().min(1),
  payload: z.unknown().optional(),
  // Replay mode: re-deliver a single failed delivery by id
  replay_delivery_id: z.string().uuid().optional(),
  // Test mode: dispatch to a specific webhook, no metrics, no breaker, no DB log
  test_mode: z.boolean().optional(),
  test_webhook_id: z.string().uuid().optional(),
});

export type WebhookDispatcherV1 = z.infer<typeof WebhookDispatcherV1Schema>;

// ---------------------------------------------------------------------------
// v2 — adiciona priority, dedupe, event_id e mutual-exclusion
// ---------------------------------------------------------------------------

export const WebhookDispatcherV2Schema = z
  .object({
    event: z.string().min(1).max(120),
    event_id: z.string().uuid().optional(),
    payload: z.unknown().optional(),
    priority: z.enum(["low", "normal", "high"]).default("normal"),
    dedupe_window_ms: z.number().int().min(0).max(60_000).optional(),
    replay_delivery_id: z.string().uuid().optional(),
    test_mode: z.boolean().optional(),
    test_webhook_id: z.string().uuid().optional(),
  })
  .superRefine((d, ctx) => {
    // Mutual exclusion: dispatch | replay | test → exatamente um modo.
    const modes = [
      !d.replay_delivery_id && !d.test_mode, // dispatch normal
      Boolean(d.replay_delivery_id),
      Boolean(d.test_mode),
    ].filter(Boolean).length;
    if (modes !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["test_mode"],
        message: "Combine apenas um modo: dispatch, replay_delivery_id, ou test_mode",
      });
    }
    if (d.test_mode && !d.test_webhook_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["test_webhook_id"],
        message: "test_webhook_id é obrigatório quando test_mode=true",
      });
    }
  });

export type WebhookDispatcherV2 = z.infer<typeof WebhookDispatcherV2Schema>;

// ---------------------------------------------------------------------------
// Manifesto
// ---------------------------------------------------------------------------

export const WebhookDispatcherVersions = ["v1", "v2"] as const;
export type WebhookDispatcherVersion = typeof WebhookDispatcherVersions[number];

export const WebhookDispatcherSchemaByVersion = {
  v1: WebhookDispatcherV1Schema,
  v2: WebhookDispatcherV2Schema,
} as const;
