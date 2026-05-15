#!/usr/bin/env node
/**
 * Gera docs/E2E_SMOKE_COVERAGE.md a partir de:
 *  - e2e/routes/_catalog.ts  (SSOT de rotas + flags `smoke`)
 *  - e2e/flows/20-all-features-smoke.spec.ts  (array SMOKE_COVERAGE)
 *
 * Saídas:
 *  - docs/E2E_SMOKE_COVERAGE.md  → versionado no repo (auditoria em PRs)
 *  - $GITHUB_STEP_SUMMARY        → bloco no log do CI quando rodando em Actions
 *
 * Uso:
 *   node scripts/e2e-smoke-coverage-doc.mjs           # grava arquivo
 *   node scripts/e2e-smoke-coverage-doc.mjs --check   # falha se desatualizado (CI guard)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG = resolve(ROOT, "e2e/routes/_catalog.ts");
const SPEC = resolve(ROOT, "e2e/flows/20-all-features-smoke.spec.ts");
const OUT = resolve(ROOT, "docs/E2E_SMOKE_COVERAGE.md");

/* ── Parsing leve (sem ts-node) ────────────────────────────── */
/**
 * Extrai entries `{ path, area, feature, smoke, description, titleSlug, requiresAdmin, requiresDev }`
 * dos arrays exportados em `_catalog.ts`. Regex tolerante a ordem de chaves
 * e propriedades opcionais; suporta template literals com SAMPLE_ID/SAMPLE_TOKEN.
 */
function parseCatalog(src) {
  const SAMPLE_ID = (src.match(/SAMPLE_ID\s*=\s*"([^"]+)"/) ?? [])[1] ?? "";
  const SAMPLE_TOKEN = (src.match(/SAMPLE_TOKEN\s*=\s*"([^"]+)"/) ?? [])[1] ?? "";

  const entries = [];
  // Captura blocos `{ ... }` dentro de arrays *_ROUTES
  const arrRe = /export const (\w+_ROUTES)[^=]*=\s*\[([\s\S]*?)\n\];/g;
  let m;
  while ((m = arrRe.exec(src)) !== null) {
    const [, arrName, body] = m;
    const objRe = /\{\s*([^{}]+?)\s*\}/g;
    let o;
    while ((o = objRe.exec(body)) !== null) {
      const raw = o[1];
      const get = (key) => {
        const re = new RegExp(`\\b${key}\\s*:\\s*("([^"]*)"|\`([^\`]*)\`|true|false)`);
        const r = raw.match(re);
        if (!r) return undefined;
        if (r[2] !== undefined) return r[2];
        if (r[3] !== undefined)
          return r[3].replace(/\$\{SAMPLE_ID\}/g, SAMPLE_ID).replace(/\$\{SAMPLE_TOKEN\}/g, SAMPLE_TOKEN);
        return r[1] === "true";
      };
      const path = get("path");
      const area = get("area");
      if (!path || !area) continue;
      entries.push({
        source: arrName,
        path,
        area,
        feature: get("feature"),
        smoke: get("smoke") === true,
        description: get("description"),
        titleSlug: get("titleSlug"),
        requiresAdmin: get("requiresAdmin") === true,
        requiresDev: get("requiresDev") === true,
      });
    }
  }
  return entries;
}

/** Extrai `SMOKE_COVERAGE = [...] as const` do spec. */
function parseSmokeCoverage(src) {
  const m = src.match(/const\s+SMOKE_COVERAGE\s*=\s*\[([\s\S]*?)\]\s*as const/);
  if (!m) throw new Error("SMOKE_COVERAGE não encontrado em 20-all-features-smoke.spec.ts");
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

/** Extrai descrições/numeração dos describes públicos do spec (90/91/92). */
function parsePublicSmokeTests(src) {
  const re = /test\(\s*"(\d{2})\s*·\s*([^"]+)"/g;
  const tests = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    // 90-98 = smoke público; 99 = governança (ignorado).
    const n = Number(m[1]);
    if (n >= 90 && n <= 98) tests.push({ num: m[1], label: m[2] });
  }
  return tests;
}

/* ── Geração do Markdown ───────────────────────────────────── */
function badge(area) {
  return { app: "🟢 app", admin: "🔴 admin", quotes: "🟡 quotes", public: "🌐 public" }[area] ?? area;
}

