# Bloco 12 — Edge Functions (Lote 4 / AI Chat / Mockup / Voice / BI / Webhook Out)

> Lote 4 do bloco 12.
>
> Lotes anteriores: `block12_edge_functions_batch1.md`, `block12_edge_functions_batch2.md`, `block12_edge_functions_batch3.md`.

---

## ✅ Funções incluídas neste lote

| # | Função | Linhas | verify_jwt |
|---|---|---:|---|
| 1 | `expert-chat` | 1302 | **system default** (false) |
| 2 | `generate-mockup` | 294 | **system default** (false) |
| 3 | `voice-agent` | 121 | **system default** (false) |
| 4 | `bi-copilot` | 112 | **system default** (false) |
| 5 | `webhook-dispatcher` | 256 | **system default** (false) |

### 🔐 Confirmação de `verify_jwt`

`supabase/config.toml` não contém bloco `[functions.<nome>]` para nenhuma destas funções → todas rodam com **default Lovable Cloud (`verify_jwt = false`)** e validam auth/JWT/HMAC **in-code**.

### 🔑 Inventário de secrets/env

| Secret | expert-chat | generate-mockup | voice-agent | bi-copilot | webhook-dispatcher |
|---|:---:|:---:|:---:|:---:|:---:|
| `EXTERNAL_SUPABASE_SERVICE_KEY` | ✅ | — | — | — | — |
| `EXTERNAL_SUPABASE_URL` | ✅ | — | — | — | — |
| `LOVABLE_API_KEY` | ✅ | ✅ | ✅ | ✅ | — |
| `SUPABASE_SERVICE_ROLE_KEY` | — | ✅ | — | — | ✅ |
| `SUPABASE_URL` | — | ✅ | — | — | ✅ |

### 📦 Imports compartilhados (`_shared/`)

| Arquivo | Usado por |
|---|---|
| `_shared/ai-usage.ts` | expert-chat, generate-mockup, voice-agent |
| `_shared/auth.ts` | expert-chat, generate-mockup, voice-agent |
| `_shared/bot-protection.ts` | expert-chat, generate-mockup, voice-agent |
| `_shared/cors.ts` | expert-chat, generate-mockup, voice-agent, bi-copilot, webhook-dispatcher |
| `_shared/credentials.ts` | expert-chat |
| `_shared/json-parser.ts` | expert-chat, generate-mockup |
| `_shared/rate-limiter.ts` | expert-chat |

---

## `expert-chat`

**Path:** `supabase/functions/expert-chat/index.ts` (1302 linhas)

**verify_jwt:** `false` (system default — validação in-code)

**Source completa:**

```typescript
import { buildPublicCorsHeaders, getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { authenticateRequest, authErrorResponse } from '../_shared/auth.ts';
import { z } from "npm:zod@3.23.8";
import { callAiWithTracking, QuotaExceededError } from '../_shared/ai-usage.ts';
import { rateLimiters, applyRateLimit } from '../_shared/rate-limiter.ts';
import { runBotProtection } from '../_shared/bot-protection.ts';
import { resolveCredential } from '../_shared/credentials.ts';
import { extractAndParseAIJSON, safeJson } from '../_shared/json-parser.ts';

// ============================================
// SCHEMAS
// ============================================

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(10000),
});

const TextFilterSchema = z.union([
  z.string().min(1).max(200),
  z.array(z.string().min(1).max(200)).max(25),
]).optional().nullable();

const ExpertChatBodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(50),
  clientId: z.string().uuid().optional().nullable(),
  categoryFilter: TextFilterSchema,
  priceMin: z.number().nonnegative().optional().nullable(),
  priceMax: z.number().nonnegative().optional().nullable(),
  materialFilter: TextFilterSchema,
  colorFilter: TextFilterSchema,
  genderFilter: TextFilterSchema,
  supplierFilter: TextFilterSchema,
  techniqueFilter: TextFilterSchema,
  publicoFilter: TextFilterSchema,
  dataComemorativaFilter: TextFilterSchema,
  endomarketingFilter: TextFilterSchema,
  nichoFilter: TextFilterSchema,
  tagFilter: TextFilterSchema,
  onlyInStock: z.boolean().optional().nullable(),
  onlyNew: z.boolean().optional().nullable(),
  onlyKit: z.boolean().optional().nullable(),
  onlyBestseller: z.boolean().optional().nullable(),
  onlyFeatured: z.boolean().optional().nullable(),
  hasPersonalization: z.boolean().optional().nullable(),
});

// ============================================
// TYPES
// ============================================

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ClientData {
  id: string;
  name: string;
  razao_social: string;
  nome_fantasia?: string | null;
  ramo_atividade?: string | null;
  cnpj?: string | null;
  logo_url?: string | null;
  cidade?: string | null;
  estado?: string | null;
  website?: string | null;
  instagram?: string | null;
}

interface CustomerData {
  cliente_ativado?: boolean;
  data_primeira_compra?: string | null;
  data_ultima_compra?: string | null;
  total_pedidos?: number;
  valor_total_compras?: number;
  ticket_medio?: number | null;
  poder_compra?: string | null;
  perfil_preco?: string | null;
  vendedor_nome?: string | null;
  sobre?: string | null;
  observacoes?: string | null;
}

interface OrderData {
  id: string;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  client_name?: string;
  fulfillment_status?: string;
}

interface SemanticExpansion {
  searchTerms: string[];
  categories: string[];
  materials: string[];
  useCases: string[];
  synonyms: string[];
  intent: "product_search" | "client_analysis" | "proposal" | "followup" | "general";
}

// ============================================
// SEMANTIC QUERY EXPANSION (AI-POWERED)
// ============================================

async function expandQuerySemantically(
  userMessage: string,
  apiKey: string,
  conversationContext: string = ""
): Promise<SemanticExpansion> {
  const defaultResult: SemanticExpansion = {
    searchTerms: [],
    categories: [],
    materials: [],
    useCases: [],
    synonyms: [],
    intent: "general",
  };

  try {
    const expansionPrompt = `Analise a mensagem do vendedor e extraia informações para busca de produtos no catálogo de brindes corporativos/promocionais.

MENSAGEM: "${userMessage}"
${conversationContext ? `CONTEXTO DA CONVERSA: ${conversationContext}` : ""}

