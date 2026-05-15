# Bloco 12 — Edge Functions (Lote 5 / Webhook In / Magic Up Ads)

> Lote 5 do bloco 12.
>
> Lotes anteriores: `block12_edge_functions_batch1.md`, `block12_edge_functions_batch2.md`, `block12_edge_functions_batch3.md`, `block12_edge_functions_batch4.md`.

---

## ✅ Funções incluídas neste lote

| # | Função | Linhas | verify_jwt |
|---|---|---:|---|
| 1 | `webhook-inbound` | 108 | **system default** (false) |
| 2 | `magic-up-score` | 120 | **system default** (false) |
| 3 | `generate-ad-prompt` | 208 | **system default** (false) |
| 4 | `generate-ad-image` | 271 | **system default** (false) |

### 🔐 Confirmação de `verify_jwt`

`supabase/config.toml` não contém bloco `[functions.<nome>]` para nenhuma destas funções → todas rodam com **default Lovable Cloud (`verify_jwt = false`)** e validam auth/JWT/HMAC **in-code**.

### 🔑 Inventário de secrets/env

| Secret | webhook-inbound | magic-up-score | generate-ad-prompt | generate-ad-image |
|---|:---:|:---:|:---:|:---:|
| `LOVABLE_API_KEY` | — | ✅ | ✅ | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | — | — | — |
| `SUPABASE_URL` | ✅ | — | — | — |

### 📦 Imports compartilhados (`_shared/`)

| Arquivo | Usado por |
|---|---|
| `_shared/ai-usage.ts` | magic-up-score, generate-ad-prompt, generate-ad-image |
| `_shared/auth.ts` | magic-up-score, generate-ad-prompt, generate-ad-image |
| `_shared/bot-protection.ts` | magic-up-score, generate-ad-prompt, generate-ad-image |
| `_shared/cors.ts` | webhook-inbound, magic-up-score, generate-ad-prompt, generate-ad-image |
| `_shared/zod-validate.ts` | generate-ad-prompt |

---

## `webhook-inbound`

**Path:** `supabase/functions/webhook-inbound/index.ts` (108 linhas)

**verify_jwt:** `false` (system default — validação in-code)

**Source completa:**

```typescript
// webhook-inbound: receives external webhooks at /webhook-inbound?slug=<slug>
// Validates HMAC signature using the secret stored in env (referenced by the
// endpoint row), records every event in inbound_webhook_events.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";
import { buildPublicCorsHeaders } from "../_shared/cors.ts";

const corsHeaders = buildPublicCorsHeaders({ extraAllowHeaders: ["x-signature-256","x-event"], allowMethods: "POST, OPTIONS" });

async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug")
      || url.pathname.split("/").filter(Boolean).pop()
      || "";
    if (!slug) {
      return new Response(JSON.stringify({ error: "slug ausente" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    const signatureHeader = req.headers.get("x-signature-256")
      || req.headers.get("x-webhook-signature")
      || "";
    const eventType = req.headers.get("x-event") || "unknown";
    const sourceIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

    const secret = Deno.env.get(endpoint.hmac_secret_ref);
    let signatureValid = false;
    if (secret) {
      const expected = "sha256=" + await hmacSign(rawBody, secret);
      const provided = signatureHeader.startsWith("sha256=") ? signatureHeader : "sha256=" + signatureHeader;
      signatureValid = timingSafeEqual(expected, provided);
    }

    let parsedPayload: unknown = null;
    try { parsedPayload = JSON.parse(rawBody); } catch { /* keep null */ }

    await supabase.from("inbound_webhook_events").insert({
      endpoint_id: endpoint.id,
      event_type: eventType,
      payload: parsedPayload,
      signature_valid: signatureValid,
      processed: signatureValid,
      source_ip: sourceIp,
      error: signatureValid ? null : "HMAC inválido ou ausente",
    });

    await supabase.from("inbound_webhook_endpoints").update({
      last_received_at: new Date().toISOString(),
      total_received: (endpoint.total_received ?? 0) + 1,
      total_invalid: (endpoint.total_invalid ?? 0) + (signatureValid ? 0 : 1),
    }).eq("id", endpoint.id);

    if (!signatureValid) {
      return new Response(JSON.stringify({ error: "Assinatura inválida" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

```

