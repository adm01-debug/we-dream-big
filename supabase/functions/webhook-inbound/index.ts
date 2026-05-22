// webhook-inbound: receives external webhooks at /webhook-inbound?slug=<slug>
// Validates HMAC signature using the secret stored in env (referenced by the
// endpoint row), records every event in inbound_webhook_events.
//
// Contract versioning (path-based):
//   - /functions/v1/webhook-inbound[?slug=X]            → v1 (lenient envelope)
//   - /functions/v1/webhook-inbound/v2[?slug=X]         → v2 (strict + request_id)
//
// HMAC is validated against the RAW body BEFORE schema parsing, so signature
// checks remain deterministic regardless of contract version.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";
import { buildPublicCorsHeaders } from "../_shared/cors.ts";
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
  type CanonicalInboundWebhook,
  InboundWebhookSchemaV1,
  InboundWebhookSchemaV2,
} from "./schemas.ts";

const corsHeaders = buildPublicCorsHeaders({
  extraAllowHeaders: ["x-signature-256", "x-event", "x-request-id"],
  allowMethods: "POST, OPTIONS",
});

async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return encodeHex(new Uint8Array(sig));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const version = resolveVersion(req);
  const corsWithVersion = { ...corsHeaders, [VERSION_SERVED_HEADER]: version };

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug")
      || url.pathname.split("/").filter((s) => s && s !== "v1" && s !== "v2").pop()
      || "";
    if (!slug) {
      return new Response(JSON.stringify({ error: "slug ausente" }), {
        status: 400,
        headers: { ...corsWithVersion, "Content-Type": "application/json" },
      });
    }

    const { data: endpoint } = await supabase
      .from("inbound_webhook_endpoints")
      .select("*")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();
    if (!endpoint) {
      return new Response(JSON.stringify({ error: "endpoint não encontrado" }), {
        status: 404,
        headers: { ...corsWithVersion, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-signature-256")
      || req.headers.get("x-webhook-signature")
      || "";
    const eventType = req.headers.get("x-event") || "unknown";
    const sourceIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

    const secretRes = await supabase
      .from("integration_credentials")
      .select("secret_value")
      .eq("secret_name", endpoint.hmac_secret_ref)
      .maybeSingle();
    const secret = secretRes.data?.secret_value || Deno.env.get(endpoint.hmac_secret_ref);

    let signatureValid = false;
    if (secret) {
      const expected = "sha256=" + await hmacSign(rawBody, secret);
      const provided = signatureHeader.startsWith("sha256=")
        ? signatureHeader
        : "sha256=" + signatureHeader;
      signatureValid = timingSafeEqual(expected, provided);
    }

    // Parse JSON body (after HMAC). On invalid JSON / schema, behavior depends
    // on version: v1 logs as parsed=null + 200 (lenient); v2 returns 422.
    let parsedJson: unknown = null;
    let jsonParseFailed = false;
    if (rawBody && rawBody.trim() !== "") {
      try {
        parsedJson = JSON.parse(rawBody);
      } catch {
        jsonParseFailed = true;
      }
    }

    let canonical: CanonicalInboundWebhook | null = null;
    let schemaErrorResponse: Response | null = null;

    if (jsonParseFailed) {
      if (version === "v2") {
        // Fabricate a zod error for shape consistency.
        const fakeErr = InboundWebhookSchemaV2.safeParse(undefined);
        if (!fakeErr.success) {
          schemaErrorResponse = buildV2ValidationError(
            fakeErr.error,
            corsWithVersion,
            "Invalid JSON in request body",
          );
        }
      }
      // v1: keep legacy behavior — proceed with parsedJson=null, sig still validated.
    } else if (parsedJson !== null && typeof parsedJson === "object") {
      const schema = version === "v2"
        ? InboundWebhookSchemaV2
        : InboundWebhookSchemaV1;
      const result = schema.safeParse(parsedJson);
      if (!result.success) {
        if (version === "v2") {
          schemaErrorResponse = buildV2ValidationError(result.error, corsWithVersion);
        } else {
          // V1 is lenient (passthrough); rare to fail. If it does, return 400 details.
          schemaErrorResponse = buildV1ValidationError(result.error, corsWithVersion);
        }
      } else {
        canonical = version === "v2"
          ? adaptV2ToCanonical(result.data as never)
          : adaptV1ToCanonical(result.data as never);
      }
    } else if (parsedJson === null && rawBody && rawBody.trim() !== "") {
      // Body parsed but not an object (e.g. "string" or 42). V2 rejects; V1 tolerates.
      if (version === "v2") {
        const fakeErr = InboundWebhookSchemaV2.safeParse(parsedJson);
        if (!fakeErr.success) {
          schemaErrorResponse = buildV2ValidationError(fakeErr.error, corsWithVersion);
        }
      }
    }

    // Persist EVERY event (valid or not) — this is the system of record for
    // inbound webhook traffic, regardless of contract version.
    await supabase.from("inbound_webhook_events").insert({
      endpoint_id: endpoint.id,
      event_type: canonical?.event_type ?? eventType,
      payload: parsedJson,
      signature_valid: signatureValid,
      processed: signatureValid && schemaErrorResponse === null,
      source_ip: sourceIp,
      error: !signatureValid
        ? "HMAC inválido ou ausente"
        : schemaErrorResponse !== null
          ? "Schema validation failed"
          : null,
    });

    await supabase.from("inbound_webhook_endpoints").update({
      last_received_at: new Date().toISOString(),
      total_received: (endpoint.total_received ?? 0) + 1,
      total_invalid: (endpoint.total_invalid ?? 0) + (signatureValid ? 0 : 1),
    }).eq("id", endpoint.id);

    if (!signatureValid) {
      // V2 returns problem+json shape; V1 keeps legacy.
      if (version === "v2") {
        return new Response(
          JSON.stringify({
            code: "invalid_signature",
            message: "HMAC signature missing or invalid",
            fields: [],
          }),
          {
            status: 401,
            headers: {
              ...corsWithVersion,
              "Content-Type": "application/problem+json",
            },
          },
        );
      }
      return new Response(JSON.stringify({ error: "Assinatura inválida" }), {
        status: 401,
        headers: { ...corsWithVersion, "Content-Type": "application/json" },
      });
    }

    if (schemaErrorResponse) return schemaErrorResponse;

    return new Response(
      JSON.stringify({
        ok: true,
        received: true,
        request_id: canonical?.request_id ?? null,
      }),
      { headers: { ...corsWithVersion, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsWithVersion, "Content-Type": "application/json" },
    });
  }
};

if (import.meta.main) Deno.serve(handler);
