#!/usr/bin/env node
/**
 * Generate a static CORS snapshot for every edge function.
 *
 * Output: supabase/functions/_shared/cors-snapshot.json
 *
 * For each function in `supabase/functions/*` (excluding `_shared` and `tests`),
 * records:
 *   - name
 *   - mode: "shared" (uses _shared/cors.ts) | "inline" | "none"
 *   - allowHeaders: lowercased token list (when extractable)
 *   - exposeHeaders: lowercased token list (when extractable)
 *   - allowMethods: literal value (when extractable)
 *   - allowOrigin: literal value (when extractable, often "*" for inline)
 *
 * The runtime endpoint `cors-audit` serves this JSON + the live shared config
 * from CORS_INTROSPECTION so the admin can audit at a glance which functions
 * accept which custom headers.
 *
 * Re-run after editing any inline-CORS function or adding a new edge function.
 * CI step "🌐 Edge CORS x-request-id gate" implicitly validates the data this
 * snapshot depends on.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const FUNCTIONS_DIR = "supabase/functions";
const SNAPSHOT_PATH = join(FUNCTIONS_DIR, "_shared", "cors-snapshot.json");

function listFunctions() {
  return readdirSync(FUNCTIONS_DIR)
    .filter((n) => !n.startsWith("_") && n !== "tests")
    .map((name) => ({ name, dir: join(FUNCTIONS_DIR, name) }))
    .filter(({ dir }) => {
      try { return statSync(dir).isDirectory(); } catch { return false; }
    })
    .filter(({ dir }) => existsSync(join(dir, "index.ts")));
}

function tokenizeList(value) {
  return value
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

function extractCorsLiterals(src) {
  const findAll = (header) => {
    // header: e.g. 'access-control-allow-headers'
    const re = new RegExp(`${header}["'\\s:=,]+["'\\\`]([^"'\\\`]+)["'\\\`]`, "gi");
    const out = [];
    for (const m of src.matchAll(re)) out.push(m[1]);
    return out;
  };

  const allow = findAll("access-control-allow-headers");
  const expose = findAll("access-control-expose-headers");
  const methods = findAll("access-control-allow-methods");
  const origin = findAll("access-control-allow-origin");

  // Merge every occurrence (some files declare CORS twice — preflight + reply).
  const merge = (arr) => {
    const set = new Set();
    for (const v of arr) for (const t of tokenizeList(v)) set.add(t);
    return [...set].sort();
  };

  return {
    allowHeaders: merge(allow),
    exposeHeaders: merge(expose),
    allowMethods: methods[0] || null,
    allowOrigin: origin[0] || null,
  };
}

function classify(src) {
  if (/_shared\/cors/.test(src)) return "shared";
  if (/access-control-allow-headers/i.test(src)) return "inline";
  return "none";
}

function main() {
  const checkMode = process.argv.includes("--check");
  const fns = listFunctions();
  const items = fns
    .map(({ name, dir }) => {
      const src = readFileSync(join(dir, "index.ts"), "utf8");
      const mode = classify(src);
      const lits = mode === "inline" ? extractCorsLiterals(src) : {
        allowHeaders: [],
        exposeHeaders: [],
        allowMethods: null,
        allowOrigin: null,
      };
      return { name, mode, ...lits };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // generated_at is excluded from --check comparison so timestamp drift
  // doesn't trip CI.
  const stable = {
    total: items.length,
    counts: {
      shared: items.filter((i) => i.mode === "shared").length,
      inline: items.filter((i) => i.mode === "inline").length,
      none: items.filter((i) => i.mode === "none").length,
    },
    functions: items,
  };

  if (checkMode) {
    if (!existsSync(SNAPSHOT_PATH)) {
      console.error(`❌ ${SNAPSHOT_PATH} missing. Run: npm run build:cors-snapshot`);
      process.exit(1);
    }
    const current = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
    const stableCurrent = { total: current.total, counts: current.counts, functions: current.functions };
    if (JSON.stringify(stableCurrent) !== JSON.stringify(stable)) {
      console.error(`❌ ${SNAPSHOT_PATH} is stale. Run: npm run build:cors-snapshot`);
      process.exit(1);
    }
    console.log(`✅ ${SNAPSHOT_PATH} up-to-date (${stable.total} functions)`);
    return;
  }

  const snapshot = { generated_at: new Date().toISOString(), ...stable };
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n");
  console.log(`✅ wrote ${SNAPSHOT_PATH}`);
  console.log(`   total=${snapshot.total} shared=${snapshot.counts.shared} inline=${snapshot.counts.inline} none=${snapshot.counts.none}`);
}

main();
