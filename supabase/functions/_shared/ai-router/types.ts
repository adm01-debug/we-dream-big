// =============================================================================
// AI Router — tipos unificados (formato neutro entre providers)
// Importado por todos os adapters em ai-router/<provider>.ts e pelo index.ts
// =============================================================================

export type ApiFormat = "openai_compatible" | "anthropic_native" | "google_native" | "custom";

export type ErrorKind =
  | "timeout"
  | "network"
  | "auth"
  | "rate_limit"
  | "server"
  | "client"
  | "parse"
  | "missing_credential"
  | "unknown";

export interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

export interface UnifiedMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface UnifiedRequest {
  messages: UnifiedMessage[];
  modalities?: ("text" | "image")[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  json_schema?: Record<string, unknown>;
  tools?: Record<string, unknown>[];
  // Allow extra fields to pass through (provider-specific overrides)
  [key: string]: unknown;
}

export interface UnifiedResponse {
  content: string;
  images?: string[];
  tool_calls?: ToolCall[];
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  finish_reason?: string;
  /** Original provider response, kept for debugging and observability. */
  raw: unknown;
}

export interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  authHeader: string;
  /** Template like "Bearer {key}" or just "{key}". */
  authFormat: string;
  apiFormat: ApiFormat;
  timeoutMs: number;
  extraHeaders?: Record<string, string>;
}

export interface AdapterCallOpts {
  provider: ProviderConfig;
  /** Model id specific to the provider (e.g. "claude-sonnet-4-6", "gpt-5-mini"). */
  model: string;
  request: UnifiedRequest;
}

export interface Adapter {
  call(opts: AdapterCallOpts): Promise<UnifiedResponse>;
}

/**
 * Structured error thrown by adapters. The router uses `retryable` to decide
 * whether to fall back to the next candidate model.
 */
export class AdapterError extends Error {
  status?: number;
  retryable: boolean;
  errorKind: ErrorKind;
  raw?: unknown;

  constructor(
    message: string,
    opts: { status?: number; retryable?: boolean; errorKind?: ErrorKind; raw?: unknown } = {},
  ) {
    super(message);
    this.name = "AdapterError";
    this.status = opts.status;
    this.retryable = opts.retryable ?? false;
    this.errorKind = opts.errorKind ?? "unknown";
    this.raw = opts.raw;
  }
}