---

## `magic-up-score`

**Path:** `supabase/functions/magic-up-score/index.ts` (120 linhas)

**verify_jwt:** `false` (system default — validação in-code)

**Source completa:**

```typescript
import { getCorsHeaders } from '../_shared/cors.ts';
import { authenticateRequest, authErrorResponse } from '../_shared/auth.ts';
import { callAiWithTracking, QuotaExceededError } from '../_shared/ai-usage.ts';
import { runBotProtection } from '../_shared/bot-protection.ts';
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const CriterionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  score: z.number().min(0).max(100),
  passed: z.boolean(),
  weight: z.number().min(1).max(5),
  recommendation: z.string().min(1),
});

const BodySchema = z.object({
  imageUrl: z.string().min(10),
  productName: z.string().optional().nullable(),
  clientName: z.string().optional().nullable(),
  campaignBrief: z.record(z.unknown()).optional().nullable(),
  brandKit: z.record(z.unknown()).optional().nullable(),
  creativeControls: z.record(z.unknown()).optional().nullable(),
  promptText: z.string().optional().nullable(),
  channel: z.string().optional().nullable(),
  aspectRatio: z.string().optional().nullable(),
});

const DiagnosisSchema = z.object({
  total: z.number().min(0).max(100),
  label: z.string().min(1),
  summary: z.string().min(1),
  criteria: z.array(CriterionSchema).min(4).max(10),
  strengths: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([]),
});

function safeJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('AI response did not contain JSON');
  return JSON.parse(cleaned.slice(start, end + 1));
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const auth = await authenticateRequest(req);
    const protection = await runBotProtection(req, {
      endpoint: 'magic-up-score',
      maxRequests: 20,
      windowSeconds: 60,
      blockSeconds: 900,
      customIdentifier: `user:${auth.userId}`,
    }, corsHeaders);
    if (!protection.allowed) return protection.blockResponse!;

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    const model = 'google/gemini-2.5-pro';
    const context = JSON.stringify({
      productName: parsed.data.productName,
      clientName: parsed.data.clientName,
      campaignBrief: parsed.data.campaignBrief,
      brandKit: parsed.data.brandKit,
      creativeControls: parsed.data.creativeControls,
      promptText: parsed.data.promptText,
      channel: parsed.data.channel,
      aspectRatio: parsed.data.aspectRatio,
    }, null, 2);

    const response = await callAiWithTracking({
      userId: auth.userId,
      functionName: 'magic-up-score',
      model,
      apiKey: LOVABLE_API_KEY,
      requestBody: {
        model,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: `Avalie esta peça publicitária B2B para brindes personalizados. Retorne somente JSON válido com total, label, summary, criteria, strengths, risks e recommendations. Critérios obrigatórios: clareza do produto, visibilidade do logo, adequação ao canal, coerência com marca, qualidade visual, potencial comercial, realismo e espaço para copy/CTA. Contexto:\n${context}` },
            { type: 'image_url', image_url: { url: parsed.data.imageUrl } },
          ],
        }],
      },
    });

    if (!response.ok) {
      const message = response.status === 429 ? 'Limite de IA excedido para análise de score.' : response.status === 402 ? 'Créditos de IA esgotados para análise de score.' : 'Falha na análise de score.';
      return new Response(JSON.stringify({ error: message }), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('AI response missing content');
    const diagnosis = DiagnosisSchema.parse(safeJson(content));

    return new Response(JSON.stringify({ ...diagnosis, source: 'ai' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    if (error instanceof QuotaExceededError) {
      return new Response(JSON.stringify({ error: 'Limite mensal de IA atingido.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const authStatus = (error as { status?: number })?.status;
    if (authStatus === 401 || authStatus === 403) return authErrorResponse(error, corsHeaders);
    console.error('[magic-up-score] Error:', error);
    const message = error instanceof Error ? error.message : 'Erro ao analisar Magic Score';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

```

