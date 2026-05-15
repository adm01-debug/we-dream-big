// =============================================================================
// AI Router Adapter — Anthropic native (Claude /messages API)
// Diferenças do OpenAI:
//   - System prompt vai em campo top-level "system" (não como mensagem)
//   - Content é array de blocks (text, image, tool_use, tool_result)
//   - max_tokens é OBRIGATÓRIO (default 4096 se não especificado)
//   - Header anthropic-version requerido
//   - Auth via x-api-key (sem "Bearer ")
//   - Imagens: source.type pode ser "base64" ou "url"
// =============================================================================

import type { Adapter, AdapterCallOpts, ContentPart, ToolCall, UnifiedMessage, UnifiedResponse } from "./types.ts";
import { AdapterError } from "./types.ts";

interface AnthropicBlock {
  type: "text" | "tool_use" | "image";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}

interface AnthropicResponse {
  content?: AnthropicBlock[];
  stop_reason?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { type?: string; message?: string };
}

function partsForAnthropic(content: string | ContentPart[]): unknown[] {
  if (typeof content === "string") return [{ type: "text", text: content }];
  return content.map((part) => {
    if (part.type === "text") return { type: "text", text: part.text ?? "" };
    if (part.type === "image_url") {
      const url = part.image_url?.url ?? "";
      const m = url.match(/^data:(image\/[^;]+);base64,(.+)$/);
      if (m) return { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } };
      return { type: "image", source: { type: "url", url } };
    }
    return { type: "text", text: JSON.stringify(part) };
  });
}

function classifyHttpStatus(status: number): { retryable: boolean; kind: "auth" | "rate_limit" | "server" | "client" } {
  if (status === 401 || status === 403) return { retryable: false, kind: "auth" };
  if (status === 429) return { retryable: true, kind: "rate_limit" };
  if (status >= 500) return { retryable: true, kind: "server" };
  return { retryable: false, kind: "client" };
}

export const anthropicNativeAdapter: Adapter = {
  async call({ provider, model, request }: AdapterCallOpts): Promise<UnifiedResponse> {
    let system: string | undefined;
    const conversation: UnifiedMessage[] = [];
    for (const m of request.messages) {
      if (m.role === "system") {
        const text = typeof m.content === "string"
          ? m.content
          : (m.content as ContentPart[]).find((p) => p.type === "text")?.text ?? "";
        system = system ? `${system}\n\n${text}` : text;
      } else {
        conversation.push(m);
      }
    }

    const url = provider.baseUrl.replace(/\/+$/, "") + "/messages";
    const authValue = provider.authFormat.replace("{key}", provider.apiKey);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      [provider.authHeader]: authValue,
      ...(provider.extraHeaders ?? {}),
    };

    const body: Record<string, unknown> = {
      model,
      messages: conversation.map((m) => ({ role: m.role, content: partsForAnthropic(m.content) })),
      max_tokens: request.max_tokens ?? 4096,
    };
    if (system) body.system = system;
    if (request.temperature !== undefined) body.temperature = request.temperature;
    if (request.stream !== undefined) body.stream = request.stream;
    if (request.tools) body.tools = request.tools;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), provider.timeoutMs);

    let resp: Response;
    try {
      resp = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: ctrl.signal });
    } catch (err) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      throw new AdapterError(
        isAbort ? `Timeout após ${provider.timeoutMs}ms` : `Network: ${(err as Error).message}`,
        { retryable: true, errorKind: isAbort ? "timeout" : "network", raw: err },
      );
    } finally { clearTimeout(timer); }

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      const cls = classifyHttpStatus(resp.status);
      throw new AdapterError(`HTTP ${resp.status}: ${text.slice(0, 500)}`, {
        status: resp.status, retryable: cls.retryable, errorKind: cls.kind, raw: text,
      });
    }

    let data: AnthropicResponse;
    try { data = (await resp.json()) as AnthropicResponse; }
    catch (err) { throw new AdapterError("Invalid JSON in Anthropic response", { errorKind: "parse", raw: err }); }

    if (data.error) {
      throw new AdapterError(`Anthropic error: ${data.error.message ?? "unknown"}`, {
        retryable: false, errorKind: "client", raw: data.error,
      });
    }

    let textOut = "";
    const toolCalls: ToolCall[] = [];
    for (const block of data.content ?? []) {
      if (block.type === "text") textOut += block.text ?? "";
      else if (block.type === "tool_use") {
        toolCalls.push({ name: block.name ?? "", arguments: block.input ?? {} });
      }
    }

    return {
      content: textOut,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        input_tokens: data.usage?.input_tokens ?? 0,
        output_tokens: data.usage?.output_tokens ?? 0,
      },
      finish_reason: data.stop_reason,
      raw: data,
    };
  },
};
