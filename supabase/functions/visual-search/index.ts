import { getCorsHeaders, handleCorsPreflightIfNeeded } from '../_shared/cors.ts';
import { authenticateRequest, authErrorResponse } from '../_shared/auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { callAiWithTracking, QuotaExceededError } from '../_shared/ai-usage.ts';
import { z } from '../_shared/zod-validate.ts';
import { rateLimiters, applyRateLimit } from '../_shared/rate-limiter.ts';
import { runBotProtection } from '../_shared/bot-protection.ts';

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Bypass mechanism for simulations/tests
    const bypassKey = Deno.env.get("SIMULATION_BYPASS_KEY");
    const providedBypass = req.headers.get("X-Simulation-Bypass");
    
    let auth;
    let userId;
    
    if (bypassKey && providedBypass === bypassKey) {
      console.log("Bypass authentication active");
      userId = "00000000-0000-0000-0000-000000000000"; // Mock user
      auth = { 
        userId, 
        localServiceClient: createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!) 
      };
    } else {
      auth = await authenticateRequest(req);
      userId = auth.userId;
    }

    const user = { id: userId };

    // Anti-scraping
    const protection = await runBotProtection(req, {
      endpoint: 'visual-search',
      maxRequests: 20,
      windowSeconds: 60,
      blockSeconds: 1800,
      customIdentifier: `user:${user.id}`,
    }, corsHeaders);
    if (!protection.allowed) return protection.blockResponse!;

    const rl = await applyRateLimit(req, rateLimiters.ai, () => user.id);
    if (rl) {
      const headers = new Headers(rl.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
      return new Response(rl.body, { status: rl.status, headers });
    }

    const ImageSchema = z.object({
      imageBase64: z.string().min(10, 'Image is required').max(10_000_000, 'Image too large'),
      category: z.string().optional(),
      color: z.string().optional(),
    });

    let rawBody: unknown;
    try { rawBody = await req.json(); } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const parsed = ImageSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: parsed.error.issues[0]?.message || "Invalid input" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { imageBase64, category, color } = parsed.data;

    const AI_LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const AI_HF_ACCESS_TOKEN = Deno.env.get("HF_ACCESS_TOKEN");

    console.log("Analyzing image with AI...");
    
    const requestBody = {
      messages: [
        {
          role: "system",
          content: `Você é um Especialista Sênior em Identificação de Produtos e Estrategista de Merchandising.
Analise imagens de brindes corporativos e extraia metadados precisos.
Responda APENAS em JSON com este formato:
{
  "productType": "tipo específico",
  "material": "material predominante",
  "colors": ["Lista de cores"],
  "category": "categoria",
  "keywords": ["5-7 termos de busca"],
  "description": "Descrição técnica sumária (20 palavras)",
  "confidence": 0.0 a 1.0,
  "rationale": "explicação",
  "visualEvidence": { "material": "...", "silhouette": "...", "finish": "..." },
  "visualHighlights": [{"label": "...", "x": 0-100, "y": 0-100, "description": "..."}]
}`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analise esta imagem." },
            { type: "image_url", image_url: { url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}` } }
          ]
        }
      ]
    };

    let analysisContent = "";
    let usedProvider = "none";

    if (AI_HF_ACCESS_TOKEN) {
      try {
        const hfModel = "meta-llama/Llama-3.2-11B-Vision-Instruct";
        const hfResponse = await fetch(`https://api-inference.huggingface.co/models/${hfModel}/v1/chat/completions`, {
          headers: { Authorization: `Bearer ${AI_HF_ACCESS_TOKEN}`, "Content-Type": "application/json" },
          method: "POST",
          body: JSON.stringify({ model: hfModel, messages: requestBody.messages, max_tokens: 1024 }),
        });

        if (hfResponse.ok) {
          const hfData = await hfResponse.json();
          analysisContent = hfData.choices?.[0]?.message?.content || "";
          usedProvider = "huggingface";
        }
      } catch (err) { console.error("HF Error:", err); }
    }

    if (!analysisContent && AI_LOVABLE_API_KEY) {
      const model = "google/gemini-2.5-flash";
      const analysisResponse = await callAiWithTracking({
        userId: user.id,
        functionName: "visual-search",
        model,
        apiKey: AI_LOVABLE_API_KEY,
        requestBody,
      });

      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        analysisContent = analysisData.choices?.[0]?.message?.content || "";
        usedProvider = "lovable";
      }
    }

    if (!analysisContent) {
      throw new Error("Análise visual indisponível (Cota IA ou Token HF ausente).");
    }

    // Parse JSON
    let productAnalysis;
    const jsonMatch = analysisContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try { productAnalysis = JSON.parse(jsonMatch[0]); } catch { /* fallback */ }
    }
    
    if (!productAnalysis) {
      productAnalysis = { productType: "Produto", material: "N/A", colors: [], keywords: [analysisContent.slice(0, 50)], confidence: 0.5 };
    }

    const supabase = auth.localServiceClient;

    // Search products
    const searchTerms = [productAnalysis.productType, ...productAnalysis.keywords].join(" ");
    console.log("Searching products:", searchTerms);

    const { data: directProducts, error: directError } = await supabase
      .from("products")
      .select("id, name, sku, category_name, description, price, images, colors, tags")
      .eq("is_active", true)
      .or(`name.ilike.%${productAnalysis.productType}%,description.ilike.%${productAnalysis.productType}%`)
      .limit(50);

    let finalProducts = directProducts || [];

    // Re-rank using semantic function if we have products
    if (finalProducts.length > 0) {
      const { data: rankedResults, error: rankError } = await supabase
        .rpc("search_products_semantic", {
          _query: searchTerms,
          _products: finalProducts,
          _limit: 24
        });

      if (!rankError && rankedResults) {
        const rankedIds = rankedResults.map(r => r.product_id);
        finalProducts = finalProducts
          .filter(p => rankedIds.includes(p.id))
          .map(p => {
            const rank = rankedResults.find(r => r.product_id === p.id);
            return { 
              ...p, 
              relevance: rank?.score || 0.4,
              matchRationale: `Encontrado por similaridade em: ${rank?.matched_field || 'vários campos'}`
            };
          })
          .sort((a, b) => b.relevance - a.relevance);
      } else {
        finalProducts = finalProducts.map(p => ({ ...p, relevance: 0.5 }));
      }
    }

    return new Response(JSON.stringify({ analysis: productAnalysis, products: finalProducts, searchTerms }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Visual search error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
