/**
 * Centralized JSON parsing utilities for Edge Functions.
 * Handles AI response extraction and safe request body parsing.
 */

/**
 * Robustly extract & parse JSON from an LLM response.
 * Handles markdown fences, prose around JSON, trailing commas, and minor
 * truncation (auto-closes one missing `]` or `}` at the end).
 */
export function extractAndParseAIJSON(raw: string): unknown {
  let s = String(raw ?? "").trim();

  // Strip markdown fences
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  // Slice from first { or [ to last matching } or ]
  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  const start =
    firstObj === -1 ? firstArr :
    firstArr === -1 ? firstObj :
    Math.min(firstObj, firstArr);
    
  if (start === -1) throw new Error("No JSON object/array found in AI response");
  
  const isArray = s[start] === "[";
  const end = isArray ? s.lastIndexOf("]") : s.lastIndexOf("}");
  s = end > start ? s.slice(start, end + 1) : s.slice(start);

  // Remove trailing commas before } or ]
  const cleaned = s.replace(/,(\s*[}\]])/g, "$1");

  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    // Last-resort: auto-close one missing bracket if truncated
    const opens = (cleaned.match(/[{[]/g) || []).length;
    const closes = (cleaned.match(/[}\]]/g) || []).length;
    if (opens > closes) {
      const patched = cleaned + (isArray ? "]" : "}");
      try { return JSON.parse(patched); } catch { /* fall through */ }
    }
    console.error("[json-parser] AI JSON parse failed. Snippet:", cleaned.slice(0, 500));
    throw e1;
  }
}

/**
 * Safely parse request body JSON.
 * Returns null if body is empty or malformed.
 */
export async function safeJson(req: Request): Promise<unknown | null> {
  try {
    const text = await req.text();
    if (!text || text.trim() === "") return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}
