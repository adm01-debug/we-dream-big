/**
 * Integration Test: Webhook Inbound
 * Valida o processamento de webhooks externos, segurança (HMAC) e persistência.
 */
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return "sha256=" + encodeHex(new Uint8Array(sig));
}

Deno.test({
  name: "[webhook-inbound] Fluxo completo de validação HMAC e persistência",
  fn: async () => {
    const slug = `test-hook-${Date.now()}`;
    const testSecret = "test-secret-key";
    
    // 1. Setup: cria endpoint de teste
    // Usamos um nome de env que sabemos que existe ou simulamos
    // Para teste de integração, podemos apontar para uma chave genérica
    const { data: endpoint, error: setupError } = await supabase
      .from("inbound_webhook_endpoints")
      .insert({
        name: "Test Integration Hook",
        slug,
        active: true,
        hmac_secret_ref: "SUPABASE_SERVICE_ROLE_KEY", // Usamos uma env que existe no sandbox
      })
      .select()
      .single();

    if (setupError) throw setupError;

    try {
      const payload = JSON.stringify({ event: "test", data: 123 });
      const realSecret = SUPABASE_SERVICE_ROLE_KEY;
      const validSignature = await hmacSign(payload, realSecret);

      // 2. Teste: Assinatura VÁLIDA
      const resOk = await fetch(`${SUPABASE_URL}/functions/v1/webhook-inbound?slug=${slug}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-signature-256": validSignature,
          "x-event": "order.created"
        },
        body: payload
      });

      assertEquals(resOk.status, 200);
      const jsonOk = await resOk.json();
      assert(jsonOk.ok);

      // 3. Teste: Assinatura INVÁLIDA
      const resFail = await fetch(`${SUPABASE_URL}/functions/v1/webhook-inbound?slug=${slug}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-signature-256": "sha256=invalid-sig",
        },
        body: payload
      });
      assertEquals(resFail.status, 401);

      // 4. Validação no Banco
      const { data: events } = await supabase
        .from("inbound_webhook_events")
        .select("*")
        .eq("endpoint_id", endpoint.id)
        .order("created_at", { ascending: false });

      assert(events && events.length >= 2, "Deveria ter registrado os dois eventos");
      assertEquals(events[0].signature_valid, false);
      assertEquals(events[1].signature_valid, true);

    } finally {
      // Cleanup
      await supabase.from("inbound_webhook_endpoints").delete().eq("id", endpoint.id);
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