Retorne APENAS um JSON válido (sem markdown, sem \`\`\`) com esta estrutura:
{
  "searchTerms": ["termo1", "termo2"],
  "categories": ["categoria1"],
  "materials": ["material1"],
  "useCases": ["caso_de_uso1"],
  "synonyms": ["sinonimo1", "variacao1"],
  "intent": "product_search|client_analysis|proposal|followup|general"
}

REGRAS:
- searchTerms: palavras-chave DIRETAS para buscar no nome/descrição do produto (ex: "caneta", "squeeze", "mochila")
- categories: categorias prováveis (ex: "Escritório", "Tecnologia", "Esporte", "Cozinha", "Bolsas e Mochilas")
- materials: materiais mencionados ou implícitos (ex: "bambu", "metal", "plástico", "algodão", "couro", "silicone")
- useCases: contextos de uso (ex: "brinde corporativo", "evento", "onboarding", "fim de ano", "dia das mães")
- synonyms: sinônimos e variações dos termos (ex: "garrafa" para "squeeze", "bolsa" para "sacola", "caderno" para "bloco")
- intent: classifique a intenção principal

MAPEAMENTO SEMÂNTICO (use para gerar synonyms):
- "sustentável/ecológico/eco" → bambu, cortiça, papel reciclado, algodão orgânico, madeira, fibra de coco
- "tecnológico/tech" → carregador, power bank, pen drive, fone, cabo, suporte notebook, mouse pad
- "escritório/office" → caneta, caderno, bloco, agenda, organizador, porta-canetas, mouse pad
- "premium/executivo/luxo" → couro, metal, kit, caixa especial, gravação laser
- "esportivo/fitness" → squeeze, toalha, mochila, pochete, viseira, camiseta dry-fit
- "cozinha/gastronomia" → caneca, copo, talheres, avental, tábua de corte, kit churrasco
- "infantil/criança" → brinquedo, jogo, mochila infantil, lápis de cor, estojo
- "viagem/travel" → mala, necessaire, tag de mala, travesseiro, adaptador

Seja GENEROSO nos sinônimos — quanto mais variações, melhor a busca.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Você é um motor de expansão de queries para busca semântica em catálogo de brindes. Responda APENAS com JSON válido, sem markdown." },
          { role: "user", content: expansionPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.warn("Query expansion failed:", response.status);
      return defaultResult;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) return defaultResult;

    const parsed = extractAndParseAIJSON(content) as any;

    return {
      searchTerms: Array.isArray(parsed.searchTerms) ? parsed.searchTerms.filter((t: any) => typeof t === "string") : [],
      categories: Array.isArray(parsed.categories) ? parsed.categories.filter((t: any) => typeof t === "string") : [],
      materials: Array.isArray(parsed.materials) ? parsed.materials.filter((t: any) => typeof t === "string") : [],
      useCases: Array.isArray(parsed.useCases) ? parsed.useCases.filter((t: any) => typeof t === "string") : [],
      synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms.filter((t: any) => typeof t === "string") : [],
      intent: ["product_search", "client_analysis", "proposal", "followup", "general"].includes(parsed.intent)
        ? parsed.intent
        : "general",
    };
  } catch (err) {
    console.warn("Query expansion parse error:", err);
    return defaultResult;
  }
}

// ============================================
// LEGACY SEARCH TERM EXTRACTION (FALLBACK)
// ============================================

function extractSearchTermsFallback(messages: Message[]): string[] {
  const lastUserMessage = [...messages].reverse().find(m => m.role === "user");
  if (!lastUserMessage) return [];

  const content = lastUserMessage.content.toLowerCase();
  const stopWords = new Set([
    "o", "a", "os", "as", "um", "uma", "uns", "umas", "de", "da", "do", "das", "dos",
    "em", "na", "no", "nas", "nos", "por", "para", "com", "sem", "que", "qual", "quais",
    "como", "onde", "quando", "porque", "se", "ou", "e", "mas", "mais", "menos",
    "muito", "muita", "muitos", "muitas", "pouco", "pouca", "poucos", "poucas",
    "esse", "essa", "esses", "essas", "este", "esta", "estes", "estas", "aquele", "aquela",
    "isso", "isto", "aquilo", "meu", "minha", "seu", "sua", "nosso", "nossa",
    "algum", "alguma", "alguns", "algumas", "nenhum", "nenhuma", "todo", "toda", "todos", "todas",
    "outro", "outra", "outros", "outras", "mesmo", "mesma", "próprio", "própria",
    "você", "vocês", "ele", "ela", "eles", "elas", "nós", "eu", "me", "te", "lhe", "nos",
    "preciso", "quero", "gostaria", "poderia", "pode", "tem", "tenho", "ter", "haver",
    "ser", "estar", "fazer", "dar", "ver", "ir", "vir", "saber", "querer", "poder",
    "cliente", "produto", "produtos", "brinde", "brindes", "recomenda", "recomende", "sugira", "sugere",
    "melhor", "melhores", "bom", "boa", "bons", "boas", "ótimo", "ótima", "excelente",
  ]);

  const words = content
    .replace(/[^\w\sàáâãéêíóôõúç]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  return [...new Set(words)];
}

// ============================================
// FILTER HELPERS
// ============================================

function normalizeFilterValues(value: string | string[] | null | undefined): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).map((item) => item.trim()).filter(Boolean);
}

function normalizeValueList(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string") return item.trim() ? [item.trim()] : [];
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const candidate = typeof record.name === "string"
          ? record.name
          : typeof record.label === "string"
            ? record.label
            : typeof record.value === "string"
              ? record.value
              : null;
        return candidate?.trim() ? [candidate.trim()] : [];
      }
      return [];
    });
  }
  if (typeof value === "string") {
    return value.split(/[,;|]/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function readTagValues(tags: unknown, keys: string[]): string[] {
  if (!tags || typeof tags !== "object") return [];
  const record = tags as Record<string, unknown>;
  return keys.flatMap((key) => normalizeValueList(record[key]));
}

function matchesTextFilter(value: unknown, filters: string[]): boolean {
  if (!filters.length) return true;
  const normalized = typeof value === "string" ? value.toLowerCase() : "";
  return filters.some((filter) => normalized === filter.toLowerCase() || normalized.includes(filter.toLowerCase()));
}

function matchesListFilter(value: unknown, filters: string[]): boolean {
  if (!filters.length) return true;
  const normalizedValues = normalizeValueList(value).map((item) => item.toLowerCase());
  return filters.some((filter) => normalizedValues.some((item) => item === filter.toLowerCase() || item.includes(filter.toLowerCase())));
}

function matchesTagFilter(tags: unknown, keys: string[], filters: string[]): boolean {
  if (!filters.length) return true;
  return matchesListFilter(readTagValues(tags, keys), filters);
}

function applyProductFilters(products: any[], filters: {
  categoryFilters: string[];
  materialFilters: string[];
  colorFilters: string[];
  genderFilters: string[];
  supplierFilters: string[];
  techniqueFilters: string[];
  publicoFilters: string[];
  dataComemorativaFilters: string[];
  endomarketingFilters: string[];
  nichoFilters: string[];
  tagFilters: string[];
  onlyInStock: boolean;
  onlyNew: boolean;
  onlyKit: boolean;
  onlyBestseller: boolean;
  onlyFeatured: boolean;
  hasPersonalization: boolean;
}) {
  return products.filter((product: any) => {
    if (!matchesListFilter(product.materials, filters.materialFilters)) return false;
    if (!matchesListFilter(product.colors, filters.colorFilters)) return false;
    if (!matchesTextFilter(product.gender, filters.genderFilters)) return false;
    if (!matchesTagFilter(product.tags, ["publicoAlvo", "publico_alvo"], filters.publicoFilters)) return false;
    if (!matchesTagFilter(product.tags, ["datasComemorativas", "datas_comemorativas"], filters.dataComemorativaFilters)) return false;
    if (!matchesTagFilter(product.tags, ["endomarketing"], filters.endomarketingFilters)) return false;
    if (!matchesTagFilter(product.tags, ["nicho", "segmentosAtividade", "segmentos_atividade", "ramo", "ramosAtividade", "ramos_atividade"], filters.nichoFilters)) return false;
    if (filters.tagFilters.length > 0) {
      const topLevelTags = normalizeValueList(product.tags);
      const nestedTags = readTagValues(product.tags, ["tags"]);
      const allTags = [...topLevelTags, ...nestedTags].map(t => t.toLowerCase());
      if (!filters.tagFilters.some(f => allTags.some(t => t === f.toLowerCase() || t.includes(f.toLowerCase())))) return false;
    }
    if (filters.techniqueFilters.length > 0) {
      const techFromTags = readTagValues(product.tags, ["tecnicas", "techniques", "tecnica"]);
      const techDirect = normalizeValueList(product.techniques);
      const allTech = [...techFromTags, ...techDirect].map(t => t.toLowerCase());
      if (!filters.techniqueFilters.some(f => allTech.some(t => t === f.toLowerCase() || t.includes(f.toLowerCase())))) return false;
    }
    if (filters.onlyInStock && Number(product.stock_quantity ?? product.stock ?? 0) <= 0) return false;
    if (filters.onlyNew && !Boolean(product.new_arrival ?? product.is_new)) return false;
    if (filters.onlyKit && !Boolean(product.is_kit)) return false;
    if (filters.onlyFeatured && !Boolean(product.featured ?? product.is_featured)) return false;
    if (filters.onlyBestseller && !Boolean(product.best_seller ?? product.is_bestseller)) return false;
    if (filters.hasPersonalization && !Boolean(product.has_personalization ?? product.personalizable ?? product.is_personalizable)) return false;
    return true;
  });
}

// ============================================
// SEMANTIC RELEVANCE SCORING
// ============================================

function scoreProductRelevance(product: any, expansion: SemanticExpansion, categoryMap: Record<string, string>): number {
  let score = 0;
  const name = (product.name || "").toLowerCase();
  const description = (product.description || "").toLowerCase();
  const catName = (categoryMap[product.category_id] || "").toLowerCase();
  const materials = normalizeValueList(product.materials).map(m => m.toLowerCase()).join(" ");
  const tagsText = JSON.stringify(product.tags || {}).toLowerCase();
  const allText = `${name} ${description} ${materials} ${tagsText} ${catName}`;

  // Direct search terms — highest weight
  for (const term of expansion.searchTerms) {
    const t = term.toLowerCase();
    if (name.includes(t)) score += 10;
    else if (description.includes(t)) score += 5;
    else if (allText.includes(t)) score += 3;
  }

  // Synonyms — high weight (semantic match)
  for (const syn of expansion.synonyms) {
    const s = syn.toLowerCase();
    if (name.includes(s)) score += 8;
    else if (description.includes(s)) score += 4;
    else if (allText.includes(s)) score += 2;
  }

  // Category match — medium weight
  for (const cat of expansion.categories) {
    if (catName.includes(cat.toLowerCase())) score += 6;
  }

  // Material match — medium weight
  for (const mat of expansion.materials) {
    if (materials.includes(mat.toLowerCase())) score += 5;
    else if (allText.includes(mat.toLowerCase())) score += 2;
  }

  // Use case match — lower weight (contextual)
  for (const uc of expansion.useCases) {
    if (allText.includes(uc.toLowerCase())) score += 3;
  }

  return score;
}

// ============================================
// MULTI-STRATEGY SEARCH
// ============================================

async function semanticProductSearch(
  extClient: any,
  expansion: SemanticExpansion,
  fallbackTerms: string[],
  productCols: string,
  limit: number = 60
): Promise<{ products: any[]; searchMethod: string }> {
  // Combine all search terms: AI-expanded + fallback
  const allTerms = [
    ...expansion.searchTerms,
    ...expansion.synonyms,
    ...expansion.materials,
    ...expansion.useCases,
  ];

  // Deduplicate, limit and SANITIZE (remove PostgREST special chars: , . ( ) )
  const uniqueTerms = [...new Set([...allTerms, ...fallbackTerms]
    .map(t => t.toLowerCase().replace(/[(),.]/g, " ").trim()))]
    .filter(t => t.length >= 3)
    .slice(0, 15);

  if (uniqueTerms.length === 0) {
    return { products: [], searchMethod: "none" };
  }

  console.log("🔍 Semantic search terms:", uniqueTerms);

  // Strategy 1: Exact phrase match on name (highest precision)
  const exactResults: any[] = [];
  for (const term of expansion.searchTerms.slice(0, 3)) {
    if (term.length < 3) continue;
    const { data } = await extClient
      .from("products")
      .select(productCols)
      .eq("active", true)
      .ilike("name", `%${term}%`)
      .limit(15);
    if (data) exactResults.push(...data);
  }

  // Strategy 2: Broad OR search across name + description with all expanded terms
  const orParts: string[] = [];
  for (const term of uniqueTerms.slice(0, 8)) {
    if (term.length < 3) continue;
    orParts.push(`name.ilike.%${term}%`);
    orParts.push(`description.ilike.%${term}%`);
  }

  let broadResults: any[] = [];
  if (orParts.length > 0) {
    const { data, error } = await extClient
      .from("products")
      .select(productCols)
      .eq("active", true)
      .or(orParts.join(","))
      .limit(limit);

    if (error) {
      console.error("Broad search error:", error);
    } else {
      broadResults = data || [];
    }
  }

  // Strategy 3: Category-based search (if AI identified categories)
  let categoryResults: any[] = [];
  if (expansion.categories.length > 0) {
    // Fetch category IDs that match
    const catOrFilter = expansion.categories
      .map(c => `name.ilike.%${c}%`)
      .join(",");

    const { data: cats } = await extClient
      .from("categories")
      .select("id")
      .or(catOrFilter)
      .limit(10);

    if (cats?.length) {
      const catIds = cats.map((c: any) => c.id);
      const { data } = await extClient
        .from("products")
        .select(productCols)
        .eq("active", true)
        .in("category_id", catIds)
        .limit(30);
      if (data) categoryResults = data;
    }
  }

  // Merge and deduplicate
  const seen = new Set<string>();
  const merged: any[] = [];

  // Priority order: exact → broad → category
  for (const p of [...exactResults, ...broadResults, ...categoryResults]) {
    if (!p?.id || seen.has(p.id)) continue;
    seen.add(p.id);
    merged.push(p);
  }

  const method = [
    exactResults.length > 0 ? `exact(${exactResults.length})` : null,
    broadResults.length > 0 ? `broad(${broadResults.length})` : null,
    categoryResults.length > 0 ? `category(${categoryResults.length})` : null,
  ].filter(Boolean).join("+");

  console.log(`🔍 Semantic search results: ${merged.length} unique products via ${method}`);

  return { products: merged, searchMethod: method || "fallback" };
}

// ============================================
// MAIN HANDLER
// ============================================

Deno.serve(async (req) => {
  let corsHeaders: Record<string, string>;
  try {
    corsHeaders = getCorsHeaders(req);
  } catch {
    corsHeaders = buildPublicCorsHeaders();
  }
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    const userId = auth.userId;

    // Anti-scraping/abuse protection
    const protection = await runBotProtection(req, {
      endpoint: 'expert-chat',
      maxRequests: 30,
      windowSeconds: 60,
      blockSeconds: 1800,
      customIdentifier: `user:${userId}`,
    }, corsHeaders);
    if (!protection.allowed) return protection.blockResponse!;

    // Rate limit: 20 req/min por usuário
    const rl = await applyRateLimit(req, rateLimiters.ai, () => userId);
    if (rl) {
      const headers = new Headers(rl.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
      return new Response(rl.body, { status: rl.status, headers });
    }

    console.log("Authenticated user:", userId);

    const rawBody = await safeJson(req);
    if (!rawBody) {
      return new Response(JSON.stringify({ error: "Invalid or empty request body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = ExpertChatBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      console.error("Validation errors:", JSON.stringify(parsed.error.flatten()));
      return new Response(
        JSON.stringify({ error: "Dados inválidos", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const {
      messages, clientId,
      categoryFilter, priceMin, priceMax,
      materialFilter, colorFilter, genderFilter, supplierFilter, techniqueFilter,
      publicoFilter, dataComemorativaFilter, endomarketingFilter, nichoFilter, tagFilter,
      onlyInStock, onlyNew, onlyKit, onlyBestseller, onlyFeatured, hasPersonalization,
    } = parsed.data;

    const normalizedFilters = {
      categoryFilters: normalizeFilterValues(categoryFilter),
      materialFilters: normalizeFilterValues(materialFilter),
      colorFilters: normalizeFilterValues(colorFilter),
      genderFilters: normalizeFilterValues(genderFilter),
      supplierFilters: normalizeFilterValues(supplierFilter),
      techniqueFilters: normalizeFilterValues(techniqueFilter),
      publicoFilters: normalizeFilterValues(publicoFilter),
      dataComemorativaFilters: normalizeFilterValues(dataComemorativaFilter),
      endomarketingFilters: normalizeFilterValues(endomarketingFilter),
      nichoFilters: normalizeFilterValues(nichoFilter),
      tagFilters: normalizeFilterValues(tagFilter),
      onlyInStock: Boolean(onlyInStock),
      onlyNew: Boolean(onlyNew),
      onlyKit: Boolean(onlyKit),
      onlyBestseller: Boolean(onlyBestseller),
      onlyFeatured: Boolean(onlyFeatured),
      hasPersonalization: Boolean(hasPersonalization),
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não está configurada");

    const supabase = auth.localServiceClient;

    // ── Seller profile ──
    let sellerFirstName = "";
    const { data: sellerProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", userId)
      .single();
    if (sellerProfile?.full_name) {
      sellerFirstName = sellerProfile.full_name.split(" ")[0];
    }

    // ── AI Query Expansion (runs in parallel with client data fetch) ──
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user")?.content || "";
    const conversationSummary = messages
      .slice(-4)
      .map(m => `${m.role}: ${m.content.substring(0, 100)}`)
      .join("\n");

    const expansionPromise = expandQuerySemantically(lastUserMsg, LOVABLE_API_KEY, conversationSummary);
    const fallbackTerms = extractSearchTermsFallback(messages);

    // ── Client data fetch ──
    let clientContext = "";
    let clientData: ClientData | null = null;
    let customerData: CustomerData | null = null;

    if (clientId) {
      console.log("Fetching client data from CRM for:", clientId);

      // SSOT: lê de integration_credentials (DB-first) com fallback para
      // env vars legadas (CRM_SUPABASE_*). Antes ignorava credenciais
      // salvas pela UI /admin/conexoes.
      const [urlRes, svcRes, anonRes] = await Promise.all([
        resolveCredential("EXTERNAL_CRM_URL"),
        resolveCredential("EXTERNAL_CRM_SERVICE_ROLE_KEY"),
        resolveCredential("EXTERNAL_CRM_ANON_KEY"),
      ]);
      const CRM_URL = urlRes.value;
      const CRM_KEY = svcRes.value ?? anonRes.value;

      if (CRM_URL && CRM_KEY) {
        const crmClient = createClient(CRM_URL, CRM_KEY);

        const { data: company, error: companyError } = await crmClient
          .from("companies")
          .select("id, razao_social, nome_fantasia, title, ramo_atividade, cnpj, logo_url, cidade, estado, website, instagram, is_customer, is_supplier")
          .eq("id", clientId)
          .single();

        if (companyError) {
          console.error("Error fetching CRM company:", companyError);
        } else if (company) {
          clientData = {
            id: company.id,
            name: company.title || company.nome_fantasia || company.razao_social,
            razao_social: company.razao_social,
            nome_fantasia: company.nome_fantasia,
            ramo_atividade: company.ramo_atividade,
            cnpj: company.cnpj,
            logo_url: company.logo_url,
            cidade: company.cidade,
            estado: company.estado,
            website: company.website,
            instagram: company.instagram,
          };
          console.log("CRM company data loaded:", clientData.name);
        }

        const { data: customer, error: customerError } = await crmClient
          .from("customers")
          .select("cliente_ativado, data_primeira_compra, data_ultima_compra, total_pedidos, valor_total_compras, ticket_medio, poder_compra, perfil_preco, vendedor_nome, sobre, observacoes")
          .eq("company_id", clientId)
          .single();

        if (!customerError && customer) {
          customerData = customer;
          console.log("CRM customer data loaded, total_pedidos:", customerData?.total_pedidos);
        }

        const { data: contacts } = await crmClient
          .from("contacts")
          .select("first_name, last_name, cargo, departamento")
          .eq("company_id", clientId)
          .is("deleted_at", null)
          .limit(5);

        if (contacts?.length) console.log("CRM contacts loaded:", contacts.length);
      } else {
        console.warn("CRM env vars not set, skipping CRM data");
      }

      // Quote history
      let quoteProductHistory: any[] = [];
      const { data: clientQuotes, error: quotesError } = await supabase
        .from("quotes")
        .select(`id, quote_number, status, total, created_at, valid_until, sent_at, client_response,
          quote_items (product_name, product_sku, quantity, unit_price, subtotal)`)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(15);

      if (!quotesError && clientQuotes) {
        quoteProductHistory = clientQuotes;
        console.log("Client quote history count:", quoteProductHistory.length);
      }

      let clientOrders: OrderData[] = [];
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, order_number, status, total, created_at, client_name, fulfillment_status")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!ordersError && orders) {
        clientOrders = orders;
        console.log("Client orders count:", clientOrders.length);
      }

      // Build client context
      const productPreferences = new Map<string, { count: number; totalValue: number; lastPurchase: string }>();
      quoteProductHistory.forEach(quote => {
        if (quote.quote_items) {
          quote.quote_items.forEach((item: any) => {
            const existing = productPreferences.get(item.product_name) || { count: 0, totalValue: 0, lastPurchase: quote.created_at };
            productPreferences.set(item.product_name, {
              count: existing.count + item.quantity,
              totalValue: existing.totalValue + (item.subtotal || 0),
              lastPurchase: quote.created_at > existing.lastPurchase ? quote.created_at : existing.lastPurchase
            });
          });
        }
      });

      const topProducts = Array.from(productPreferences.entries())
        .sort((a, b) => b[1].totalValue - a[1].totalValue)
        .slice(0, 5);

      const averageOrderValue = quoteProductHistory.length > 0
        ? quoteProductHistory.reduce((sum, q) => sum + (q.total || 0), 0) / quoteProductHistory.length
        : 0;

      const pendingQuotes = quoteProductHistory.filter(q => q.status === 'sent' && !q.client_response);
      const expiringQuotes = quoteProductHistory.filter(q => {
        if (!q.valid_until) return false;
        const daysUntilExpiry = (new Date(q.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return daysUntilExpiry > 0 && daysUntilExpiry <= 7 && q.status !== 'approved' && q.status !== 'converted';
      });

      const daysSinceLastInteraction = quoteProductHistory.length > 0
        ? Math.floor((Date.now() - new Date(quoteProductHistory[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const totalRevenue = clientOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const conversionRate = quoteProductHistory.length > 0
        ? ((quoteProductHistory.filter(q => q.status === 'approved' || q.status === 'converted').length / quoteProductHistory.length) * 100).toFixed(0)
        : "0";

      if (clientData) {
        clientContext = `
CONTEXTO COMPLETO DO CLIENTE (CRM):
- Nome: ${clientData.name}
- Razão Social: ${clientData.razao_social}
${clientData.nome_fantasia ? `- Nome Fantasia: ${clientData.nome_fantasia}` : ""}
- Ramo de atividade: ${clientData.ramo_atividade || "Não informado"}
${clientData.cnpj ? `- CNPJ: ${clientData.cnpj}` : ""}
- Localização: ${[clientData.cidade, clientData.estado].filter(Boolean).join(", ") || "Não informada"}
- Logo disponível: ${clientData.logo_url ? "Sim" : "Não"}
${clientData.website ? `- Website: ${clientData.website}` : ""}
${clientData.instagram ? `- Instagram: ${clientData.instagram}` : ""}
- Dias desde última interação: ${daysSinceLastInteraction !== null ? `${daysSinceLastInteraction} dias` : "N/A"}

DADOS COMERCIAIS (CRM):
${customerData ? `- Status: ${customerData.cliente_ativado ? "Ativo" : "Inativo"}
- Total de pedidos (CRM): ${customerData.total_pedidos || 0}
- Valor total compras: ${customerData.valor_total_compras ? `R$ ${customerData.valor_total_compras.toLocaleString("pt-BR")}` : "N/A"}
- Ticket médio (CRM): ${customerData.ticket_medio ? `R$ ${customerData.ticket_medio.toFixed(2)}` : "N/A"}
- Poder de compra: ${customerData.poder_compra || "N/A"}
- Perfil de preço: ${customerData.perfil_preco || "N/A"}
- Primeira compra: ${customerData.data_primeira_compra ? new Date(customerData.data_primeira_compra).toLocaleDateString("pt-BR") : "N/A"}
- Última compra: ${customerData.data_ultima_compra ? new Date(customerData.data_ultima_compra).toLocaleDateString("pt-BR") : "N/A"}
- Vendedor responsável: ${customerData.vendedor_nome || "N/A"}
${customerData.sobre ? `- Sobre: ${customerData.sobre}` : ""}
${customerData.observacoes ? `- Observações: ${customerData.observacoes}` : ""}` : "- Sem dados comerciais no CRM"}

MÉTRICAS DE VENDAS (PLATAFORMA):
- Ticket médio orçamentos: ${averageOrderValue > 0 ? `R$ ${averageOrderValue.toFixed(2)}` : "Sem dados"}
- Total de orçamentos: ${quoteProductHistory.length}
- Pedidos confirmados: ${clientOrders.length}
- Receita total em pedidos: R$ ${totalRevenue.toFixed(2)}
- Taxa de conversão: ${conversionRate}%

ORÇAMENTOS RECENTES:
${quoteProductHistory.length > 0
  ? quoteProductHistory.slice(0, 8).map((q, i) => {
      const statusMap: Record<string, string> = { draft: "Rascunho", sent: "Enviado", approved: "Aprovado", rejected: "Rejeitado", converted: "Convertido", expired: "Expirado" };
      return `${i + 1}. ${q.quote_number} - R$ ${q.total?.toFixed(2)} - ${statusMap[q.status] || q.status} - ${new Date(q.created_at).toLocaleDateString("pt-BR")}${q.client_response ? ` [Resposta: ${q.client_response}]` : ""}`;
    }).join("\n")
  : "Nenhum orçamento encontrado"}

PEDIDOS CONFIRMADOS:
${clientOrders.length > 0
  ? clientOrders.map((o, i) => {
      const statusMap: Record<string, string> = { pending: "Pendente", confirmed: "Confirmado", production: "Em Produção", shipped: "Enviado", delivered: "Entregue" };
      return `${i + 1}. ${o.order_number} - R$ ${o.total?.toFixed(2)} - ${statusMap[o.status] || o.status} - ${new Date(o.created_at).toLocaleDateString("pt-BR")}`;
    }).join("\n")
  : "Nenhum pedido encontrado"}

ALERTAS E FOLLOW-UPS:
${pendingQuotes.length > 0 ? `⚠️ ${pendingQuotes.length} orçamento(s) enviado(s) aguardando resposta do cliente` : ""}
${expiringQuotes.length > 0 ? `⏰ ${expiringQuotes.length} orçamento(s) prestes a vencer nos próximos 7 dias` : ""}
${daysSinceLastInteraction !== null && daysSinceLastInteraction > 30 ? `🔔 Cliente inativo há ${daysSinceLastInteraction} dias - considere retomar contato` : ""}
${!pendingQuotes.length && !expiringQuotes.length && (daysSinceLastInteraction === null || daysSinceLastInteraction <= 30) ? "✅ Nenhum alerta pendente" : ""}

PRODUTOS MAIS COMPRADOS:
${topProducts.length > 0
  ? topProducts.map(([name, data], i) => `  ${i + 1}. ${name} - ${data.count} unidades, R$ ${data.totalValue.toFixed(2)} total`).join("\n")
  : "  Nenhum histórico de produtos"}

INTELIGÊNCIA DE UPSELL:
${topProducts.length > 0
  ? `- Preferências: ${topProducts.map(([name]) => name).join(", ")}
- Sugira versões premium ou complementares dos itens já comprados
- Ticket médio de R$ ${averageOrderValue.toFixed(2)} para calibrar sugestões
- Ofereça kits com produtos que ele já conhece`
  : "- Cliente novo - foque em entender necessidades e construir relacionamento"}
`;
      }
    }

    // ── Wait for semantic expansion ──
    const expansion = await expansionPromise;
    console.log("🧠 Semantic expansion:", JSON.stringify({
      intent: expansion.intent,
      searchTerms: expansion.searchTerms.length,
      synonyms: expansion.synonyms.length,
      categories: expansion.categories,
      materials: expansion.materials,
    }));

    // ── Product search ──
    let productsContext = "";
    let semanticResults: any[] = [];

    const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL");
    const EXT_KEY = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");

    if (!EXT_URL || !EXT_KEY) {
      console.error("External DB env vars not set — cannot fetch products");
    } else if (expansion.intent === "product_search" || expansion.intent === "proposal" || expansion.searchTerms.length > 0 || fallbackTerms.length > 0) {
      const extClient = createClient(EXT_URL, EXT_KEY);
      const PRODUCT_COLS = "id, name, sku, sale_price, primary_image_url, category_id, supplier_id, description, brand, gender, is_kit, stock_quantity, min_quantity, tags, active";

      // ── Resolve category IDs from names (DB-level join) ──
      let resolvedCategoryIds: string[] = [];
      if (normalizedFilters.categoryFilters.length > 0) {
        const catOrFilter = normalizedFilters.categoryFilters
          .map(c => `name.ilike.%${c}%`)
          .join(",");
        const { data: matchedCats } = await extClient
          .from("categories")
          .select("id")
          .or(catOrFilter)
          .limit(50);

        if (matchedCats?.length) {
          const parentIds = matchedCats.map((c: any) => c.id);
          // Also fetch descendant categories for hierarchical filtering
          const { data: allCats } = await extClient
            .from("categories")
            .select("id, parent_id")
            .limit(1000);

          if (allCats) {
            // BFS to find all descendants
            const childMap = new Map<string, string[]>();
            for (const cat of allCats) {
              if (cat.parent_id) {
                const children = childMap.get(cat.parent_id) || [];
                children.push(cat.id);
                childMap.set(cat.parent_id, children);
              }
            }
            const queue = [...parentIds];
            const visited = new Set<string>(parentIds);
            while (queue.length > 0) {
              const current = queue.shift()!;
              const children = childMap.get(current) || [];
              for (const childId of children) {
                if (!visited.has(childId)) {
                  visited.add(childId);
                  queue.push(childId);
                }
              }
            }
            resolvedCategoryIds = [...visited];
          } else {
            resolvedCategoryIds = parentIds;
          }
          console.log(`🏷️ Category filter: ${normalizedFilters.categoryFilters.join(", ")} → ${resolvedCategoryIds.length} category IDs (incl. descendants)`);
        } else {
          console.warn("⚠️ No categories matched filter:", normalizedFilters.categoryFilters);
        }
      }

      // ── Resolve supplier IDs from names (DB-level join) ──
      let resolvedSupplierIds: string[] = [];
      if (normalizedFilters.supplierFilters.length > 0) {
        const supOrFilter = normalizedFilters.supplierFilters
          .map(s => `name.ilike.%${s}%`)
          .join(",");
        const { data: matchedSups } = await extClient
          .from("suppliers")
          .select("id")
          .or(supOrFilter)
          .limit(50);

        if (matchedSups?.length) {
          resolvedSupplierIds = matchedSups.map((s: any) => s.id);
          console.log(`🏢 Supplier filter: ${normalizedFilters.supplierFilters.join(", ")} → ${resolvedSupplierIds.length} supplier IDs`);
        } else {
          console.warn("⚠️ No suppliers matched filter:", normalizedFilters.supplierFilters);
        }
      }

      // ── Semantic multi-strategy search ──
      const { products: searchProducts, searchMethod } = await semanticProductSearch(
        extClient, expansion, fallbackTerms, PRODUCT_COLS, 60
      );
      semanticResults = searchProducts;
      console.log("Semantic search method:", searchMethod);

      // ── General filtered query ──
      let productsQuery = extClient
        .from("products")
        .select(PRODUCT_COLS)
        .eq("active", true);

      if (priceMin !== null && priceMin !== undefined) productsQuery = productsQuery.gte("sale_price", priceMin);
      if (priceMax !== null && priceMax !== undefined) productsQuery = productsQuery.lte("sale_price", priceMax);

      // Apply resolved category IDs at DB level
      if (resolvedCategoryIds.length > 0) {
        productsQuery = productsQuery.in("category_id", resolvedCategoryIds);
      } else if (normalizedFilters.categoryFilters.length > 0) {
        // Filter was set but no matches — force empty result
        productsQuery = productsQuery.eq("category_id", "00000000-0000-0000-0000-000000000000");
      }

      // Apply resolved supplier IDs at DB level
      if (resolvedSupplierIds.length > 0) {
        productsQuery = productsQuery.in("supplier_id", resolvedSupplierIds);
      } else if (normalizedFilters.supplierFilters.length > 0) {
        productsQuery = productsQuery.eq("supplier_id", "00000000-0000-0000-0000-000000000000");
      }

      if (normalizedFilters.genderFilters.length === 1) {
        productsQuery = productsQuery.eq("gender", normalizedFilters.genderFilters[0]);
      } else if (normalizedFilters.genderFilters.length > 1) {
        productsQuery = productsQuery.in("gender", normalizedFilters.genderFilters);
      }

      if (normalizedFilters.onlyInStock) productsQuery = productsQuery.gt("stock_quantity", 0);
      if (normalizedFilters.onlyKit) productsQuery = productsQuery.eq("is_kit", true);

      const { data: products, error: productsError } = await productsQuery.limit(120);
      if (productsError) console.error("Error fetching products:", productsError);

      // Also fetch products via N:N category assignments if category filter is active
      let categoryAssignProducts: any[] = [];
      if (resolvedCategoryIds.length > 0) {
        const { data: assignments } = await extClient
          .from("product_category_assignments")
          .select("product_id")
          .in("category_id", resolvedCategoryIds.slice(0, 100))
          .limit(200);

        if (assignments?.length) {
          const assignedIds = [...new Set(assignments.map((a: any) => a.product_id))];
          const existingIds = new Set((products || []).map((p: any) => p.id));
          const missingIds = assignedIds.filter(id => !existingIds.has(id)).slice(0, 50);

          if (missingIds.length > 0) {
            const { data: extraProducts } = await extClient
              .from("products")
              .select(PRODUCT_COLS)
              .eq("active", true)
              .in("id", missingIds);
            if (extraProducts) categoryAssignProducts = extraProducts;
            console.log(`🏷️ N:N category assignments added ${categoryAssignProducts.length} extra products`);
          }
        }
      }

      // Merge search + general + N:N category, deduplicate
      const allRawProducts = [
        ...(semanticResults || []),
        ...(products || []).filter((p: any) => !semanticResults.some((s: any) => s.id === p.id)),
        ...categoryAssignProducts.filter((p: any) => !semanticResults.some((s: any) => s.id === p.id) && !(products || []).some((q: any) => q.id === p.id)),
      ];

      // Also filter semantic results by category/supplier if filters are active
      let preFiltered = allRawProducts;
      if (resolvedCategoryIds.length > 0) {
        const catSet = new Set(resolvedCategoryIds);
        const assignedProductIds = new Set(categoryAssignProducts.map((p: any) => p.id));
        preFiltered = preFiltered.filter((p: any) => catSet.has(p.category_id) || assignedProductIds.has(p.id));
      }
      if (resolvedSupplierIds.length > 0) {
        const supSet = new Set(resolvedSupplierIds);
        preFiltered = preFiltered.filter((p: any) => supSet.has(p.supplier_id));
      }

      const filteredProducts = applyProductFilters(preFiltered, normalizedFilters);

      // Apply price filter on text-search results
      let finalProducts = filteredProducts;
      if (priceMin !== null && priceMin !== undefined) {
        finalProducts = finalProducts.filter((p: any) => (p.sale_price ?? 0) >= priceMin);
      }
      if (priceMax !== null && priceMax !== undefined) {
        finalProducts = finalProducts.filter((p: any) => (p.sale_price ?? 0) <= priceMax);
      }

      console.log("Total products after all filters:", finalProducts.length);

      // ── Enrich with category/supplier names ──
      const categoryIds = [...new Set(finalProducts.map((p: any) => p.category_id).filter(Boolean))];
      const supplierIds = [...new Set(finalProducts.map((p: any) => p.supplier_id).filter(Boolean))];

      let categoryMap: Record<string, string> = {};
      let supplierMap: Record<string, string> = {};

      const enrichPromises: Promise<void>[] = [];
      if (categoryIds.length > 0) {
        enrichPromises.push(
          (async () => {
            const { data } = await extClient.from("categories").select("id, name").in("id", categoryIds.slice(0, 50));
            if (data) categoryMap = Object.fromEntries(data.map((c: any) => [c.id, c.name]));
          })(),
        );
      }
      if (supplierIds.length > 0) {
        enrichPromises.push(
          (async () => {
            const { data } = await extClient.from("suppliers").select("id, name").in("id", supplierIds.slice(0, 50));
            if (data) supplierMap = Object.fromEntries(data.map((s: any) => [s.id, s.name]));
          })(),
        );
      }
      await Promise.all(enrichPromises);

      // ── Relevance scoring and ranking ──
      const scoredProducts = finalProducts.map((p: any) => ({
        ...p,
        _relevanceScore: scoreProductRelevance(p, expansion, categoryMap),
      }));

      // Sort by relevance score (highest first)
      scoredProducts.sort((a: any, b: any) => b._relevanceScore - a._relevanceScore);

      const buildProductDescription = (p: any): string => {
        const catName = categoryMap[p.category_id] || null;
        const supName = supplierMap[p.supplier_id] || null;
        const price = p.sale_price;
        const parts = [
          `ID: ${p.id}`,
          `Nome: ${p.name}`,
          p.sku ? `SKU: ${p.sku}` : null,
          catName ? `Categoria: ${catName}` : null,
          price ? `Preço: R$ ${Number(price).toFixed(2)}` : null,
          p.description ? `Descrição: ${p.description.substring(0, 150)}` : null,
          p.materials?.length ? `Materiais: ${Array.isArray(p.materials) ? p.materials.join(", ") : p.materials}` : null,
          p.brand ? `Marca: ${p.brand}` : null,
          supName ? `Fornecedor: ${supName}` : null,
          p.stock_quantity ? `Estoque: ${p.stock_quantity}` : null,
          p.primary_image_url ? `Imagem: ${p.primary_image_url}` : null,
          `Relevância: ${p._relevanceScore}`,
        ].filter(Boolean);
        return parts.join(" | ");
      };

      // Top semantic results (score > 0)
      const semanticTop = scoredProducts.filter((p: any) => p._relevanceScore > 0).slice(0, 15);
      const generalPool = scoredProducts.filter((p: any) => p._relevanceScore === 0).slice(0, 15);

      if (semanticTop.length > 0) {
        productsContext = `
PRODUTOS ENCONTRADOS POR BUSCA SEMÂNTICA (ordenados por relevância — PRIORIZE estes):
Busca expandida: termos=${expansion.searchTerms.join(", ")} | sinônimos=${expansion.synonyms.join(", ")} | categorias=${expansion.categories.join(", ")} | materiais=${expansion.materials.join(", ")}

${semanticTop.map(p => buildProductDescription(p)).join("\n\n")}
`;
      }

      if (generalPool.length > 0) {
        productsContext += `

OUTROS PRODUTOS DO CATÁLOGO (para contexto adicional):
${generalPool.map(p => buildProductDescription(p)).join("\n\n")}
`;
      }
    } else {
      // Non-product intent — still load some general products
      const EXT_URL2 = Deno.env.get("EXTERNAL_SUPABASE_URL");
      const EXT_KEY2 = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");
      if (EXT_URL2 && EXT_KEY2) {
        const extClient = createClient(EXT_URL2, EXT_KEY2);
        let q = extClient
          .from("products")
          .select("id, name, sku, sale_price, primary_image_url, category_id, description, brand, stock_quantity")
          .eq("active", true);

        if (priceMin !== null && priceMin !== undefined) q = q.gte("sale_price", priceMin);
        if (priceMax !== null && priceMax !== undefined) q = q.lte("sale_price", priceMax);

        const { data: bgProducts } = await q.limit(30);
        if (bgProducts?.length) {
          productsContext = `
PRODUTOS DO CATÁLOGO (amostra geral):
${bgProducts.map((p: any) => `ID: ${p.id} | Nome: ${p.name} | SKU: ${p.sku} | Preço: R$ ${Number(p.sale_price || 0).toFixed(2)} | ${p.primary_image_url ? `Imagem: ${p.primary_image_url}` : ""}`).join("\n")}
`;
        }
      }
    }

    // ── Build filter info for the AI ──
    const filterParts: string[] = [];
    const pushValues = (label: string, values: string[]) => {
      if (values.length > 0) filterParts.push(`${label}: ${values.join(", ")}`);
    };

    pushValues("Categorias", normalizedFilters.categoryFilters);
    pushValues("Materiais", normalizedFilters.materialFilters);
    pushValues("Cores", normalizedFilters.colorFilters);
    pushValues("Gêneros", normalizedFilters.genderFilters);
    pushValues("Fornecedores", normalizedFilters.supplierFilters);
    pushValues("Técnicas", normalizedFilters.techniqueFilters);
    pushValues("Público-alvo", normalizedFilters.publicoFilters);
    pushValues("Datas comemorativas", normalizedFilters.dataComemorativaFilters);
    pushValues("Endomarketing", normalizedFilters.endomarketingFilters);
    pushValues("Nichos/segmentos", normalizedFilters.nichoFilters);
    pushValues("Tags", normalizedFilters.tagFilters);

    if (priceMin !== null && priceMin !== undefined && priceMax !== null && priceMax !== undefined) {
      filterParts.push(`Preço: R$ ${priceMin} - R$ ${priceMax}`);
    } else if (priceMin !== null && priceMin !== undefined) {
      filterParts.push(`Preço: acima de R$ ${priceMin}`);
    } else if (priceMax !== null && priceMax !== undefined) {
      filterParts.push(`Preço: até R$ ${priceMax}`);
    }

    if (normalizedFilters.onlyInStock) filterParts.push("Apenas em estoque");
    if (normalizedFilters.onlyNew) filterParts.push("Apenas novidades");
    if (normalizedFilters.onlyKit) filterParts.push("Apenas kits");
    if (normalizedFilters.onlyBestseller) filterParts.push("Priorizar mais vendidos");
    if (normalizedFilters.onlyFeatured) filterParts.push("Apenas destaques");
    if (normalizedFilters.hasPersonalization) filterParts.push("Com personalização");

    const filterInfo = filterParts.length > 0
      ? `\nFILTROS ATIVOS DO VENDEDOR: ${filterParts.join(", ")}\nIMPORTANTE: APENAS mostre produtos que atendam a TODOS os filtros. NÃO sugira produtos fora dos critérios. O vendedor já definiu esses filtros — NÃO pergunte novamente sobre faixa de preço ou critérios que já estão filtrados.`
      : "";

    if (productsContext) {
      productsContext = `
CATÁLOGO DE PRODUTOS (use o formato [[PRODUTO:id:nome:imageUrl]] para criar links clicáveis):${filterInfo}
${productsContext}`;
    }

    // ── System prompt ──
    const sellerGreeting = sellerFirstName || "parceiro";

    const systemPrompt = `Você é o FLOW, assistente pessoal de vendas da Promo Brindes. Você é um parceiro estratégico humano e próximo do vendedor.

NOME DO VENDEDOR: ${sellerGreeting}
REGRA OBRIGATÓRIA: Na PRIMEIRA mensagem de cada conversa, SEMPRE cumprimente o vendedor pelo primeiro nome de forma calorosa e natural. Exemplo: "${sellerGreeting}, ótima pergunta!" ou "E aí ${sellerGreeting}, vamos lá!" ou "Fala ${sellerGreeting}! Olha só o que encontrei...". Nas mensagens seguintes, use o nome ocasionalmente (não em todas) para manter naturalidade.

PERSONALIDADE E TOM:
- Você é como um colega experiente e animado — não um robô
- Use expressões naturais: "olha só", "cara", "show", "perfeito", "massa", "bora", "vamos nessa"
- Demonstre entusiasmo genuíno quando encontrar boas oportunidades
- Seja empático — reconheça frustrações ("sei que é chato ficar sem resposta...")
- Use emojis com moderação para dar calor humano (1-3 por mensagem)
- Evite linguagem corporativa engessada — seja profissional mas acessível
- Quando não souber algo, seja honesto: "Não tenho essa info aqui, mas sugiro..."

SEU PAPEL COMPLETO:
1. **Consultor de Produtos** — Conhece profundamente o catálogo e faz recomendações personalizadas
2. **Analista de CRM** — Interpreta dados do cliente para gerar insights
3. **Gerador de Propostas** — Sugere composições de orçamento com produtos, quantidades e argumentos de venda
4. **Estrategista de Follow-up** — Identifica oportunidades de retomada
5. **Detector de Oportunidades** — Identifica cross-sell, upsell, sazonalidade

BUSCA SEMÂNTICA INTELIGENTE:
Os produtos listados abaixo foram encontrados usando busca semântica com expansão de query por IA.
Os produtos no topo (maior relevância) são os que MELHOR correspondem à intenção do vendedor.
PRIORIZE FORTEMENTE os produtos com maior score de relevância.
${expansion.intent !== "general" ? `INTENÇÃO DETECTADA: ${expansion.intent}` : ""}
${expansion.searchTerms.length > 0 ? `CONCEITOS SEMÂNTICOS IDENTIFICADOS: ${[...expansion.searchTerms, ...expansion.synonyms].join(", ")}` : ""}

CAPACIDADES DE ASSISTENTE PESSOAL DE VENDAS:

📊 CRM E ANÁLISE DE CLIENTE:
- Quando perguntado sobre um cliente, forneça um resumo executivo
- Identifique padrões de compra e sazonalidade
- Alerte sobre clientes inativos

📝 GERAÇÃO DE PROPOSTAS:
- Sugira composições de orçamento com produtos específicos
- Considere o ticket médio e histórico do cliente
- Inclua argumentos de venda para cada produto
- Use sempre o formato: [[PRODUTO:id:nome:imageUrl]]

 📞 FOLLOW-UP INTELIGENTE:
- Identifique orçamentos enviados sem resposta
- Sugira textos prontos para WhatsApp/email
- Alerte sobre orçamentos prestes a vencer

🎯 ANÁLISE DE OPORTUNIDADES:
- Cross-sell baseado no histórico
- Upgrades para produtos premium
- Oportunidades sazonais
- Kits e combos personalizados

FORMATO DE LINKS DE PRODUTOS (OBRIGATÓRIO):
[[PRODUTO:id_do_produto:Nome do Produto:url_da_imagem]]
Se não houver imagem: [[PRODUTO:id_do_produto:Nome do Produto]]
IMPORTANTE: SEMPRE inclua a URL da imagem quando disponível (campo "Imagem").
REGRA CRÍTICA: SEMPRE que mencionar um produto, use o formato [[PRODUTO:...]] com o ID real do banco de dados.
NÃO mencione produtos sem usar o formato de link — isso impede o vendedor de navegar até o produto.
Cada recomendação DEVE ter o link clicável.

FORMATO DE MENSAGENS DE FOLLOW-UP:
> **WhatsApp/Email sugerido:**
> Olá [Nome], tudo bem? Vi que enviamos um orçamento para [produtos] no dia [data]...

DIRETRIZES DE COMPORTAMENTO:
1. Seja proativo — não espere perguntas, ofereça insights
2. Sempre explique o PORQUÊ de cada recomendação
3. Use dados concretos (ticket médio, taxa de conversão, histórico)
4. Seja conciso mas estratégico
5. Linguagem profissional e acessível (português brasileiro informal)
6. SEMPRE use [[PRODUTO:id:nome:imageUrl]] ao mencionar produtos — NUNCA mencione produtos sem link
7. Quando gerar propostas, organize em formato de tabela quando possível
8. REGRA DE FILTROS: Se filtros já estão ativos (preço, categoria, fornecedor, etc.), NÃO pergunte "qual faixa de preço?" ou "qual categoria?" — essas informações já foram definidas. Use os filtros para contextualizar as respostas. APENAS faça perguntas sobre informações que AINDA NÃO ESTÃO nos filtros.
9. Quando o vendedor pedir recomendações e filtros estão ativos, VÁ DIRETO para as sugestões sem perguntas desnecessárias
10. Limite suas recomendações a 3-5 produtos bem selecionados, não despeje dezenas

${clientContext}
${productsContext}

IMPORTANTE: Você tem acesso completo aos dados do cliente em tempo real — CRM, orçamentos, pedidos, follow-ups e análise comportamental. Use TODAS essas informações para ser o assistente mais estratégico possível. Seu objetivo é ajudar o vendedor ${sellerGreeting} a fechar mais negócios com mais inteligência.`;

    const apiMessages: Message[] = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    console.log("Calling Lovable AI with", apiMessages.length, "messages");
    console.log("System prompt length:", systemPrompt.length);

    const response = await callAiWithTracking({
      userId,
      functionName: "expert-chat",
      model: "google/gemini-2.5-flash",
      apiKey: LOVABLE_API_KEY,
      stream: true,
      requestBody: { messages: apiMessages },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Aguarde alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos na workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    if (error instanceof QuotaExceededError) {
      return new Response(
        JSON.stringify({ error: "Limite mensal de IA atingido. Contate o administrador." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if ((error as any)?.status === 401 || (error as any)?.status === 403) {
      return authErrorResponse(error, corsHeaders);
    }
    console.error("Expert chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

```

---

## `generate-mockup`

**Path:** `supabase/functions/generate-mockup/index.ts` (294 linhas)

**verify_jwt:** `false` (system default — validação in-code)

**Source completa:**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { authenticateRequest, authErrorResponse } from '../_shared/auth.ts';
import { z } from "npm:zod@3.23.8";
import { callAiWithTracking, QuotaExceededError } from '../_shared/ai-usage.ts';
import { runBotProtection } from '../_shared/bot-protection.ts';
import { safeJson } from '../_shared/json-parser.ts';

const MockupBodySchema = z.object({
  productImageUrl: z.string().url().max(2000),
  logoBase64: z.string().max(5_000_000).optional(),
  logoUrl: z.string().url().max(2000).optional(),
  techniqueName: z.string().max(200).optional(),
  techniquePrompt: z.string().max(5000).optional(),
  techniqueId: z.string().max(100).optional(),
  positionX: z.number().min(0).max(100),
  positionY: z.number().min(0).max(100),
  logoWidthCm: z.number().positive().max(200).optional(),
  logoHeightCm: z.number().positive().max(200).optional(),
  logoRotation: z.number().min(-360).max(360).optional().default(0),
  logoScale: z.number().min(1).max(500).optional().default(100),
  productName: z.string().max(500).optional(),
});

// CORS headers are now dynamic — use getCorsHeaders(req) inside the handler
// See _shared/cors.ts for the centralized configuration

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateRequest(req);
    const user = { id: auth.userId };

    const protection = await runBotProtection(req, {
      endpoint: 'generate-mockup',
      maxRequests: 15,
      windowSeconds: 60,
      blockSeconds: 3600,
      customIdentifier: `user:${user.id}`,
    }, corsHeaders);
    if (!protection.allowed) return protection.blockResponse!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const rawBody = await safeJson(req);
    if (!rawBody) {
      return new Response(JSON.stringify({ error: "Invalid or empty request body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = MockupBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { 
      productImageUrl, 
      logoBase64,
      logoUrl,
      techniqueName,
      techniquePrompt,
      techniqueId,
      positionX, 
      positionY, 
      logoWidthCm, 
      logoHeightCm,
      logoRotation,
      logoScale,
      productName 
    } = parsed.data;

    let logoImageSrc = logoBase64 || logoUrl;

    if (!logoImageSrc) {
      return new Response(
        JSON.stringify({ error: "Product image and logo are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isSvg = typeof logoImageSrc === "string" && 
      (logoImageSrc.startsWith("data:image/svg+xml") || logoImageSrc.endsWith(".svg"));
    
    if (isSvg) {
      return new Response(
        JSON.stringify({ 
          error: "Logos em formato SVG não são suportados. Por favor, converta para PNG ou JPG.",
          errorCode: "SVG_NOT_SUPPORTED"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating mockup for product: ${productName}`);
    console.log(`Technique: ${techniqueName}`);
    console.log(`Position: ${positionX}%, ${positionY}%`);
    console.log(`Size: ${logoWidthCm}cm x ${logoHeightCm}cm, Rotation: ${logoRotation}°, Scale: ${logoScale}%`);

    // Calculate position descriptions
    const horizontalPos = positionX < 25 ? "far left" : positionX < 40 ? "left of center" : positionX > 75 ? "far right" : positionX > 60 ? "right of center" : "horizontally centered";
    const verticalPos = positionY < 25 ? "near the very top" : positionY < 40 ? "in the upper third" : positionY > 75 ? "near the very bottom" : positionY > 60 ? "in the lower third" : "vertically centered";
    const positionDesc = `${verticalPos}, ${horizontalPos}`;
    // logoWidthCm/logoHeightCm são opcionais no schema; usar fallback de 10cm
    // (tamanho médio típico de área de gravação) quando ausentes.
    const safeLogoWidthCm = logoWidthCm ?? 10;
    const safeLogoHeightCm = logoHeightCm ?? 10;
    const relativeSize = ((safeLogoWidthCm + safeLogoHeightCm) / 2) / 30;
    const sizeDesc = relativeSize < 0.15 ? "small" : relativeSize < 0.3 ? "medium-sized" : "large";

    const scaleInstruction = logoScale < 100 
      ? `\n- Logo fill: the logo should fill only ${logoScale}% of the engraving area, leaving proportional empty space around it`
      : logoScale > 100
      ? `\n- Logo fill: the logo should OVERFLOW beyond the engraving area boundaries, scaled to ${logoScale}% of the area (the logo appears ${Math.round(logoScale / 100 * 10) / 10}x larger than the base engraving zone)`
      : '';
    const rotationInstruction = logoRotation ? `\n- Logo rotation: ${logoRotation}° clockwise from its natural upright orientation` : '';

    // Try to load prompt from database
    let promptTemplate: string | null = null;
    let aiModel = "google/gemini-2.5-flash-image-preview";

    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );

      // Try technique-specific prompt first
      if (techniqueId) {
        const { data: techConfig } = await supabaseClient
          .from('mockup_prompt_configs')
          .select('prompt_text, ai_model')
          .eq('config_key', `technique_${techniqueId}`)
          .eq('is_active', true)
          .single();

        if (techConfig) {
          console.log("Using technique-specific prompt config");
          // Technique prompt is appended to technique description
        }
      }

      // Load main prompt
      const { data: mainConfig } = await supabaseClient
        .from('mockup_prompt_configs')
        .select('prompt_text, ai_model')
        .eq('config_key', 'main_prompt')
        .eq('is_active', true)
        .single();

      if (mainConfig) {
        promptTemplate = mainConfig.prompt_text;
        aiModel = mainConfig.ai_model;
        console.log(`Using DB prompt template (model: ${aiModel})`);
      }
    } catch (dbErr) {
      console.warn("Could not load prompt from DB, using default:", dbErr);
    }

    // Build the final prompt
    let prompt: string;
    
    if (promptTemplate) {
      // Replace template variables — todos os valores são coagidos para string
      // (productName/techniquePrompt são opcionais no schema; default '').
      prompt = promptTemplate
        .replace(/\{\{productName\}\}/g, productName ?? '')
        .replace(/\{\{techniquePrompt\}\}/g, techniquePrompt ?? '')
        .replace(/\{\{positionX\}\}/g, String(positionX))
        .replace(/\{\{positionY\}\}/g, String(positionY))
        .replace(/\{\{horizontalPos\}\}/g, horizontalPos)
        .replace(/\{\{verticalPos\}\}/g, verticalPos)
        .replace(/\{\{positionDesc\}\}/g, positionDesc)
        .replace(/\{\{sizeDesc\}\}/g, sizeDesc)
        .replace(/\{\{logoWidthCm\}\}/g, String(logoWidthCm))
        .replace(/\{\{logoHeightCm\}\}/g, String(logoHeightCm))
        .replace(/\{\{scaleInstruction\}\}/g, scaleInstruction)
        .replace(/\{\{rotationInstruction\}\}/g, rotationInstruction);
    } else {
      // Fallback hardcoded prompt (legacy)
      prompt = `You are a professional product mockup generator. Apply the provided company logo onto the product image at the EXACT position specified.

Product: ${productName}
Technique: ${techniquePrompt}

EXACT LOGO POSITION (this is critical, do NOT deviate):
- Horizontal: ${positionX}% from the left edge (${horizontalPos})
- Vertical: ${positionY}% from the top edge (${verticalPos})
- The logo must be placed at EXACTLY this coordinate on the product surface: ${positionDesc}
- Logo size: ${sizeDesc} (approximately ${logoWidthCm}cm x ${logoHeightCm}cm)${scaleInstruction}${rotationInstruction}

STRICT RULES - MUST FOLLOW ALL:
1. Place the logo at EXACTLY the specified position (${positionX}% horizontal, ${positionY}% vertical). This is the most important rule.
2. DO NOT move the logo to a different location than specified. If the position says "lower third", the logo MUST be in the lower third, NOT in the middle or upper area.
3. DO NOT change the product size, proportions, dimensions, framing, or crop in any way.
4. The output must have the exact same composition and scale as the input product image.
5. The logo should follow the contours/curves of the product surface naturally.
6. Apply realistic lighting and shadows matching the product.
7. Maintain identical background, lighting, and photography style.

Output the final image maintaining the exact same dimensions and aspect ratio as the original product photo.`;
    }

    console.log("Sending request to Lovable AI Gateway...");
    console.log(`Model: ${aiModel}`);

    const response = await callAiWithTracking({
      userId: user.id,
      functionName: "generate-mockup",
      model: aiModel,
      apiKey: LOVABLE_API_KEY,
      requestBody: {
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: productImageUrl } },
              { type: "image_url", image_url: { url: logoImageSrc } },
            ]
          }
        ],
        modalities: ["image", "text"]
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI Gateway response received");

    const generatedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImage) {
      console.error("No image in response:", JSON.stringify(data));
      throw new Error("No image generated in response");
    }

    console.log("Mockup generated successfully");

    return new Response(
      JSON.stringify({ 
        mockupUrl: generatedImage,
        message: data.choices?.[0]?.message?.content || "Mockup generated successfully"
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
    console.error("Error generating mockup:", error);
    const message = error instanceof Error ? error.message : "Failed to generate mockup";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

```

---

## `voice-agent`

**Path:** `supabase/functions/voice-agent/index.ts` (121 linhas)

**verify_jwt:** `false` (system default — validação in-code)

**Source completa:**

```typescript
import { getCorsHeaders } from '../_shared/cors.ts';
import { authenticateRequest, authErrorResponse } from '../_shared/auth.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { callAiWithTracking, QuotaExceededError } from '../_shared/ai-usage.ts';
import { SYSTEM_PROMPT, VOICE_COMMAND_TOOL, TOOL_CHOICE } from './systemPrompt.ts';
import { parseAiResponse } from './parseAiResponse.ts';
import { runBotProtection } from '../_shared/bot-protection.ts';

const TranscriptSchema = z.object({
  transcript: z.string().min(1, 'transcript cannot be empty').max(1000, 'transcript too long'),
});

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    let authUserId: string;
    try {
      const authResult = await authenticateRequest(req);
      authUserId = authResult.userId;
    } catch (authErr) {
      return authErrorResponse(authErr, corsHeaders);
    }

    const protection = await runBotProtection(req, {
      endpoint: 'voice-agent',
      maxRequests: 30,
      windowSeconds: 60,
      blockSeconds: 1800,
      customIdentifier: `user:${authUserId}`,
    }, corsHeaders);
    if (!protection.allowed) return protection.blockResponse!;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parsed = TranscriptSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { transcript } = parsed.data;

    const response = await callAiWithTracking({
      userId: authUserId,
      functionName: "voice-agent",
      model: 'google/gemini-3-flash-preview',
      apiKey: LOVABLE_API_KEY,
      requestBody: {
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: transcript },
        ],
        tools: [VOICE_COMMAND_TOOL],
        tool_choice: TOOL_CHOICE,
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errText = await response.text();
      console.error('AI gateway error:', response.status, errText);
      return new Response(
        JSON.stringify({ error: 'AI processing failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await response.json();
    const result = parseAiResponse(aiData);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    if (error instanceof QuotaExceededError) {
      return new Response(
        JSON.stringify({ error: 'Limite mensal de IA atingido.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.error('Voice agent error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

```

---

## `bi-copilot`

**Path:** `supabase/functions/bi-copilot/index.ts` (112 linhas)

**verify_jwt:** `false` (system default — validação in-code)

**Source completa:**

```typescript
import { getCorsHeaders } from "../_shared/cors.ts";
/**
 * Edge function `bi-copilot` — responde perguntas do vendedor sobre um cliente
 * com base no contexto BI (score, sazonalidade, afinidade, tendências, benchmarks).
 *
 * Chama Lovable AI Gateway (gemini-2.5-flash) — nada de credencial extra.
 */
// deno-lint-ignore-file no-explicit-any

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const MODEL = "google/gemini-2.5-flash";

interface RequestBody {
  question: string;
  context: Record<string, any>;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY ausente — habilite Lovable AI." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json()) as RequestBody;
    if (!body.question || body.question.length > 500) {
      return new Response(JSON.stringify({ error: "Pergunta inválida." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Você é um copiloto de Business Intelligence comercial para vendedores B2B de brindes corporativos.
Você analisa dados reais de UM cliente específico e responde perguntas estratégicas com clareza, brevidade e ação.

REGRAS:
- Responda em português brasileiro, tom consultivo direto.
- Máximo 4 frases curtas. Sem listas longas.
- Sempre baseie a resposta nos dados do CONTEXTO. Se faltar dado, diga "não tenho esse dado, mas posso dizer que...".
- Termine com uma SUGESTÃO DE AÇÃO acionável (ligar, enviar amostra, agendar, etc.).
- Use números reais do contexto. Não invente.
- Não use jargão; fale como vendedor sênior orientando colega.

CONTEXTO DO CLIENTE:
${JSON.stringify(body.context, null, 2)}`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...(body.history ?? []).map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: body.question },
    ];

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.4,
        max_tokens: 400,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Tente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados — adicione fundos no Lovable AI." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ error: "Erro no provedor de IA." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResponse.json();
    const answer = data?.choices?.[0]?.message?.content?.trim() ?? "Não consegui formular resposta.";

    return new Response(JSON.stringify({ answer }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bi-copilot error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

```

---

## `webhook-dispatcher`

**Path:** `supabase/functions/webhook-dispatcher/index.ts` (256 linhas)

**verify_jwt:** `false` (system default — validação in-code)

**Source completa:**

```typescript
// webhook-dispatcher: dispatches an event to all active outbound_webhooks
// subscribed to that event. HMAC signs payload with webhook secret. Retries
// with backoff and logs each attempt to webhook_deliveries.
// Called publicly from DB triggers (no JWT) — but only acts on events
// declared in outbound_webhooks rows that the admin created.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { crypto } from "https://deno.land/std@0.224.0/crypto/mod.ts";
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { buildPublicCorsHeaders } from "../_shared/cors.ts";

const corsHeaders = buildPublicCorsHeaders({ allowMethods: "POST, OPTIONS" });

const BodySchema = z.object({
  event: z.string().min(1),
  payload: z.unknown().optional(),
  // Replay mode: re-deliver a single failed delivery by id
  replay_delivery_id: z.string().uuid().optional(),
  // Test mode (Onda 13 #9): dispatch to a specific webhook, no metrics, no breaker, no DB log
  test_mode: z.boolean().optional(),
  test_webhook_id: z.string().uuid().optional(),
});

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: "Invalid body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    let { event, payload } = parsed.data;
    const { replay_delivery_id, test_mode, test_webhook_id } = parsed.data;

    // Test mode (Onda 13 #9): single-shot, no retries, no DB write, no breaker
    if (test_mode) {
      if (!test_webhook_id) {
        return new Response(JSON.stringify({ error: "test_webhook_id obrigatório em test_mode" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: hook, error: hookErr } = await supabase
        .from("outbound_webhooks")
        .select("id, name, url, secret_ref")
        .eq("id", test_webhook_id)
        .maybeSingle();
      if (hookErr || !hook) {
        return new Response(JSON.stringify({ error: "Webhook não encontrado" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (err) {
        return new Response(JSON.stringify({
          ok: true,
          test_mode: true,
          webhook_id: hook.id,
          status_code: null,
          latency_ms: Date.now() - start,
          error: err instanceof Error ? err.message : "Erro de rede",
          success: false,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      return new Response(JSON.stringify({ ok: true, dispatched: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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

    return new Response(JSON.stringify({ ok: true, dispatched: hooks.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

```

---

