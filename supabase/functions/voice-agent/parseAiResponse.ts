/**
 * Parses the AI gateway response into a structured voice command result.
 */

interface VoiceCommandResult {
  action: string;
  response: string;
  data?: Record<string, unknown>;
}

const FALLBACK_RESULT: VoiceCommandResult = {
  action: 'answer',
  response: 'Desculpe, não entendi. Pode repetir?',
  data: {},
};

export function parseAiResponse(aiData: Record<string, unknown>): VoiceCommandResult {
  const choices = aiData.choices as Array<{
    message?: {
      tool_calls?: Array<{ function?: { arguments?: string } }>;
      content?: string;
    };
  }> | undefined;

  const message = choices?.[0]?.message;
  if (!message) return FALLBACK_RESULT;

  // 1. Try tool call arguments
  const toolCall = message.tool_calls?.[0];
  if (toolCall?.function?.arguments) {
    try {
      const result = JSON.parse(toolCall.function.arguments) as VoiceCommandResult;
      return validateResult(result);
    } catch {
      return FALLBACK_RESULT;
    }
  }

  // 2. Fallback: parse content as JSON
  const content = message.content || '';
  try {
    const result = JSON.parse(content) as VoiceCommandResult;
    return validateResult(result);
  } catch {
    return {
      action: 'answer',
      response: content || 'Desculpe, não entendi.',
      data: {},
    };
  }
}

function validateResult(result: VoiceCommandResult): VoiceCommandResult {
  if (!result.action || !result.response) {
    return {
      action: 'answer',
      response: result.response || 'Desculpe, ocorreu um erro.',
      data: result.data || {},
    };
  }
  return result;
}
