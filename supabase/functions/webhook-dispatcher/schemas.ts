/**
 * Versioned contract schemas for webhook-dispatcher.
 *
 * V1: matches the inline BodySchema from index.ts pre-change.
 * V2: adds dispatch_options (parallel, timeout_ms) and a correlation_id echo.
 */

import { z } from "https://esm.sh/zod@3.23.8";

export const DispatchBodySchemaV1 = z.object({
  event: z.string().min(1),
  payload: z.unknown().optional(),
  replay_delivery_id: z.string().uuid().optional(),
  test_mode: z.boolean().optional(),
  test_webhook_id: z.string().uuid().optional(),
});

export type DispatchBodyV1 = z.infer<typeof DispatchBodySchemaV1>;

const DispatchOptionsV2 = z.object({
  parallel: z.boolean().optional(),
  timeout_ms: z.number().int().min(100).max(60_000).optional(),
}).strict();

export const DispatchBodySchemaV2 = z.object({
  event: z.string().min(1),
  payload: z.unknown().optional(),
  replay_delivery_id: z.string().uuid().optional(),
  test_mode: z.boolean().optional(),
  test_webhook_id: z.string().uuid().optional(),
  correlation_id: z.string().uuid(),
  dispatch_options: DispatchOptionsV2.optional(),
}).strict();

export type DispatchBodyV2 = z.infer<typeof DispatchBodySchemaV2>;

export interface CanonicalDispatchBody {
  event: string;
  payload?: unknown;
  replay_delivery_id?: string;
  test_mode?: boolean;
  test_webhook_id?: string;
  correlation_id: string | null;
  dispatch_options: { parallel?: boolean; timeout_ms?: number };
}

export function adaptV1ToCanonical(data: DispatchBodyV1): CanonicalDispatchBody {
  return {
    event: data.event,
    payload: data.payload,
    replay_delivery_id: data.replay_delivery_id,
    test_mode: data.test_mode,
    test_webhook_id: data.test_webhook_id,
    correlation_id: null,
    dispatch_options: {},
  };
}

export function adaptV2ToCanonical(data: DispatchBodyV2): CanonicalDispatchBody {
  return {
    event: data.event,
    payload: data.payload,
    replay_delivery_id: data.replay_delivery_id,
    test_mode: data.test_mode,
    test_webhook_id: data.test_webhook_id,
    correlation_id: data.correlation_id,
    dispatch_options: data.dispatch_options ?? {},
  };
}
