# Bloco 12 — Edge Functions (Lote 2/N)

**Lote atual:** 5 funções de Quote/Kit (públicas + AI)

**`verify_jwt` global:** `config.toml` só tem `project_id` → todas usam default `verify_jwt = false` (validação em código).

| # | Função | Auth interna | Tamanho |
|---|--------|--------------|---------|
| 1 | quote-public-view | pública (token + bot protection + Zod) | 16.0 KB |
| 2 | quote-followup-reminders | service-role (cron) | 3.3 KB |
| 3 | kit-public-view | pública (token + bot protection + Zod) | 7.5 KB |
| 4 | kit-ai-builder | JWT + Lovable AI Gateway | 5.4 KB |
| 5 | kit-identity-suggest | JWT + Lovable AI Gateway | 5.4 KB |

---

## 📦 `supabase/functions/quote-public-view/index.ts`

**Secrets/env vars referenciadas:**

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`

**Imports `_shared/*`:**

- `import { buildPublicCorsHeaders } from "../_shared/cors.ts";`
- `import { resolveCredential } from "../_shared/credentials.ts";`
- `import { runBotProtection } from "../_shared/bot-protection.ts";`
- `import { z } from "../_shared/zod-validate.ts";`

**Código fonte completo:**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "../_shared/zod-validate.ts";
import { runBotProtection } from "../_shared/bot-protection.ts";
import { resolveCredential } from "../_shared/credentials.ts";
import { buildPublicCorsHeaders } from "../_shared/cors.ts";

const corsHeaders = buildPublicCorsHeaders();

const GetQuoteSchema = z.object({
  action: z.enum(["get_quote", "respond", "submit_response"]),
  token: z.string().min(1, "Token é obrigatório").max(200),
  response: z.enum(["approved", "rejected"]).optional(),
  response_notes: z.string().max(2000).optional(),
  signer_name: z.string().min(3).max(200).optional(),
  signer_document: z.string().min(11).max(20).optional(),
});

// SHA-256 helper for signature integrity
async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function getClientIpFromReq(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Anti-scraping: 30 req/min por IP, bloqueio 1h. Protege contra brute-force de tokens.
    const protection = await runBotProtection(req, {
      endpoint: 'quote-public-view',
      maxRequests: 30,
      windowSeconds: 60,
      blockSeconds: 3600,
      allowSearchBots: false,  // orçamentos não devem ser indexados
    }, corsHeaders);
    if (!protection.allowed) return protection.blockResponse!;

    // Safely parse body — GET requests have no body
    let rawBody: Record<string, unknown> = {};
    if (req.method === "POST" || req.method === "PUT") {
      try {
        rawBody = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: "Corpo da requisição inválido. Envie um JSON com action e token." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // For GET requests, try to read token from query params
      const url = new URL(req.url);
      const tokenParam = url.searchParams.get("token");
      if (tokenParam) {
        rawBody = { action: "get_quote", token: tokenParam };
      } else {
        return new Response(
          JSON.stringify({ error: "Use POST com JSON body ou GET com ?token=..." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const parsed = GetQuoteSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Parâmetros inválidos", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, token, response, response_notes, signer_name, signer_document } = parsed.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // CRM bridge credentials — DB-first via integration_credentials,
    // env fallback via aliases. O `!` antigo causava throw quando o
    // env não estava configurado mesmo com credenciais salvas pela UI.
    const [crmUrlRes, crmSvcRes, crmAnonRes] = await Promise.all([
      resolveCredential("EXTERNAL_CRM_URL"),
      resolveCredential("EXTERNAL_CRM_SERVICE_ROLE_KEY"),
      resolveCredential("EXTERNAL_CRM_ANON_KEY"),
    ]);
    const crmUrl = crmUrlRes.value;
    const crmKey = crmSvcRes.value ?? crmAnonRes.value;
    if (!crmUrl || !crmKey) {
      return new Response(
        JSON.stringify({ error: "CRM database credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const crmClient = createClient(crmUrl, crmKey);

    const clientIp = getClientIpFromReq(req);
    const clientUa = req.headers.get("user-agent") || null;

    if (action === "get_quote") {
      // Fetch token record
      const { data: tokenData, error: tokenError } = await supabase
        .from("quote_approval_tokens")
        .select("*")
        .eq("token", token)
        .single();

      if (tokenError || !tokenData) {
        await supabase.rpc("record_public_token_failure", {
          _resource_type: "quote",
          _resource_id: null,
          _attempted_token: token.substring(0, 32),
          _ip: clientIp,
          _ua: clientUa,
          _reason: "token_not_found",
        });
        return new Response(
          JSON.stringify({ error: "Token inválido ou expirado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if expired
      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        await supabase.rpc("record_public_token_failure", {
          _resource_type: "quote",
          _resource_id: tokenData.quote_id,
          _attempted_token: token.substring(0, 32),
          _ip: clientIp,
          _ua: clientUa,
          _reason: "token_expired",
        });
        return new Response(
          JSON.stringify({ error: "Este link expirou", expired: true }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if already responded
      if (tokenData.responded_at) {
        return new Response(
          JSON.stringify({
            already_responded: true,
            response: tokenData.response,
            response_notes: tokenData.response_notes,
            responded_at: tokenData.responded_at,
            signer_name: tokenData.signer_name,
            signer_document: tokenData.signer_document,
            signature_hash: tokenData.signature_hash,
            signed_at: tokenData.signed_at,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark as viewed
      if (!tokenData.viewed_at) {
        await supabase
          .from("quote_approval_tokens")
          .update({ viewed_at: new Date().toISOString() })
          .eq("id", tokenData.id);
      }

      // Fetch quote from CRM
      const { data: quote, error: quoteError } = await crmClient
        .from("quotes")
        .select("*")
        .eq("id", tokenData.quote_id)
        .single();

      if (quoteError || !quote) {
        return new Response(
          JSON.stringify({ error: "Orçamento não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch items
      const { data: items } = await crmClient
        .from("quote_items")
        .select("*")
        .eq("quote_id", tokenData.quote_id)
        .order("sort_order", { ascending: true });

      // Fetch personalizations
      const itemIds = (items || []).map((i: any) => i.id);
      let personalizations: any[] = [];
      if (itemIds.length > 0) {
        const { data: persData } = await crmClient
          .from("quote_item_personalizations")
          .select("*")
          .in("quote_item_id", itemIds);
        personalizations = persData || [];
      }

      // Fetch seller profile
      const { data: sellerProfile } = await supabase
        .from("profiles")
        .select("full_name, email, phone, avatar_url")
        .eq("user_id", tokenData.seller_id)
        .single();

      // Map personalizations to items
      const enrichedItems = (items || []).map((item: any) => ({
        ...item,
        // Clean notes (remove BPID markers)
        notes: (item.notes || "").replace(/\|\|\|BPID:[^|]*\|\|\|/g, "").trim() || null,
        personalizations: personalizations.filter((p: any) => p.quote_item_id === item.id),
      }));

      // Decode shipping from internal_notes
      const raw = quote.internal_notes || "";
      const shippingMatch = raw.match(/\|\|\|FRETE:(.*?):(.*?)\|\|\|/);
      const shippingType = shippingMatch ? shippingMatch[1] : null;
      const shippingCost = shippingMatch && shippingMatch[2] ? parseFloat(shippingMatch[2]) : null;
      const cleanNotes = raw.replace(/\s*\|\|\|FRETE:.*?\|\|\|/g, "").trim() || null;

      // ⚠️ WHITELIST: NUNCA expor markup/real_subtotal/real_discount ao cliente.
      // Cliente vê apenas o subtotal apresentado (já inflado) e o desconto aparente.
      const publicQuote = {
        id: quote.id,
        quote_number: quote.quote_number,
        client_id: quote.client_id,
        client_name: quote.client_name,
        client_email: quote.client_email,
        client_phone: quote.client_phone,
        client_company: quote.client_company,
        client_cnpj: quote.client_cnpj,
        status: quote.status,
        subtotal: quote.subtotal,                  // apresentado
        discount_percent: quote.discount_percent,  // aparente
        discount_amount: quote.discount_amount,
        total: quote.total,
        notes: quote.notes,
        payment_terms: quote.payment_terms,
        delivery_time: quote.delivery_time,
        valid_until: quote.valid_until,
        created_at: quote.created_at,
        updated_at: quote.updated_at,
        internal_notes: cleanNotes,
        shipping_type: shippingType,
        shipping_cost: shippingCost,
        items: enrichedItems,
        // ❌ EXCLUÍDOS: negotiation_markup_percent, real_subtotal, real_discount_percent,
        //              internal_notes raw, seller_id, bitrix_*, synced_*
      };

      return new Response(
        JSON.stringify({
          quote: publicQuote,
          seller: sellerProfile,
          token: {
            id: tokenData.id,
            client_name: tokenData.client_name,
            status: tokenData.status,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "respond" || action === "submit_response") {
      if (!token || !response) {
        return new Response(
          JSON.stringify({ error: "Token e resposta são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Approval requires e-signature (name + document)
      if (response === "approved") {
        const docDigits = (signer_document || "").replace(/\D/g, "");
        if (!signer_name || signer_name.trim().length < 3) {
          return new Response(
            JSON.stringify({ error: "Nome completo é obrigatório para assinar a aprovação." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (docDigits.length !== 11 && docDigits.length !== 14) {
          return new Response(
            JSON.stringify({ error: "CPF (11 dígitos) ou CNPJ (14 dígitos) válido é obrigatório." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Fetch token
      const { data: tokenData, error: tokenError } = await supabase
        .from("quote_approval_tokens")
        .select("*")
        .eq("token", token)
        .eq("status", "active")
        .single();

      if (tokenError || !tokenData) {
        return new Response(
          JSON.stringify({ error: "Token inválido" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (tokenData.responded_at) {
        return new Response(
          JSON.stringify({ error: "Já respondido anteriormente" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const nowIso = new Date().toISOString();
      const clientIp = getClientIpFromReq(req);
      const userAgent = req.headers.get("user-agent")?.slice(0, 500) || null;

      // Compute signature hash for integrity (only for approval)
      let signatureHash: string | null = null;
      const docDigits = (signer_document || "").replace(/\D/g, "");
      if (response === "approved") {
        signatureHash = await sha256Hex(
          [token, signer_name?.trim(), docDigits, nowIso, clientIp, tokenData.quote_id].join("|")
        );
      }

      // Update token with response + signature
      await supabase
        .from("quote_approval_tokens")
        .update({
          responded_at: nowIso,
          response,
          response_notes: response_notes || null,
          status: "responded",
          updated_at: nowIso,
          signer_name: response === "approved" ? signer_name?.trim() : null,
          signer_document: response === "approved" ? docDigits : null,
          signer_ip: clientIp,
          signer_user_agent: userAgent,
          signature_hash: signatureHash,
          signed_at: response === "approved" ? nowIso : null,
        })
        .eq("id", tokenData.id);

      // Update quote status in CRM
      await crmClient
        .from("quotes")
        .update({
          status: response,
          client_response: response,
          client_response_at: nowIso,
          client_response_notes: response_notes || null,
        })
        .eq("id", tokenData.quote_id);

      // Log history in CRM with signature evidence
      await crmClient.from("quote_history").insert({
        quote_id: tokenData.quote_id,
        user_id: tokenData.seller_id,
        action: `client_${response}`,
        description: `Cliente ${response === "approved" ? "aprovou" : "rejeitou"} o orçamento${response_notes ? `: ${response_notes}` : ""}`,
        metadata: {
          via: "public_link",
          client_name: tokenData.client_name,
          signer_name: response === "approved" ? signer_name?.trim() : null,
          signer_document: response === "approved" ? docDigits : null,
          signer_ip: clientIp,
          signer_user_agent: userAgent,
          signature_hash: signatureHash,
          signed_at: response === "approved" ? nowIso : null,
        },
      });

      // Create notification for seller
      try {
        await supabase.from("workspace_notifications").insert({
          user_id: tokenData.seller_id,
          title: response === "approved" ? "🎉 Orçamento aprovado!" : "❌ Orçamento rejeitado",
          message: `${signer_name?.trim() || tokenData.client_name || "Cliente"} ${response === "approved" ? "aprovou e assinou" : "rejeitou"} o orçamento.${response_notes ? ` Obs: ${response_notes}` : ""}`,
          type: response === "approved" ? "success" : "warning",
          category: "quotes",
          action_url: "/orcamentos",
        });
      } catch (_) {
        // Notification is optional — don't block the response flow
      }

      return new Response(
        JSON.stringify({
          success: true,
          response,
          signature: response === "approved" ? {
            signer_name: signer_name?.trim(),
            signer_document: docDigits,
            signed_at: nowIso,
            signature_hash: signatureHash,
            signer_ip: clientIp,
          } : null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

```

---

## 📦 `supabase/functions/quote-followup-reminders/index.ts`

**Secrets/env vars referenciadas:**

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`

**Imports `_shared/*`:**

- `import { buildPublicCorsHeaders } from "../_shared/cors.ts";`

**Código fonte completo:**

```typescript
/**
 * quote-followup-reminders
 * Cria notificações para vendedores cujos orçamentos enviados há ≥2 dias
 * ainda não foram visualizados pelo cliente. Idempotente por dia (não duplica).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { buildPublicCorsHeaders } from "../_shared/cors.ts";

const corsHeaders = buildPublicCorsHeaders();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    // 1) Orçamentos enviados há ≥2d
    const { data: quotes, error: qErr } = await supabase
      .from("quotes")
      .select("id, quote_number, client_name, seller_id, updated_at")
      .in("status", ["sent", "pending"])
      .lte("updated_at", twoDaysAgo)
      .limit(500);

    if (qErr) throw qErr;
    if (!quotes || quotes.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const quoteIds = quotes.map((q) => q.id);

    // 2) Filtra os que JÁ foram visualizados via tokens
    const { data: viewed } = await supabase
      .from("quote_approval_tokens")
      .select("quote_id")
      .in("quote_id", quoteIds)
      .not("viewed_at", "is", null);

    const viewedSet = new Set((viewed || []).map((v) => v.quote_id));
    const candidates = quotes.filter((q) => !viewedSet.has(q.id));

    // 3) Idempotência: ignora os que já têm reminder hoje
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: existing } = await supabase
      .from("follow_up_reminders")
      .select("quote_id")
      .in("quote_id", candidates.map((c) => c.id))
      .gte("created_at", todayStart.toISOString());
    const existingSet = new Set((existing || []).map((e) => e.quote_id));

    const toInsert = candidates
      .filter((c) => !existingSet.has(c.id) && c.seller_id)
      .map((c) => ({
        quote_id: c.id,
        seller_id: c.seller_id!,
        reminder_type: "no_view",
        scheduled_for: new Date().toISOString(),
        title: `Orçamento ${c.quote_number} sem visualização`,
        notes: `Cliente ${c.client_name || "—"} ainda não abriu o link. Considere enviar follow-up.`,
        is_sent: true,
        sent_at: new Date().toISOString(),
      }));

    let inserted = 0;
    if (toInsert.length > 0) {
      const { error: insErr, count } = await supabase
        .from("follow_up_reminders")
        .insert(toInsert, { count: "exact" });
      if (insErr) throw insErr;
      inserted = count ?? toInsert.length;
    }

    return new Response(
      JSON.stringify({ ok: true, scanned: quotes.length, candidates: candidates.length, inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

```

---

## 📦 `supabase/functions/kit-public-view/index.ts`

**Secrets/env vars referenciadas:**

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`

**Imports `_shared/*`:**

- `import { buildPublicCorsHeaders } from "../_shared/cors.ts";`
- `import { runBotProtection } from "../_shared/bot-protection.ts";`
- `import { z } from "../_shared/zod-validate.ts";`

**Código fonte completo:**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "../_shared/zod-validate.ts";
import { runBotProtection } from "../_shared/bot-protection.ts";
import { buildPublicCorsHeaders } from "../_shared/cors.ts";

const corsHeaders = buildPublicCorsHeaders();

const KitRequestSchema = z.object({
  action: z.enum(["get_kit"]),
  token: z.string().min(1, "Token é obrigatório").max(200),
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const protection = await runBotProtection(req, {
      endpoint: 'kit-public-view',
      maxRequests: 30,
      windowSeconds: 60,
      blockSeconds: 3600,
      allowSearchBots: false,
    }, corsHeaders);
    if (!protection.allowed) return protection.blockResponse!;

    let rawBody: Record<string, unknown> = {};
    if (req.method === "POST" || req.method === "PUT") {
      try {
        rawBody = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: "Corpo da requisição inválido. Envie um JSON com action e token." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      const url = new URL(req.url);
      const tokenParam = url.searchParams.get("token");
      if (tokenParam) {
        rawBody = { action: "get_kit", token: tokenParam };
      } else {
        return new Response(
          JSON.stringify({ error: "Use POST com JSON body ou GET com ?token=..." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const parsed = KitRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Parâmetros inválidos", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, token } = parsed.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const xff = req.headers.get("x-forwarded-for");
    const clientIp = xff ? xff.split(",")[0].trim() : (req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || "unknown");
    const clientUa = req.headers.get("user-agent") || null;

    if (action === "get_kit") {
      // Fetch token record
      const { data: tokenData, error: tokenError } = await supabase
        .from("kit_share_tokens")
        .select("*")
        .eq("token", token)
        .single();

      if (tokenError || !tokenData) {
        await supabase.rpc("record_public_token_failure", {
          _resource_type: "kit",
          _resource_id: null,
          _attempted_token: token.substring(0, 32),
          _ip: clientIp,
          _ua: clientUa,
          _reason: "token_not_found",
        });
        return new Response(
          JSON.stringify({ error: "Link inválido ou não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check status
      if (tokenData.status !== "active") {
        await supabase.rpc("record_public_token_failure", {
          _resource_type: "kit",
          _resource_id: tokenData.kit_id,
          _attempted_token: token.substring(0, 32),
          _ip: clientIp,
          _ua: clientUa,
          _reason: "token_revoked",
        });
        return new Response(
          JSON.stringify({ error: "Este link foi revogado" }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check expiry
      if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
        await supabase.rpc("record_public_token_failure", {
          _resource_type: "kit",
          _resource_id: tokenData.kit_id,
          _attempted_token: token.substring(0, 32),
          _ip: clientIp,
          _ua: clientUa,
          _reason: "token_expired",
        });
        return new Response(
          JSON.stringify({ error: "Este link expirou", expired: true }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark as viewed
      if (!tokenData.viewed_at) {
        await supabase
          .from("kit_share_tokens")
          .update({ viewed_at: new Date().toISOString() })
          .eq("id", tokenData.id);
      }

      // Fetch kit
      const { data: kit, error: kitError } = await supabase
        .from("custom_kits")
        .select("*")
        .eq("id", tokenData.kit_id)
        .single();

      if (kitError || !kit) {
        return new Response(
          JSON.stringify({ error: "Kit não encontrado" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch seller profile
      const { data: sellerProfile } = await supabase
        .from("profiles")
        .select("full_name, email, phone, avatar_url")
        .eq("user_id", tokenData.seller_id)
        .single();

      // Fetch organization branding
      const { data: orgMember } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", tokenData.seller_id)
        .limit(1)
        .maybeSingle();

      let organization = null;
      if (orgMember?.organization_id) {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("name, logo_url, description")
          .eq("id", orgMember.organization_id)
          .single();
        organization = orgData;
      }

      // Clean kit data: remove cost prices and SKUs for client view
      const cleanItems = (kit.items_data || []).map((item: any) => ({
        name: item.name,
        quantity: item.quantity,
        category: item.category || null,
        imageUrl: item.imageUrl || item.image_url || null,
        selectedColor: item.selectedColor || null,
        isOptional: item.isOptional || false,
      }));

      const cleanBox = kit.box_data ? {
        name: (kit.box_data as any).name,
        imageUrl: (kit.box_data as any).imageUrl || (kit.box_data as any).image_url || null,
        dimensions: (kit.box_data as any).dimensions || null,
      } : null;

      return new Response(
        JSON.stringify({
          kit: {
            name: kit.name,
            kit_type: kit.kit_type,
            kit_quantity: kit.kit_quantity,
            volume_usage_percent: kit.volume_usage_percent,
            box: cleanBox,
            items: cleanItems,
          },
          seller: sellerProfile,
          organization,
          token: {
            id: tokenData.id,
            client_name: tokenData.client_name,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Ação inválida" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

```

---

## 📦 `supabase/functions/kit-ai-builder/index.ts`

**Secrets/env vars referenciadas:**

- `LOVABLE_API_KEY`

**Imports `_shared/*`:**

- `import { getCorsHeaders } from "../_shared/cors.ts";`

**Código fonte completo:**

```typescript
import { getCorsHeaders } from "../_shared/cors.ts";
// ============================================================
// EDGE FUNCTION: kit-ai-builder
// Recebe um prompt natural e devolve uma sugestão estruturada de kit
// (box keywords, item keywords, kit_type, justificativa).
// Usa Lovable AI Gateway com tool-calling para JSON estrito.
// ============================================================

interface RequestBody {
  prompt?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const prompt = (body.prompt ?? '').trim();
    if (!prompt || prompt.length < 6 || prompt.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'prompt inválido (6–2000 chars)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Você é especialista em montagem de kits corporativos de brindes promocionais brasileiros.
Receba a descrição do cliente e devolva sugestões objetivas de:
- kit_type: "montado" (caixa premium), "original" (embalagem do fornecedor) ou "simples" (sem caixa especial).
- box_keywords: até 4 palavras-chave para busca da caixa (ex.: "premium", "kraft", "térmica").
- item_keywords: 3 a 6 categorias/produtos sugeridos (ex.: "garrafa térmica", "caderno", "caneta metal").
- target_price_brl: faixa de preço/kit estimada em reais (mínimo, máximo).
- narrative: 1 frase vendedora explicando o conceito.
Use português do Brasil. Seja conciso e prático.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_kit',
              description: 'Devolve sugestão estruturada de kit',
              parameters: {
                type: 'object',
                properties: {
                  kit_type: { type: 'string', enum: ['montado', 'original', 'simples'] },
                  box_keywords: { type: 'array', items: { type: 'string' }, maxItems: 4 },
                  item_keywords: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 6 },
                  target_price_brl: {
                    type: 'object',
                    properties: {
                      min: { type: 'number' },
                      max: { type: 'number' },
                    },
                    required: ['min', 'max'],
                  },
                  narrative: { type: 'string' },
                },
                required: ['kit_type', 'box_keywords', 'item_keywords', 'target_price_brl', 'narrative'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_kit' } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de uso temporariamente excedido. Tente novamente em alguns instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiRes.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA esgotados. Adicione créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errText = await aiRes.text();
      console.error('AI gateway error', aiRes.status, errText);
      return new Response(
        JSON.stringify({ error: 'Erro ao consultar IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (!argsStr) {
      return new Response(
        JSON.stringify({ error: 'Resposta vazia da IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const suggestion = JSON.parse(argsStr);

    return new Response(
      JSON.stringify({ suggestion }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('kit-ai-builder error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

```

---

## 📦 `supabase/functions/kit-identity-suggest/index.ts`

**Secrets/env vars referenciadas:**

- `LOVABLE_API_KEY`

**Imports `_shared/*`:**

- `import { getCorsHeaders } from "../_shared/cors.ts";`

**Código fonte completo:**

```typescript
import { getCorsHeaders } from "../_shared/cors.ts";
// ============================================================
// EDGE FUNCTION: kit-identity-suggest
// Recebe nome + lista de itens do kit e sugere identidade visual
// (tag curta + cor hex + ícone lucide). Usa Lovable AI Gateway
// com tool-calling para JSON estrito. Modelo barato e rápido.
// Hardening: Zod validation + bot protection (rate limit).
// ============================================================
import { z } from '../_shared/zod-validate.ts';
import { runBotProtection } from '../_shared/bot-protection.ts';

const PALETTE = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#0EA5E9',
];

const ICONS = [
  'Package', 'Gift', 'Briefcase', 'Coffee', 'Heart',
  'Sparkles', 'Trophy', 'Leaf', 'Star', 'Rocket',
  'Sun', 'Moon', 'Zap', 'Flame', 'Award',
];

const BodySchema = z.object({
  name: z.string().max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  items: z
    .array(
      z.object({
        name: z.string().max(200).optional(),
        sku: z.string().max(100).optional(),
      }),
    )
    .max(50)
    .optional(),
});

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: getCorsHeaders(req) });

  try {
    // Bot protection + rate limit (10 req / 60s, block 1h)
    const protection = await runBotProtection(req, {
      endpoint: 'kit-identity-suggest',
      maxRequests: 10,
      windowSeconds: 60,
      blockSeconds: 3600,
      allowSearchBots: false,
    }, getCorsHeaders(req));
    if (!protection.allowed) return protection.blockResponse!;

    const raw = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros inválidos', details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const name = (parsed.data.name ?? '').trim();
    const items = parsed.data.items ?? [];
    if (!name && items.length === 0) {
      return new Response(JSON.stringify({ error: 'Forneça name ou items' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY ausente' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const itemList = items.map((i) => i?.name).filter(Boolean).join(', ').slice(0, 800);

    const systemPrompt = `Você nomeia identidades visuais de kits corporativos brasileiros.
Devolva: tag curta (1-2 palavras CAPSLOCK), cor (HEX da paleta) e ícone (lucide).
Paleta cores: ${PALETTE.join(', ')}.
Ícones disponíveis: ${ICONS.join(', ')}.
Escolha o que melhor combina com o tema. Tag deve ser MARKETING, ex.: ONBOARDING, NATAL, VIP.`;

    const userPrompt = `Kit: "${name || 'sem nome'}"\nItens: ${itemList || 'nenhum'}\n${parsed.data.description ? `Descrição: ${parsed.data.description}` : ''}`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'suggest_identity',
            description: 'Devolve a identidade sugerida',
            parameters: {
              type: 'object',
              properties: {
                tag: { type: 'string', maxLength: 20 },
                color: { type: 'string', enum: PALETTE },
                icon: { type: 'string', enum: ICONS },
                rationale: { type: 'string', maxLength: 120 },
              },
              required: ['tag', 'color', 'icon'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'suggest_identity' } },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI ${aiRes.status}`, details: text.slice(0, 200) }), {
        status: aiRes.status === 429 ? 429 : 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = await aiRes.json();
    const call = json?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      return new Response(JSON.stringify({ error: 'Resposta IA inválida' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const out = JSON.parse(call.function.arguments);
    return new Response(JSON.stringify({ suggestion: out }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message ?? 'Erro' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

```

---

## 📁 `_shared/*` novos neste lote

_(Já entregues no Lote 1: `cors.ts`, `credentials.ts`, `zod-validate.ts`. Novo abaixo: `bot-protection.ts`.)_

### `supabase/functions/_shared/bot-protection.ts`

```typescript
// supabase/functions/_shared/bot-protection.ts
// Centralized anti-scraping/bot protection for public Edge Functions.
// Combines: (1) User-Agent blacklist, (2) DB-backed rate limit, (3) bot logging.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// Known scraper / automation User-Agents (case-insensitive substring match)
const BOT_UA_PATTERNS = [
  'curl/', 'wget/', 'python-requests', 'python-urllib', 'scrapy', 'httpie',
  'go-http-client', 'java/', 'okhttp', 'apache-httpclient',
  'phantomjs', 'headlesschrome', 'puppeteer', 'playwright',
  'libwww-perl', 'lwp::', 'mechanize', 'http_request2',
  'ahrefsbot', 'semrushbot', 'mj12bot', 'dotbot', 'rogerbot',
  'screaming frog', 'sitebulb', 'megaindex', 'serpstatbot',
  'node-fetch', 'axios/', 'got (', 'undici',
  // Generic suspicious markers
  'crawler', 'scraper', 'spider', 'bot/', '/bot',
];

// Allow-listed bots (search engines we want to allow for SEO)
const ALLOWED_BOT_PATTERNS = [
  'googlebot', 'bingbot', 'duckduckbot', 'yandexbot', 'baiduspider',
  'facebookexternalhit', 'twitterbot', 'linkedinbot', 'whatsapp', 'telegrambot',
  'slackbot', 'discordbot',
];

export interface BotCheckResult {
  isBot: boolean;
  isAllowedBot: boolean;
  reason?: string;
  matchedPattern?: string;
}

/** Detect bots by User-Agent string. */
export function detectBot(userAgent: string | null): BotCheckResult {
  if (!userAgent || userAgent.trim().length === 0) {
    return { isBot: true, isAllowedBot: false, reason: 'empty_user_agent' };
  }
  const ua = userAgent.toLowerCase();

  // Allow-listed first
  for (const pattern of ALLOWED_BOT_PATTERNS) {
    if (ua.includes(pattern)) {
      return { isBot: true, isAllowedBot: true, matchedPattern: pattern };
    }
  }

  // Blocked
  for (const pattern of BOT_UA_PATTERNS) {
    if (ua.includes(pattern)) {
      return { isBot: true, isAllowedBot: false, reason: 'ua_blacklist', matchedPattern: pattern };
    }
  }

  // Suspiciously short or generic UAs
  if (userAgent.length < 20) {
    return { isBot: true, isAllowedBot: false, reason: 'suspicious_short_ua', matchedPattern: userAgent };
  }

  return { isBot: false, isAllowedBot: false };
}

