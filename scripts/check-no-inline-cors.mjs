#!/usr/bin/env node
/**
 * Inline CORS gate — bans hand-rolled `Access-Control-Allow-Headers` string
 * literals inside any edge function's `index.ts`. All edge functions MUST
 * obtain CORS headers through the SSOT helpers in `supabase/functions/_shared/cors.ts`:
 *
 *   - `getCorsHeaders(req)`         — origin-restricted (browser app)
 *   - `buildPublicCorsHeaders(...)` — wildcard (webhooks / public viewers)
 *   - `handleCorsPreflight(req, ...)` / `handleCorsPreflightIfNeeded(req)`
 *
 * Why: ad-hoc inline corsHeaders objects keep drifting out of sync (this is
 * exactly how `x-request-id` and `x-step-up-token` got missed historically).
 *
 * Exits non-zero on the first violation. The shared module itself
 * (`_shared/cors.ts`) is, of course, exempt.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const FN_DIR = "supabase/functions";
const SHARED = join(FN_DIR, "_shared");

function listFunctions() {
  return readdirSync(FN_DIR)
    .filter((n) => !n.startsWith("_") && n !== "tests")
    .map((name) => ({ name, path: join(FN_DIR, name, "index.ts") }))
    .filter(({ path }) => {
      try { return existsSync(path) && statSync(path).isFile(); } catch { return false; }
    });
}

const violations = [];
for (const { name, path } of listFunctions()) {
  const src = readFileSync(path, "utf8");
  // String literal containing the header name → inline declaration.
  if (/["'`]Access-Control-Allow-Headers["'`]/i.test(src)) {
    violations.push(`${name}: declares "Access-Control-Allow-Headers" inline. Use buildPublicCorsHeaders() or getCorsHeaders(req) from "../_shared/cors.ts".`);
  }
}

if (violations.length > 0) {
  console.error(`❌ Inline CORS gate failed (${violations.length} violation${violations.length === 1 ? "" : "s"}):`);
  for (const v of violations) console.error(`  • ${v}`);
  console.error(`\nFix:\n  1. Replace the inline corsHeaders object with:\n       const corsHeaders = buildPublicCorsHeaders({ extraAllowHeaders?: [...], allowMethods?: "..." });\n  2. Add the import:\n       import { buildPublicCorsHeaders } from "../_shared/cors.ts";\n`);
  process.exit(1);
}

console.log(`✅ No inline CORS literals — every edge function uses the SSOT helpers.`);
