#!/usr/bin/env node
/**
 * check-route-error-element.mjs
 *
 * Falha o CI quando aparecerem APIs do **data router** do react-router-dom
 * em arquivos que rodam sob o modo declarativo (BrowserRouter + Routes).
 *
 * Regras aplicadas hoje:
 *
 *   1. `errorElement={...}` em `<Route>` declarativo
 *      → silenciosamente ignorado pelo React Router 6 fora de
 *        `createBrowserRouter` + `RouterProvider`. Vira dead code que
 *        dá falsa sensação de robustez.
 *
 *   2. `useRouteError()` chamado em componente que não está sob um data
 *      router. Fora desse contexto o hook lança em runtime
 *      (`useRouteError must be used within a data router`) — mas só
 *      quando o erro acontece, então a regressão passa despercebida em
 *      desenvolvimento. Este checker captura no CI.
 *
 * Em ambos os casos o boundary canônico é `EnhancedErrorBoundary`
 * (instalado em `src/main.tsx`).
 *
 * Allowlist comum a todas as regras:
 *   - arquivos que usem `createBrowserRouter` / `createMemoryRouter` /
 *     `createHashRouter` / `RouterProvider` — são data routers de fato e
 *     todas as APIs acima passam a ser válidas;
 *   - linha (ou linha imediatamente acima) anotada com
 *     `// route-error-allow: <razão>`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const IGNORE_DIR = new Set(["node_modules", "dist", "build", "__tests__"]);
const IGNORE_FILE_SUFFIX = [".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx"];

const RE_DATA_ROUTER =
  /\b(createBrowserRouter|createMemoryRouter|createHashRouter|RouterProvider)\b/;
const RE_ALLOW = /\/\/\s*route-error-allow\s*:\s*\S+/;

/**
 * Definição extensível de regras. Cada regra:
 *  - `id`: identificador estável (aparece no relatório).
 *  - `pattern`: regex aplicada por linha (e como pré-filtro de arquivo).
 *  - `message`: explicação humana usada no relatório de violação.
 */
const RULES = [
  {
    id: "errorElement-in-declarative-routes",
    label: "errorElement em <Routes> declarativo",
    pattern: /\berrorElement\s*=\s*\{/,
    message:
      "O prop `errorElement` só é honrado em data routers " +
      "(createBrowserRouter + RouterProvider). " +
      "Em <BrowserRouter>+<Routes> declarativo é dead code — o React " +
      "Router o ignora silenciosamente.\n" +
      "Solução: remova o `errorElement` (o EnhancedErrorBoundary global " +
      "em src/main.tsx já cobre).",
  },
  {
    id: "useRouteError-outside-data-router",
    label: "useRouteError() fora de data router",
    // Captura tanto `useRouteError(` quanto `useRouteError ` em alias/import
    // referenciado depois (`const err = useRouteError();`).
    pattern: /\buseRouteError\s*\(/,
    message:
      "O hook `useRouteError()` só funciona dentro de um data router " +
      "(createBrowserRouter + RouterProvider). Em <BrowserRouter> + " +
      "<Routes> declarativo ele lança em runtime quando um erro ocorre — " +
      "regressão silenciosa em dev, ruído em produção.\n" +
      "Solução: substitua por um Error Boundary tradicional " +
      "(EnhancedErrorBoundary com prop `fallback` ou capturando o erro " +
      "via componentDidCatch). Se for parte de uma migração futura para " +
      "data router, anote com // route-error-allow: <razão>.",
  },
];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIR.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

function isAllowed(lines, idx) {
  if (RE_ALLOW.test(lines[idx])) return true;
  if (idx > 0 && RE_ALLOW.test(lines[idx - 1])) return true;
  return false;
}

const violations = [];
for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  if (IGNORE_FILE_SUFFIX.some((s) => rel.endsWith(s))) continue;
  const src = readFileSync(file, "utf8");

  // Pré-filtro: nenhuma regra dispara → pula o arquivo.
  const candidateRules = RULES.filter((r) => r.pattern.test(src));
  if (candidateRules.length === 0) continue;

  // Data router de fato → todas as APIs são válidas neste arquivo.
  if (RE_DATA_ROUTER.test(src)) continue;

  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    for (const rule of candidateRules) {
      if (!rule.pattern.test(lines[i])) continue;
      if (isAllowed(lines, i)) continue;
      violations.push({
        rule: rule.id,
        file: rel,
        line: i + 1,
        snippet: lines[i].trim(),
      });
    }
  }
}

const asJson = process.argv.includes("--json");
if (asJson) {
  console.log(
    JSON.stringify(
      {
        ok: violations.length === 0,
        rules: RULES.map((r) => ({ id: r.id, label: r.label })),
        violations,
      },
      null,
      2,
    ),
  );
} else if (violations.length === 0) {
  console.log(
    "✅ route-error-element check passed — nenhuma API de data router em <Routes> declarativo.",
  );
  console.log(
    `   Regras ativas: ${RULES.map((r) => r.id).join(", ")}`,
  );
} else {
  console.error(
    `❌ route-error-element check falhou — ${violations.length} ocorrência(s):\n`,
  );
  // Agrupa por regra para o relatório ficar legível.
  const byRule = new Map();
  for (const v of violations) {
    if (!byRule.has(v.rule)) byRule.set(v.rule, []);
    byRule.get(v.rule).push(v);
  }
  for (const [ruleId, items] of byRule) {
    const rule = RULES.find((r) => r.id === ruleId);
    console.error(`  ▸ [${ruleId}] ${rule?.label ?? ""} (${items.length}):`);
    for (const v of items) {
      console.error(`      • ${v.file}:${v.line}\n          ${v.snippet}`);
    }
    if (rule) console.error(`\n      ${rule.message.replace(/\n/g, "\n      ")}\n`);
  }
  console.error(
    "Allowlist por linha: anote com // route-error-allow: <razão>\n",
  );
}
process.exit(violations.length === 0 ? 0 : 1);