/** Extract the best-effort client IP from a request. */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip')
    || req.headers.get('x-real-ip')
    || 'unknown';
}

interface BotProtectionOptions {
  endpoint: string;
  maxRequests?: number;        // default 60
  windowSeconds?: number;      // default 60
  blockSeconds?: number;       // default 3600 (1h)
  allowSearchBots?: boolean;   // default true
  customIdentifier?: string;   // override IP-based identifier
}

export interface BotProtectionResult {
  allowed: boolean;
  blockResponse?: Response;
}

/**
 * Run all anti-scraping checks. Returns { allowed: false, blockResponse } if blocked.
 * Logs detection events to bot_detection_log.
 */
export async function runBotProtection(
  req: Request,
  opts: BotProtectionOptions,
  corsHeaders: Record<string, string>,
): Promise<BotProtectionResult> {
  const ip = getClientIp(req);
  const ua = req.headers.get('user-agent');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);

  const logBlock = async (reason: string, blocked: boolean, metadata: Record<string, unknown> = {}) => {
    try {
      await admin.from('bot_detection_log').insert({
        ip_address: ip,
        user_agent: ua,
        endpoint: opts.endpoint,
        detection_reason: reason,
        blocked,
        metadata,
      });
    } catch (err) {
      console.error('[bot-protection] Failed to log:', err);
    }
  };

  // 0. Manual allowlist/blocklist check (admin overrides)
  try {
    const { data: ipAccess } = await admin.rpc('check_ip_access', { _ip: ip });
    if (ipAccess === 'block') {
      await logBlock('manual_blocklist', true, { ip });
      return {
        allowed: false,
        blockResponse: new Response(
          JSON.stringify({ error: 'Forbidden', message: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        ),
      };
    }
    if (ipAccess === 'allow') {
      // Skip all subsequent checks for trusted IPs
      return { allowed: true };
    }
  } catch (err) {
    console.error('[bot-protection] IP access check failed:', err);
    // Fail open
  }

  // 1. Bot UA check
  const botCheck = detectBot(ua);
  const allowSearch = opts.allowSearchBots !== false;

  if (botCheck.isBot && !(allowSearch && botCheck.isAllowedBot)) {
    await logBlock(botCheck.reason || 'bot_detected', true, { matched: botCheck.matchedPattern });
    return {
      allowed: false,
      blockResponse: new Response(
        JSON.stringify({ error: 'Forbidden', message: 'Automated access not allowed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      ),
    };
  }

  // 2. Persistent rate limit via DB function
  const identifier = opts.customIdentifier || ip;
  const { data, error } = await admin.rpc('check_rate_limit', {
    _identifier: identifier,
    _endpoint: opts.endpoint,
    _max_requests: opts.maxRequests ?? 60,
    _window_seconds: opts.windowSeconds ?? 60,
    _block_duration_seconds: opts.blockSeconds ?? 3600,
  });

  if (error) {
    console.error('[bot-protection] Rate limit RPC error:', error);
    // Fail open to avoid breaking service on DB hiccup
    return { allowed: true };
  }

  const result = data as { allowed: boolean; reason?: string; retry_after_seconds?: number; remaining?: number };
  if (!result?.allowed) {
    await logBlock(result?.reason || 'rate_exceeded', true, { result });
    const retryAfter = result?.retry_after_seconds ?? 60;
    return {
      allowed: false,
      blockResponse: new Response(
        JSON.stringify({
          error: 'Too Many Requests',
          message: 'Limite de requisições excedido. Tente novamente mais tarde.',
          retry_after_seconds: retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
          },
        },
      ),
    };
  }

  return { allowed: true };
}

```

---

## Próximo lote sugerido

**Lote 3 — MCP/Segurança:** `mcp-server`, `mcp-keys-issue`, `mcp-keys-rotate`, `mcp-keys-revoke`, `mcp-keys-update`.