---

## `generate-ad-prompt`

**Path:** `supabase/functions/generate-ad-prompt/index.ts` (208 linhas)

**verify_jwt:** `false` (system default — validação in-code)

**Source completa:**

```typescript
import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { authenticateRequest, authErrorResponse } from '../_shared/auth.ts';
import { callAiWithTracking, QuotaExceededError } from '../_shared/ai-usage.ts';
import { z } from '../_shared/zod-validate.ts';
import { runBotProtection } from '../_shared/bot-protection.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    const user = { id: auth.userId };

    const protection = await runBotProtection(req, {
      endpoint: 'generate-ad-prompt',
      maxRequests: 30,
      windowSeconds: 60,
      blockSeconds: 1800,
      customIdentifier: `user:${user.id}`,
    }, corsHeaders);
    if (!protection.allowed) return protection.blockResponse!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const AdPromptSchema = z.object({
      productName: z.string().trim().min(1, 'Product name is required').max(255),
      productColor: z.string().max(100).optional(),
      productCategory: z.string().max(100).optional(),
      techniqueName: z.string().max(100).optional(),
      locationName: z.string().max(100).optional(),
      maxWidth: z.union([z.string(), z.number()]).optional(),
      maxHeight: z.union([z.string(), z.number()]).optional(),
      dimensionUnit: z.string().max(10).optional(),
      isCurved: z.boolean().optional(),
      clientSegment: z.string().max(200).optional(),
      clientName: z.string().max(200).optional(),
      brandColorName: z.string().max(100).optional(),
      objective: z.string().max(500).optional(),
      tone: z.string().max(100).optional(),
      targetAudience: z.string().max(200).optional(),
      season: z.string().max(100).optional(),
      numberOfPrompts: z.number().int().min(1).max(6).optional(),
    });

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = AdPromptSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      productName, productColor, productCategory, techniqueName, locationName,
      maxWidth, maxHeight, dimensionUnit, isCurved, clientSegment, clientName,
      brandColorName, objective, tone, targetAudience, season, numberOfPrompts,
    } = parsed.data;

    const numPrompts = Math.min(numberOfPrompts || 4, 6);

    const customizationParts: string[] = [];
    if (techniqueName) customizationParts.push(`Technique: ${techniqueName}`);
    if (locationName) customizationParts.push(`Location: ${locationName}`);
    if (maxWidth && maxHeight) customizationParts.push(`Max print area: ${maxWidth}×${maxHeight}${dimensionUnit || 'cm'}`);
    if (isCurved) customizationParts.push(`Surface type: curved/cylindrical`);
    const customizationDetail = customizationParts.length > 0 ? customizationParts.join(' | ') : 'standard printing on front';

    const systemPrompt = `You are a world-class advertising creative director specialized in promotional product photography. 

Your expertise:
- You've directed campaigns for brands like Nike, Apple, Starbucks, and Coca-Cola
- You understand how promotional products (mugs, pens, t-shirts, bags, bottles, caps, notebooks, tech accessories) are used in real-world marketing scenarios
- You create scene descriptions that result in stunning, magazine-worthy commercial photographs
- You know how to make branded products look premium and desirable

RULES:
1. Each prompt must describe a COMPLETE photographic scene with specific details about lighting, environment, mood, and composition
2. Write prompts in English (they will be sent to an image AI model)
3. Each prompt should be 2-3 sentences, detailed but focused
4. The product must ALWAYS be the hero/focal point of the scene
5. Include specific photography terms: lighting setup, depth of field, color palette, composition style
6. Vary the scenes significantly — different environments, times of day, moods, and compositions
7. Consider the product type and how it's naturally used
8. If a client segment is provided, tailor scenes to that industry
9. Never use generic descriptions — be specific and evocative
10. Think about what would make someone STOP scrolling on Instagram
11. CRITICAL: The customization details (technique, location, dimensions) are REAL specifications from the factory database. Your prompts MUST accurately describe the logo placement matching these specs. If the surface is curved, ensure the scene angle shows the curved print area clearly.

