/**
 * Tests for parseAiResponse module extracted from voice-agent edge function.
 */
import { describe, it, expect } from "vitest";

// Since parseAiResponse lives in Deno edge function, we replicate its logic for testing.
// This validates the contract of the response parser.

interface VoiceCommandResult {
  action: string;
  response: string;
  data?: Record<string, unknown>;
}

function parseAiResponse(aiData: Record<string, unknown>): VoiceCommandResult {
  const FALLBACK = { action: "answer", response: "Desculpe, não entendi. Pode repetir?", data: {} };
  const choices = aiData.choices as Array<{
    message?: {
      tool_calls?: Array<{ function?: { arguments?: string } }>;
      content?: string;
    };
  }> | undefined;
  const message = choices?.[0]?.message;
  if (!message) return FALLBACK;

  const toolCall = message.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try {
      const result = JSON.parse(toolCall.function.arguments) as VoiceCommandResult;
      if (!result.action || !result.response) {
        return { action: "answer", response: result.response || "Desculpe, ocorreu um erro.", data: result.data || {} };
      }
      return result;
    } catch {
      return FALLBACK;
    }
  }

  const content = message.content || "";
  try {
    const result = JSON.parse(content) as VoiceCommandResult;
    if (!result.action || !result.response) {
      return { action: "answer", response: result.response || "Desculpe, ocorreu um erro.", data: result.data || {} };
    }
    return result;
  } catch {
    return { action: "answer", response: content || "Desculpe, não entendi.", data: {} };
  }
}

describe("parseAiResponse", () => {
  it("parses tool call arguments correctly", () => {
    const aiData = {
      choices: [{
        message: {
          tool_calls: [{
            function: {
              arguments: JSON.stringify({
                action: "search",
                response: "Buscando canetas",
                data: { query: "canetas" },
              }),
            },
          }],
        },
      }],
    };
    const result = parseAiResponse(aiData);
    expect(result.action).toBe("search");
    expect(result.response).toBe("Buscando canetas");
    expect(result.data).toEqual({ query: "canetas" });
  });

  it("falls back to content parsing when no tool calls", () => {
    const aiData = {
      choices: [{
        message: {
          content: JSON.stringify({
            action: "navigate",
            response: "Indo para orçamentos",
            data: { route: "/orcamentos" },
          }),
        },
      }],
    };
    const result = parseAiResponse(aiData);
    expect(result.action).toBe("navigate");
    expect(result.data).toEqual({ route: "/orcamentos" });
  });

  it("returns fallback for invalid JSON in tool call args", () => {
    const aiData = {
      choices: [{
        message: {
          tool_calls: [{
            function: { arguments: "not json" },
          }],
        },
      }],
    };
    const result = parseAiResponse(aiData);
    expect(result.action).toBe("answer");
    expect(result.response).toContain("não entendi");
  });

  it("returns fallback when choices are empty", () => {
    const result = parseAiResponse({ choices: [] });
    expect(result.action).toBe("answer");
  });

  it("returns fallback when no choices key", () => {
    const result = parseAiResponse({});
    expect(result.action).toBe("answer");
  });

  it("uses plain content when content is not JSON", () => {
    const aiData = {
      choices: [{
        message: {
          content: "Olá, como posso ajudar?",
        },
      }],
    };
    const result = parseAiResponse(aiData);
    expect(result.action).toBe("answer");
    expect(result.response).toBe("Olá, como posso ajudar?");
  });

  it("validates missing action field", () => {
    const aiData = {
      choices: [{
        message: {
          tool_calls: [{
            function: {
              arguments: JSON.stringify({ response: "Algo" }),
            },
          }],
        },
      }],
    };
    const result = parseAiResponse(aiData);
    expect(result.action).toBe("answer");
    expect(result.response).toBe("Algo");
  });

  it("handles complex filter action", () => {
    const aiData = {
      choices: [{
        message: {
          tool_calls: [{
            function: {
              arguments: JSON.stringify({
                action: "filter",
                response: "Filtrando mochilas de bambu",
                data: {
                  filters: {
                    category: "Mochilas",
                    material: "bambu",
                    maxPrice: 50,
                    inStock: true,
                  },
                },
              }),
            },
          }],
        },
      }],
    };
    const result = parseAiResponse(aiData);
    expect(result.action).toBe("filter");
    expect((result.data as any).filters.category).toBe("Mochilas");
    expect((result.data as any).filters.maxPrice).toBe(50);
    expect((result.data as any).filters.inStock).toBe(true);
  });
});