function buildMd({ entries, coverage, publicTests }) {
  const byFeat = new Map(entries.filter((e) => e.feature).map((e) => [e.feature, e]));
  const authedRows = coverage.map((feat, i) => {
    const e = byFeat.get(feat);
    if (!e) return `| \`${String(i + 1).padStart(2, "0")}\` | \`${feat}\` | ⚠ **ausente no catálogo** | — | — |`;
    const flags = [e.requiresAdmin && "admin", e.requiresDev && "dev"].filter(Boolean).join(", ") || "—";
    return `| \`${String(i + 1).padStart(2, "0")}\` | \`${feat}\` | ${e.description ?? "—"} | \`${e.path}\` | ${flags} |`;
  });

  const publicRows = entries
    .filter((e) => e.area === "public" && e.smoke)
    .map((e, i) => {
      const t = publicTests[i];
      const num = t?.num ?? "—";
      return `| \`${num}\` | \`${e.feature}\` | ${e.description ?? t?.label ?? "—"} | \`${e.path}\` |`;
    });

  const orphans = entries
    .filter((e) => e.smoke && e.feature && !coverage.includes(e.feature) && e.area !== "public")
    .map((e) => `- \`${e.feature}\` → \`${e.path}\` (\`${e.source}\`)`);
  const ghosts = coverage.filter((f) => !byFeat.has(f)).map((f) => `- \`${f}\``);

  const total = entries.length;
  const smokeTotal = entries.filter((e) => e.smoke).length;
  const today = new Date().toISOString().slice(0, 10);

  return `# Auditoria de cobertura — Smoke E2E

> **Gerado automaticamente** por \`scripts/e2e-smoke-coverage-doc.mjs\` em ${today}.
> **Não edite à mão** — a fonte de verdade é \`e2e/routes/_catalog.ts\` + \`SMOKE_COVERAGE\` em \`e2e/flows/20-all-features-smoke.spec.ts\`.

## Resumo

| Métrica | Valor |
|---|---|
| Rotas no catálogo | **${total}** |
| Rotas \`smoke: true\` | **${smokeTotal}** |
| Features autenticadas cobertas | **${coverage.length}** |
| Smoke público (sem auth) | **${publicRows.length}** |

Suíte: [\`e2e/flows/20-all-features-smoke.spec.ts\`](../e2e/flows/20-all-features-smoke.spec.ts) · Project Playwright: \`chromium-smoke\` (workers=1, retries=0).

## Smoke autenticado — features × rotas

Ordem do array \`SMOKE_COVERAGE\`. Numeração bate com os títulos \`NN · Nome\` no relatório do Playwright.

| # | Feature | Descrição | Rota | Restrição |
|---|---|---|---|---|
${authedRows.join("\n")}

## Smoke público (sem auth)

| # | Feature | Descrição | Rota |
|---|---|---|---|
${publicRows.join("\n")}

## Governança

${orphans.length === 0 ? "✅ Nenhuma rota `smoke: true` órfã (todas listadas em `SMOKE_COVERAGE`)." : `### ⚠ Features marcadas \`smoke: true\` no catálogo MAS ausentes em \`SMOKE_COVERAGE\`\n\n${orphans.join("\n")}`}

${ghosts.length === 0 ? "✅ Nenhuma feature fantasma em `SMOKE_COVERAGE`." : `### ⚠ Features em \`SMOKE_COVERAGE\` MAS ausentes (ou \`smoke:false\`) no catálogo\n\n${ghosts.join("\n")}`}

---
_Para regenerar:_ \`node scripts/e2e-smoke-coverage-doc.mjs\`
_Para validar no CI:_ \`node scripts/e2e-smoke-coverage-doc.mjs --check\`
`;
}

/* ── Main ──────────────────────────────────────────────────── */
const catalogSrc = readFileSync(CATALOG, "utf8");
const specSrc = readFileSync(SPEC, "utf8");
const entries = parseCatalog(catalogSrc);
const coverage = parseSmokeCoverage(specSrc);
const publicTests = parsePublicSmokeTests(specSrc);
const md = buildMd({ entries, coverage, publicTests });

const isCheck = process.argv.includes("--check");
if (isCheck) {
  const cur = existsSync(OUT) ? readFileSync(OUT, "utf8") : "";
  // Ignora a linha de data ao comparar (evita falso positivo diário).
  const norm = (s) => s.replace(/em \d{4}-\d{2}-\d{2}/, "em <date>");
  if (norm(cur) !== norm(md)) {
    console.error(`❌ ${OUT} desatualizado. Rode: node scripts/e2e-smoke-coverage-doc.mjs`);
    process.exit(1);
  }
  console.log("✅ E2E_SMOKE_COVERAGE.md em dia.");
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, md);
  console.log(`✅ Gerado: ${OUT} (${coverage.length} features autenticadas + ${entries.filter((e) => e.area === "public" && e.smoke).length} públicas)`);
}

// Anexa ao step summary do GitHub Actions quando disponível.
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n## 📋 Cobertura Smoke E2E\n\n${md}\n`);
}