RESPOND ONLY with a valid JSON array. No markdown, no explanation. Example:
[
  {
    "title": "Short scene title in Portuguese (3-5 words)",
    "prompt": "Detailed scene description in English...",
    "category": "lifestyle|corporativo|outdoor|esporte|gastronomia|varejo|evento|educacao",
    "mood": "One-word mood descriptor",
    "bestFor": "Brief note in Portuguese about when to use this prompt (1 sentence)"
  }
]`;

    const userMessage = `Generate ${numPrompts} UNIQUE advertising scene prompts for this product:

PRODUCT: ${productName}${productColor ? ` (color: ${productColor})` : ''}${productCategory ? `\nPRODUCT CATEGORY: ${productCategory}` : ''}
CUSTOMIZATION SPECS: ${customizationDetail}
${clientName ? `CLIENT: ${clientName}` : ''}
${clientSegment ? `CLIENT INDUSTRY: ${clientSegment}` : ''}
${brandColorName ? `BRAND COLOR: ${brandColorName}` : ''}
${objective ? `CAMPAIGN OBJECTIVE: ${objective}` : ''}
${tone ? `DESIRED TONE: ${tone}` : ''}
${targetAudience ? `TARGET AUDIENCE: ${targetAudience}` : ''}
${season ? `SEASON/OCCASION: ${season}` : ''}

Create ${numPrompts} distinct scene concepts that:
- Show the product in different, compelling real-world contexts
- Range from aspirational to relatable scenarios
- Would each produce a visually stunning commercial photograph
- Consider the specific product type, its materials, and how people actually use it
- The logo/branding MUST be shown applied via ${techniqueName || 'printing'} on the ${locationName || 'front'}${maxWidth && maxHeight ? `, within a ${maxWidth}×${maxHeight}${dimensionUnit || 'cm'} area` : ''}
- If the surface is curved, ensure camera angles show the curved print area prominently
- If a client industry is given, include at least 2 scenes relevant to that industry`;

    console.log("[ad-prompt] Generating prompts for:", productName);

    const model = "google/gemini-3-flash-preview";

    const response = await callAiWithTracking({
      userId: user.id,
      functionName: "generate-ad-prompt",
      model,
      apiKey: LOVABLE_API_KEY,
      requestBody: {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ad-prompt] AI error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let prompts;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      prompts = JSON.parse(cleaned);
    } catch {
      console.error("[ad-prompt] Failed to parse:", content.slice(0, 500));
      throw new Error("Falha ao processar resposta da IA");
    }

    if (!Array.isArray(prompts) || prompts.length === 0) {
      throw new Error("Nenhum prompt gerado");
    }

    console.log(`[ad-prompt] Generated ${prompts.length} prompts successfully`);

    return new Response(
      JSON.stringify({ prompts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    if (error instanceof QuotaExceededError) {
      return new Response(
        JSON.stringify({ error: "Limite mensal de IA atingido. Contate o administrador." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if ((error as any)?.status === 401 || (error as any)?.status === 403) {
      return authErrorResponse(error, corsHeaders);
    }
    console.error("[ad-prompt] Error:", error);
    const message = error instanceof Error ? error.message : "Falha ao gerar prompts";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

```

---

## `generate-ad-image`

**Path:** `supabase/functions/generate-ad-image/index.ts` (271 linhas)

**verify_jwt:** `false` (system default — validação in-code)

**Source completa:**

