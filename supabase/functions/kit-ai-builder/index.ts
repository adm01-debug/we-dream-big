import { getCorsHeaders } from "../_shared/cors.ts";
import { safeErrorResponse } from "../_shared/error-response.ts";
import { authenticateRequest, requireRole, authErrorResponse } from "../_shared/auth.ts";
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
  // Auth: exige vendedor autenticado (agente ou acima)
  try {
    const authCtx = await authenticateRequest(req);
    requireRole(authCtx, "agente");
  } catch (authErr) {
    return authErrorResponse(authErr, corsHeaders);
  }


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
    return safeErrorResponse(e, { corsHeaders, publicMessage: 'internal_error', logLabel: 'kit-ai-builder error:' });
  }
});
