// =============================================================================
// AI Router — Bridge OpenAI-style ↔ Unified
// Permite que callers legados (callAiWithTracking, edges que constroem
// requestBody no formato OpenAI) usem o novo router sem mudanças invasivas.
// =============================================================================

import { callAiForFunction, type RouterCallResult } from "./index.ts";
import type { UnifiedMessage, UnifiedRequest } from "./types.ts";

/** Converte um requestBody no formato OpenAI/chat-completions para UnifiedRequest. */
export function openaiBodyToUnified(body: Record<string, unknown>): UnifiedRequest {
  // messages: já são compatíveis (string content ou parts com type:text/image_url)
  const messages = (body.messages ?? []) as UnifiedMessage[];
  const out: UnifiedRequest = { messages };

  if (typeof body.temperature === "number") out.temperature = body.temperature;
  if (typeof body.max_tokens === "number") out.max_tokens = body.max_tokens;
  if (typeof body.stream === "boolean") out.stream = body.stream;
  if (Array.isArray(body.modalities)) out.modalities = body.modalities as ("text" | "image")[];
  if (Array.isArray(body.tools)) out.tools = body.tools as Record<string, unknown>[];

  // response_format with json_schema → request.json_schema
  const rf = body.response_format as { type?: string; json_schema?: Record<string, unknown> } | undefined;
  if (rf?.type === "json_schema" && rf.json_schema) out.json_schema = rf.json_schema;

  return out;
}

/**
 * Converte um RouterCallResult em uma Response HTTP no formato OpenAI
 * `/chat/completions`, mantendo compat com callers que fazem
 * `await response.json()` e leem `body.choices[0].message.content` /
 * `body.usage.prompt_tokens`.
 */
export function unifiedToOpenaiResponse(result: RouterCallResult): Response {
  const message: Record<string, unknown> = {
    role: "assistant",
    content: result.content,
  };

  if (result.images && result.images.length > 0) {
    // Lovable-style images array — alguns callers leem isso
    message.images = result.images.map((url) => ({ image_url: { url } }));
  }

  if (result.tool_calls && result.tool_calls.length > 0) {
    message.tool_calls = result.tool_calls.map((tc, i) => ({
      id: `call_${i}`,
      type: "function",
      function: {
        name: tc.name,
        arguments: JSON.stringify(tc.arguments),
      },
    }));
  }

  const body = {
    id: `router-${Date.now()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: `${result.used_provider_slug}/${result.used_model_name}`,
    choices: [
      {
        index: 0,
        message,
        finish_reason: result.finish_reason ?? "stop",
      },
    ],
    usage: {
      prompt_tokens: result.usage.input_tokens,
      completion_tokens: result.usage.output_tokens,
      total_tokens: result.usage.input_tokens + result.usage.output_tokens,
      // Custom fields para o caller saber o routing — sufixo _x_router
      _x_router_used_model: result.used_model_name,
      _x_router_used_provider: result.used_provider_slug,
      _x_router_attempts: result.attempts,
      _x_router_fallback_used: result.fallback_used,
      _x_router_total_duration_ms: result.total_duration_ms,
    },
  };

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "X-Router-Used-Provider": result.used_provider_slug,
      "X-Router-Used-Model": result.used_model_name,
      "X-Router-Attempts": String(result.attempts),
      "X-Router-Fallback-Used": String(result.fallback_used),
    },
  });
}

/**
 * Wrapper one-shot: recebe um requestBody OpenAI-style e devolve uma Response
 * OpenAI-compatible já passando pelo router multi-provider.
 *
 * Use isto em `callAiWithTracking` para o cutover sem mudar a interface.
 */
export async function callOpenAiViaRouter(args: {
  functionName: string;
  userId: string;
  requestBody: Record<string, unknown>;
  skipQuota?: boolean;
  requestId?: string;
}): Promise<{ response: Response; result: RouterCallResult }> {
  const unified = openaiBodyToUnified(args.requestBody);
  const result = await callAiForFunction({
    functionName: args.functionName,
    userId: args.userId,
    request: unified,
    skipQuota: args.skipQuota,
    requestId: args.requestId,
  });
  return { response: unifiedToOpenaiResponse(result), result };
}