```typescript
import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { authenticateRequest, authErrorResponse } from '../_shared/auth.ts';
import { callAiWithTracking, QuotaExceededError } from '../_shared/ai-usage.ts';
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { runBotProtection } from '../_shared/bot-protection.ts';

const BodySchema = z.object({
  productImageUrl: z.string().url(),
  logoBase64: z.string().optional(),
  logoUrl: z.string().url().optional(),
  productName: z.string().optional(),
  productColor: z.string().optional(),
  techniqueName: z.string().optional(),
  locationName: z.string().optional(),
  scenePrompt: z.string().min(1, "Scene prompt is required"),
  sceneCategory: z.string().optional(),
  brandColorHex: z.string().optional(),
  brandColorName: z.string().optional(),
  campaignBrief: z.record(z.unknown()).optional(),
  outputChannel: z.string().optional(),
  aspectRatio: z.string().optional(),
  qualityMode: z.string().optional(),
  compositionMode: z.string().optional(),
  creativeMode: z.string().optional(),
  negativePrompt: z.array(z.string()).optional(),
  brandKit: z.object({
    primaryColor: z.string().nullable().optional(),
    secondaryColor: z.string().nullable().optional(),
    toneOfVoice: z.string().optional(),
    visualStyle: z.string().optional(),
    requiredWords: z.array(z.string()).optional(),
    forbiddenWords: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }).optional(),
  refinementInstruction: z.string().nullable().optional(),
  batchVariant: z.record(z.unknown()).nullable().optional(),
}).refine(data => data.logoBase64 || data.logoUrl, {
  message: "Either logoBase64 or logoUrl must be provided",
});

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    const user = { id: auth.userId };

    // Anti-scraping/abuse protection (image generation is expensive)
    const protection = await runBotProtection(req, {
      endpoint: 'generate-ad-image',
      maxRequests: 10,
      windowSeconds: 60,
      blockSeconds: 3600,
      customIdentifier: `user:${user.id}`,
    }, corsHeaders);
    if (!protection.allowed) return protection.blockResponse!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      productImageUrl, logoBase64, logoUrl, productName, productColor,
      techniqueName, locationName, scenePrompt, sceneCategory,
      brandColorHex, brandColorName, campaignBrief, outputChannel,
      aspectRatio, qualityMode, compositionMode, creativeMode, negativePrompt,
      brandKit, refinementInstruction, batchVariant,
    } = parsed.data;

    const logoImageSrc = logoBase64 || logoUrl!;

    console.log(`[ad-image] Product: ${productName} (${productColor})`);
    console.log(`[ad-image] Technique: ${techniqueName} @ ${locationName}`);
    console.log(`[ad-image] Scene category: ${sceneCategory}`);

    // ─── Smart Product Type Detection ─────────────────────────────
    const nameLower = (productName || "").toLowerCase();

    type ProductHint = { type: string; material: string; angle: string; logoTip: string };

    const PRODUCT_HINTS: { keywords: string[]; hint: ProductHint }[] = [
      { keywords: ["caneca", "mug", "xícara", "copo térmico", "copo"],
        hint: { type: "drinkware", material: "ceramic/porcelain surface with subtle reflections and gloss", angle: "slight 3/4 angle to show the printed area clearly, handle visible", logoTip: "Logo wraps naturally around the curved cylindrical surface" } },
      { keywords: ["camiseta", "camisa", "t-shirt", "blusa", "polo"],
        hint: { type: "apparel", material: "soft fabric with realistic textile folds and weave texture", angle: "front-facing, worn on a person or on a mannequin/flatlay", logoTip: "Logo appears as screen-printed or embroidered on the fabric, following the cloth's natural folds" } },
      { keywords: ["mochila", "bolsa", "bag", "sacola", "necessaire", "pochete", "pasta"],
        hint: { type: "bag", material: "durable nylon/polyester or leather with realistic stitching and zippers", angle: "front or slight 3/4 to show the main panel where the logo is", logoTip: "Logo applied via heat transfer or embroidery on the bag's main face" } },
      { keywords: ["caderno", "agenda", "bloco", "moleskine", "notebook"],
        hint: { type: "notebook", material: "smooth cover material (leatherette, paper, or hardcover) with edge details", angle: "flatlay or slight tilt showing the cover, spine visible", logoTip: "Logo debossed, foil-stamped, or printed on the cover surface" } },
      { keywords: ["caneta", "pen", "lápis", "lapiseira"],
        hint: { type: "pen", material: "metal or plastic barrel with realistic sheen and clip detail", angle: "macro close-up or angled on a desk surface to show the print area", logoTip: "Logo laser-engraved or pad-printed on the narrow barrel" } },
      { keywords: ["garrafa", "squeeze", "tumbler", "garrafinha", "térmica"],
        hint: { type: "bottle", material: "stainless steel or BPA-free plastic with reflective metallic or matte finish", angle: "upright 3/4 angle showing the label/print area and cap", logoTip: "Logo laser-engraved or silk-screened on the cylindrical body" } },
      { keywords: ["boné", "chapéu", "cap", "viseira", "bucket"],
        hint: { type: "headwear", material: "structured fabric with realistic stitching, eyelets, and brim", angle: "3/4 front showing the panel where the logo is embroidered", logoTip: "Logo embroidered with visible thread texture on the front panel" } },
      { keywords: ["guarda-chuva", "sombrinha", "umbrella"],
        hint: { type: "umbrella", material: "nylon fabric canopy with metal frame details", angle: "open position angled to show the printed panel", logoTip: "Logo screen-printed on one or more canopy panels" } },
      { keywords: ["power bank", "carregador", "charger", "cabo", "fone", "earphone", "caixa de som", "speaker"],
        hint: { type: "tech", material: "sleek plastic or aluminum housing with precise edges and LED indicators", angle: "product hero shot on a clean surface, slightly elevated angle", logoTip: "Logo pad-printed or laser-engraved on the flat surface" } },
      { keywords: ["kit", "combo", "conjunto", "set"],
        hint: { type: "kit", material: "multiple items arranged in an elegant gift-box composition", angle: "flatlay or 3/4 elevated angle showing all items in the kit", logoTip: "Logo visible on the main item and/or on the packaging" } },
      { keywords: ["toalha", "towel", "roupão"],
        hint: { type: "textile", material: "soft terry cloth or microfiber with visible texture and nap", angle: "folded arrangement or draped to show the embroidered area", logoTip: "Logo embroidered with satin stitch on the fabric" } },
    ];

    let productHint: ProductHint | null = null;
    for (const { keywords, hint } of PRODUCT_HINTS) {
      if (keywords.some(kw => nameLower.includes(kw))) {
        productHint = hint;
        break;
      }
    }

    const materialInstruction = productHint
      ? `\nPRODUCT TYPE DETECTED: ${productHint.type}
