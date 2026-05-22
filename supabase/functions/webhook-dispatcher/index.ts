// webhook-dispatcher: dispatches an event to all active outbound_webhooks
// subscribed to that event. HMAC signs payload with webhook secret. Retries
// with backoff and logs each attempt to webhook_deliveries.
//
// AUTORIZAÇÃO (Onda 1 hardening, 2026-05-14):
//   - Modo A: header `x-dispatcher-secret: <SECRET>` (triggers DB, RPCs, cron)
//   - Modo B: `Authorization: Bearer <user JWT>` + role >= supervisor (frontend)
//   - test_mode e replay_delivery_id exigem Modo B (operação sensível)
//   - Retrocompat: se WEBHOOK_DISPATCHER_SECRET não estiver setado, aceita anônimo com warning
//
// Ver: supabase/functions/_shared/dispatcher-auth.ts
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";
import { buildPublicCorsHeaders } from "../_shared/cors.ts";
import { authorizeDispatcher } from "../_shared/dispatcher-auth.ts";
import {
  resolveVersion,
  VERSION_SERVED_HEADER,
} from "../_shared/version-dispatch.ts";
import {
  buildV1ValidationError,
  buildV2ValidationError,
} from "../_shared/error-response.ts";
import {
  adaptV1ToCanonical,
  adaptV2ToCanonical,
  type CanonicalDispatchBody,
  DispatchBodySchemaV1,
  DispatchBodySchemaV2,
} from "./schemas.ts";

const corsHeaders = buildPublicCorsHeaders({ allowMethods: "POST, OPTIONS" });

// Circuit breaker: 5 falhas consecutivas → desativa o webhook
const CIRCUIT_BREAKER_THRESHOLD = 5;

async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return encodeHex(new Uint8Array(sig));
}

