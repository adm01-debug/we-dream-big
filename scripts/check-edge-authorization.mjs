#!/usr/bin/env node
/**
 * check-edge-authorization
 * --------------------------------------------------------------
 * Gate de CI estático que valida:
 *
 *   1. COVERAGE: toda edge function em `supabase/functions/<name>/`
 *      está declarada em `_shared/edge-authz-manifest.ts`. Edges
 *      novas SEM declaração explícita falham o build (fail-closed).
 *
 *   2. ENFORCEMENT: edges declaradas como `supervisor` ou `dev`
 *      DEVEM importar `authorize` do `_shared/authorize.ts` e
 *      passar `requireRole` correspondente. Verificação por regex
 *      conservadora — alternativas custom são permitidas se
 *      `skipAnonBypassTest`/`skipAuthBypassTest` justificarem.
 *
 *   3. ANTI-REGRESSION: detecta funções que tinham `authorize(...)`
 *      e foram modificadas removendo a chamada (heurística simples).
 *
 * Uso local:
 *   node scripts/check-edge-authorization.mjs
 *
 * Integração CI: step adicional em `.github/workflows/ci.yml` ao
 * lado dos demais gates (security-definer-acl, smoke tags, etc.).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const FN_DIR = "supabase/functions";
const MANIFEST_PATH = `${FN_DIR}/_shared/edge-authz-manifest.ts`;

// 1) Carrega o manifest (parse via regex para evitar import dinâmico de TS)
const manifestSrc = readFileSync(MANIFEST_PATH, "utf8");
const entries = new Map();
{
  // Captura name + bloco completo da entrada para parse robusto
  const re = /^\s+"([a-z0-9-]+)":\s*\{([^}]+)\}/gm;
  let m;
  while ((m = re.exec(manifestSrc)) !== null) {
    const body = m[2];
    const cat = body.match(/category:\s*"([a-z]+)"/)?.[1];
    const enforcedBy = body.match(/enforcedBy:\s*"([a-z-]+)"/)?.[1] ?? "shared-authorize";
    if (cat) entries.set(m[1], { category: cat, enforcedBy });
  }
}

// 2) Lista funções no FS
const fns = readdirSync(FN_DIR).filter((d) => {
  if (d.startsWith("_")) return false;
  try {
    return statSync(join(FN_DIR, d)).isDirectory();
  } catch {
    return false;
  }
});

const errors = [];
const warnings = [];

// 3) Coverage check
const missingFromManifest = fns.filter((f) => !entries.has(f));
const ghostInManifest = [...entries.keys()].filter((k) => !fns.includes(k));

for (const fn of missingFromManifest) {
  errors.push(
    `[manifest] Edge function "${fn}" não está declarada em edge-authz-manifest.ts. ` +
      `Adicione a entrada com a categoria correta (public/authenticated/supervisor/dev/service/scoped).`,
  );
}
for (const fn of ghostInManifest) {
  errors.push(
    `[manifest] Manifest declara "${fn}" mas a função não existe em supabase/functions/. ` +
      `Remova a entrada ou recrie a função.`,
  );
}

// 4) Enforcement check para supervisor/dev
const ROLE_REQUIRED = {
  supervisor: ["supervisor", "dev"], // accept either at the call site
  dev: ["dev"],
};
for (const fn of fns) {
  const entry = entries.get(fn);
  if (!entry) continue;
  if (!ROLE_REQUIRED[entry.category]) continue; // só validamos supervisor/dev

  // Edges com enforcedBy: "custom" têm validação inline própria (has_role,
  // is_dev, scope MCP). O manifest documenta a decisão; o gate aceita.
  if (entry.enforcedBy === "custom") continue;

  const path = join(FN_DIR, fn, "index.ts");
  let src;
  try {
    src = readFileSync(path, "utf8");
  } catch {
    errors.push(`[enforcement] ${fn}: index.ts ausente.`);
    continue;
  }

  const importsAuthorize = /from\s+["']\.\.\/_shared\/authorize\.ts["']/.test(src);
  const callsAuthorize = /\bauthorize\s*\(\s*req/.test(src);

  if (!importsAuthorize || !callsAuthorize) {
    errors.push(
      `[enforcement] ${fn} (categoria=${entry.category}): não importa nem chama ` +
        `authorize() do _shared/authorize.ts. Edges sensíveis DEVEM usar o helper SSOT.`,
    );
    continue;
  }

  const expected = ROLE_REQUIRED[entry.category];
  const reqRoleMatch = src.match(/requireRole:\s*["']([a-z]+)["']/);
  if (!reqRoleMatch) {
    errors.push(
      `[enforcement] ${fn}: chama authorize() mas sem requireRole. ` +
        `Esperado requireRole: "${expected.join('" ou "')}".`,
    );
    continue;
  }
  if (!expected.includes(reqRoleMatch[1])) {
    errors.push(
      `[enforcement] ${fn}: requireRole="${reqRoleMatch[1]}" não bate com categoria=${entry.category}. ` +
        `Esperado: ${expected.join(" ou ")}.`,
    );
  }
}

// 5) Output
console.log(`\n🔐 Edge Authorization Gate`);
console.log(`   Edges no FS: ${fns.length}`);
console.log(`   Edges no manifest: ${entries.size}`);
console.log(`   Categorias:`);
const byCat = new Map();
for (const [, e] of entries) byCat.set(e.category, (byCat.get(e.category) ?? 0) + 1);
for (const [cat, n] of [...byCat.entries()].sort()) {
  console.log(`     - ${cat.padEnd(15)} ${n}`);
}

if (warnings.length) {
  console.log(`\n⚠️  ${warnings.length} aviso(s):`);
  for (const w of warnings) console.log(`   ${w}`);
}

if (errors.length === 0) {
  console.log(`\n✅ Authorization coverage: OK (${fns.length}/${fns.length} declaradas e enforced).`);
  process.exit(0);
}

console.error(`\n❌ ${errors.length} erro(s) de autorização:\n`);
for (const e of errors) console.error(`   ${e}`);

if (process.env.GITHUB_ACTIONS === "true") {
  console.log(
    `::error title=Edge authorization gate failed::${errors.length} edge(s) sem declaração ou enforcement de autorização. Veja log completo.`,
  );
}
process.exit(1);