MATERIAL RENDERING: ${productHint.material}
RECOMMENDED ANGLE: ${productHint.angle}
LOGO APPLICATION: ${productHint.logoTip}`
      : '';

    console.log(`[ad-image] Product type: ${productHint?.type || 'generic'}`);

    const brandColorInstruction = brandColorHex
      ? `\nBRAND COLORS: The client brand uses ${brandColorName || brandColorHex} (${brandColorHex}). Subtly incorporate this color in the scene elements (props, background accents, clothing details) for brand harmony.`
      : '';

    const brandKitInstruction = brandKit
      ? `\nBRAND KIT:\n- Primary color: ${brandKit.primaryColor || brandColorHex || 'not provided'}\n- Secondary color: ${brandKit.secondaryColor || 'not provided'}\n- Tone of voice: ${brandKit.toneOfVoice || 'premium consultative'}\n- Visual style: ${brandKit.visualStyle || 'clean corporate'}\n- Required words/concepts: ${(brandKit.requiredWords || []).join(', ') || 'none'}\n- Forbidden words/concepts: ${(brandKit.forbiddenWords || []).join(', ') || 'none'}\n- Internal notes: ${brandKit.notes || 'none'}`
      : '\nBRAND KIT: Use the provided logo and keep a consistent, professional B2B brand expression.';

    const refinementBlock = refinementInstruction
      ? `\nREFINEMENT INSTRUCTION: ${refinementInstruction}`
      : '\nREFINEMENT INSTRUCTION: none';

    const batchBlock = batchVariant
      ? `\nBATCH VARIANT: ${JSON.stringify(batchVariant)}`
      : '';

    const strategyInstruction = `