async function payloadHash(payload: string): Promise<string> {
  const data = new TextEncoder().encode(payload);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return encodeHex(new Uint8Array(hash));
}

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const version = resolveVersion(req);
  const corsWithVersion = { ...corsHeaders, [VERSION_SERVED_HEADER]: version };

  // Guard: require X-Dispatcher-Secret to prevent unauthorized invocations
  const dispatcherSecret = Deno.env.get("WEBHOOK_DISPATCHER_SECRET");
  if (dispatcherSecret) {
    const incoming = req.headers.get("x-dispatcher-secret");
    if (!incoming || incoming !== dispatcherSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsWithVersion, "Content-Type": "application/json" },
      });
    }
  }

  try {
    // Body precisa ser parseado antes da auth pra saber se requer Modo B (test_mode/replay).
    // Body parse falha → 400 (v1) ou 422 (v2) antes da auth (não vaza info).
    const rawJson = await req.json().catch(() => ({}));
    const schema = version === "v2" ? DispatchBodySchemaV2 : DispatchBodySchemaV1;
    const parsedResult = schema.safeParse(rawJson);
    if (!parsedResult.success) {
      return version === "v2"
        ? buildV2ValidationError(parsedResult.error, corsWithVersion)
        : buildV1ValidationError(parsedResult.error, corsWithVersion);
    }
    const canonical: CanonicalDispatchBody = version === "v2"
      ? adaptV2ToCanonical(parsedResult.data as never)
      : adaptV1ToCanonical(parsedResult.data as never);
    let { event, payload } = canonical;
    const { replay_delivery_id, test_mode, test_webhook_id } = canonical;

    // Operações que mexem com webhook específico (test/replay) só por Modo B
    const requiresUserContext = !!(test_mode || replay_delivery_id);

    const auth = await authorizeDispatcher(req, {
      corsHeaders: corsWithVersion,
      requireUserContext: requiresUserContext,
      minRole: "supervisor",
    });
    if (!auth.ok) return auth.response;

    const supabase = auth.supabaseAdmin;

    // Test mode (Onda 13 #9): single-shot, no retries, no DB write, no breaker
    if (test_mode) {
      if (!test_webhook_id) {
        return new Response(JSON.stringify({ error: "test_webhook_id obrigatório em test_mode" }), {
          status: 400, headers: { ...corsWithVersion, "Content-Type": "application/json" },
        });
      }
      const { data: hook, error: hookErr } = await supabase
        .from("outbound_webhooks")
        .select("id, name, url, secret_ref")
        .eq("id", test_webhook_id)
        .maybeSingle();
      if (hookErr || !hook) {
        return new Response(JSON.stringify({ error: "Webhook não encontrado" }), {
          status: 404, headers: { ...corsWithVersion, "Content-Type": "application/json" },
        });
      }
      const bodyJson = JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        test: true,
        data: payload ?? null,
      });
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "PromoGifts-Webhooks/1.0 (test)",
        "X-Event": event,
        "X-Webhook-Id": hook.id,
        "X-Test-Mode": "1",
      };
      const secret = hook.secret_ref ? Deno.env.get(hook.secret_ref) : null;
      if (secret) headers["X-Signature-256"] = "sha256=" + await hmacSign(bodyJson, secret);
      const start = Date.now();
      try {
        const res = await fetch(hook.url, { method: "POST", headers, body: bodyJson });
        const respText = (await res.text()).slice(0, 4000);
        return new Response(JSON.stringify({
          ok: true,
          test_mode: true,
          webhook_id: hook.id,
          status_code: res.status,
          latency_ms: Date.now() - start,
          response_body: respText,
          success: res.ok,
          correlation_id: canonical.correlation_id,
        }), { headers: { ...corsWithVersion, "Content-Type": "application/json" } });
      } catch (err) {
        return new Response(JSON.stringify({
          ok: true,
          test_mode: true,
          webhook_id: hook.id,
          status_code: null,
          latency_ms: Date.now() - start,
          error: err instanceof Error ? err.message : "Erro de rede",
          success: false,
          correlation_id: canonical.correlation_id,
        }), { headers: { ...corsWithVersion, "Content-Type": "application/json" } });
      }
    }

    // Replay mode: load the original delivery and re-target only its webhook
    let replayHookId: string | null = null;
    if (replay_delivery_id) {
      const { data: orig, error: origErr } = await supabase
        .from("webhook_deliveries")
        .select("webhook_id, event, payload")
        .eq("id", replay_delivery_id)
        .maybeSingle();
      if (origErr || !orig) {
        return new Response(JSON.stringify({ error: "Delivery não encontrada" }), {
          status: 404, headers: { ...corsWithVersion, "Content-Type": "application/json" },
        });
      }
      event = orig.event;
      payload = orig.payload;
      replayHookId = orig.webhook_id;
    }

    let hooksQuery = supabase
      .from("outbound_webhooks")
      .select("*")
      .contains("events", [event]);
    if (replayHookId) {
      hooksQuery = hooksQuery.eq("id", replayHookId); // replay ignora active flag
    } else {
      hooksQuery = hooksQuery.eq("active", true);
    }
    const { data: hooks, error } = await hooksQuery;
    if (error) throw error;

    if (!hooks || hooks.length === 0) {
      return new Response(JSON.stringify({
        ok: true,
        dispatched: 0,
        correlation_id: canonical.correlation_id,
      }), {
        headers: { ...corsWithVersion, "Content-Type": "application/json" },
      });
    }

    const bodyJson = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload ?? null,
    });
    const phash = await payloadHash(bodyJson);
    const results: Array<Record<string, unknown>> = [];

    for (const hook of hooks) {
      const policy = hook.retry_policy ?? { max_attempts: 3, backoff_seconds: [5, 30, 120] };
      const max = Math.max(1, Math.min(5, Number(policy.max_attempts ?? 3)));
      const backoff = Array.isArray(policy.backoff_seconds) ? policy.backoff_seconds : [5, 30, 120];
      let success = false;
      let attempt = 0;

      while (attempt < max && !success) {
        attempt++;
        try {
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "User-Agent": "PromoGifts-Webhooks/1.0",
            "X-Event": event,
            "X-Webhook-Id": hook.id,
            "X-Delivery-Attempt": String(attempt),
          };
          const secret = hook.secret_ref ? Deno.env.get(hook.secret_ref) : null;
          if (secret) headers["X-Signature-256"] = "sha256=" + await hmacSign(bodyJson, secret);

          const res = await fetch(hook.url, { method: "POST", headers, body: bodyJson });
          const respText = (await res.text()).slice(0, 4000);

          await supabase.from("webhook_deliveries").insert({
            webhook_id: hook.id,
            event,
            payload: payload ?? null,
            payload_hash: phash,
            status_code: res.status,
            response_body_truncated: respText,
            attempt,
            success: res.ok,
            error_message: res.ok ? null : `HTTP ${res.status}`,
          });

          if (res.ok) {
            success = true;
            await supabase.from("outbound_webhooks").update({
              last_triggered_at: new Date().toISOString(),
              total_success: (hook.total_success ?? 0) + 1,
              consecutive_failures: 0,
            }).eq("id", hook.id);
            results.push({ webhook_id: hook.id, status: "success", attempt });
          } else if (attempt < max) {
            const delay = (backoff[attempt - 1] ?? backoff[backoff.length - 1] ?? 30) * 1000;
            await new Promise((r) => setTimeout(r, delay));
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Erro desconhecido";
          await supabase.from("webhook_deliveries").insert({
            webhook_id: hook.id, event, payload: payload ?? null, payload_hash: phash,
            status_code: null, response_body_truncated: msg.slice(0, 4000),
            attempt, success: false, error_message: msg,
          });
          if (attempt < max) {
            const delay = (backoff[attempt - 1] ?? 30) * 1000;
            await new Promise((r) => setTimeout(r, delay));
          }
        }
      }

      if (!success) {
        const newConsecutive = (hook.consecutive_failures ?? 0) + 1;
        const shouldAutoDisable = !replayHookId && newConsecutive >= CIRCUIT_BREAKER_THRESHOLD && hook.active;
        const updatePayload: Record<string, unknown> = {
          total_failure: (hook.total_failure ?? 0) + 1,
          consecutive_failures: newConsecutive,
        };
        if (shouldAutoDisable) {
          updatePayload.active = false;
          updatePayload.auto_disabled_at = new Date().toISOString();
          updatePayload.auto_disabled_reason = `${newConsecutive} falhas consecutivas (circuit breaker)`;
        }
        await supabase.from("outbound_webhooks").update(updatePayload).eq("id", hook.id);
        results.push({
          webhook_id: hook.id,
          status: "failed",
          attempts: attempt,
          consecutive_failures: newConsecutive,
          auto_disabled: shouldAutoDisable,
        });
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      dispatched: hooks.length,
      results,
      correlation_id: canonical.correlation_id,
    }), {
      headers: { ...corsWithVersion, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsWithVersion, "Content-Type": "application/json" },
    });
  }
};

if (import.meta.main) Deno.serve(handler);