CAMPAIGN BRIEF:
${campaignBrief ? JSON.stringify(campaignBrief, null, 2) : 'general B2B promotional sales campaign'}
${brandKitInstruction}
PRODUCT DIRECTION:
Product must stay faithful to the reference image, color, material, and personalization area.
CREATIVE MODE: ${creativeMode || 'product hero'}
COMPOSITION: ${compositionMode || 'clean centered product hero'}
FORMAT: ${aspectRatio || '1:1'} for ${outputChannel || 'whatsapp'}
QUALITY MODE: ${qualityMode || 'pro-final'}
NEGATIVE PROMPT: ${(negativePrompt || ['text inside image', 'distorted logo', 'busy background']).join(', ')}
${refinementBlock}${batchBlock}`;

    const prompt = `Create a HIGH-QUALITY commercial advertising photograph for a promotional product company.

PRODUCT: ${productName}${productColor ? ` in ${productColor} color` : ''}
CUSTOMIZATION: The product has the company logo applied via ${techniqueName || 'printing'} on the ${locationName || 'front'}.
${materialInstruction}
SCENE: ${scenePrompt}
${brandColorInstruction}
${strategyInstruction}

CRITICAL REQUIREMENTS:
1. The product shown in the reference image MUST appear prominently in the scene, clearly visible
2. The company logo from the second image MUST be visible on the product, applied realistically via ${techniqueName || 'printing'}
3. The logo should look naturally integrated into the product surface (not floating or pasted on)${productHint ? `\n4. Render the product with accurate ${productHint.material}` : ''}
${productHint ? `5` : `4`}. The overall image should look like a professional advertising campaign photo
${productHint ? `6` : `5`}. High resolution, perfect lighting, commercial photography quality
${productHint ? `7` : `6`}. The product should be the HERO of the image — the focal point
${productHint ? `8` : `7`}. People, environments, and props should complement but not overshadow the product
${productHint ? `9` : `8`}. Colors should be vibrant and appealing, suitable for marketing materials

Style: Professional commercial photography, advertising campaign quality, magazine-worthy.`;

    console.log("[ad-image] Sending request to AI Gateway...");

    const model = "google/gemini-3-pro-image-preview";

    const response = await callAiWithTracking({
      userId: user.id,
      functionName: "generate-ad-image",
      model,
      apiKey: LOVABLE_API_KEY,
      requestBody: {
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: productImageUrl } },
              { type: "image_url", image_url: { url: logoImageSrc } },
            ],
          },
        ],
        modalities: ["image", "text"],
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ad-image] AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione mais créditos." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImage) {
      console.error("[ad-image] No image in response:", JSON.stringify(data).slice(0, 500));
      throw new Error("Nenhuma imagem gerada na resposta");
    }

    console.log("[ad-image] Ad image generated successfully");

    return new Response(
      JSON.stringify({
        imageUrl: generatedImage,
        message: data.choices?.[0]?.message?.content || "Imagem publicitária gerada com sucesso",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    if (error instanceof QuotaExceededError) {
      return new Response(
        JSON.stringify({ error: "Limite mensal de IA atingido. Contate o administrador." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if ((error as any)?.status === 401 || (error as any)?.status === 403) {
      return authErrorResponse(error, corsHeaders);
    }
    console.error("[ad-image] Error:", error);
    const message = error instanceof Error ? error.message : "Falha ao gerar imagem publicitária";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

