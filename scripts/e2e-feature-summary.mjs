#!/usr/bin/env node
/**
 * e2e-feature-summary — Agrupa resultados Playwright por FEATURE.
 *
 * Lê `playwright-report/results.json` (JSON reporter) e produz:
 *   1. Tabela no console com pass/fail/skipped por feature
 *   2. `playwright-report/feature-summary.md` (markdown) — bom para CI artifact
 *   3. `playwright-report/feature-summary.json` (cru) — bom para tooling
 *
 * Exit code: 1 se houver QUALQUER falha; 0 caso contrário; 2 se results.json ausente.
 *
 * Convenção de mapeamento spec → feature:
 *   e2e/routes/{admin|app|quotes|public}/<f>.spec.ts → "<area>/<f>"
 *   e2e/flows/<NN>-<f>.spec.ts                        → "flow/<f>"
 *   e2e/<f>.spec.ts                                   → "legacy/<f>"
 *   tudo o mais                                       → "uncategorized"
 *
 * Envs:
 *   E2E_RESULTS_JSON  caminho alternativo do results.json
 *   E2E_SUMMARY_TOP   nº de "slowest" exibidos (default 5)
 *
 * Uso (CI):
 *   - job smoke:      `npm run test:e2e:smoke:report`
 *   - job regression: `npm run test:e2e:regression:report`
 *   - artifact:       upload `playwright-report/feature-summary.md`
 */
import fs from "node:fs";
import path from "node:path";

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

const REPORT = process.env.E2E_RESULTS_JSON || "playwright-report/results.json";
const TOP_N = Math.max(1, Number(process.env.E2E_SUMMARY_TOP) || 5);

if (!fs.existsSync(REPORT)) {
  console.error(
    `${C.red}[e2e-summary] não encontrei ${REPORT}.${C.reset}\n` +
      `Rode antes: npm run test:e2e:smoke (ou regression).`,
  );
  process.exit(2);
}

let raw;
try {
  raw = JSON.parse(fs.readFileSync(REPORT, "utf8"));
} catch (err) {
  console.error(`${C.red}[e2e-summary] JSON inválido em ${REPORT}: ${err}${C.reset}`);
  process.exit(2);
}

// ── Mapeamento spec → feature ──────────────────────────────────────────────
function featureKey(file) {
  const rel = file.replace(/^.*\/e2e\//, "e2e/").replace(/\\/g, "/");
  let m = rel.match(/^e2e\/routes\/(admin|app|quotes|public)\/(.+)\.spec\.tsx?$/);
  if (m) return `${m[1]}/${m[2]}`;
  m = rel.match(/^e2e\/flows\/\d+-(.+)\.spec\.tsx?$/);
  if (m) return `flow/${m[1]}`;
  m = rel.match(/^e2e\/flows\/(.+)\.spec\.tsx?$/);
  if (m) return `flow/${m[1]}`;
  m = rel.match(/^e2e\/(.+)\.spec\.tsx?$/);
  if (m) return `legacy/${m[1]}`;
  return "uncategorized";
}

/**
 * Extrai e2eName de strings produzidas por `e2eName(label, ...)`.
 * Padrão SSOT (vide e2e/fixtures/test-user.ts):
 *   "[E2E] <label> <ts>-<hash4>"               → ex: "[E2E] orcamento 1730000000000-a1b2"
 *   "[E2E:<scope>] <label> <ts>-<hash4>"       → ex: "[E2E:qc] orcamento 1730000000000-a1b2"
 *
 * Procura no título do teste E na mensagem de erro (recurso aparece em
 * locators/strings de erro tipo `expect(getByText("[E2E] orcamento 1730…"))`).
 * Retorna apenas o PRIMEIRO match — testes que criam múltiplos recursos
 * tipicamente falham por causa do primeiro.
 */
function extractE2eName(...sources) {
  const re = /\[E2E(?::[a-z0-9-]+)?\]\s+[a-z0-9_-]+(?:\s+\d{10,}-[a-z0-9]{4,})?/i;
  for (const s of sources) {
    if (!s) continue;
    const m = String(s).match(re);
    if (m) return m[0];
  }
  return null;
}

// ── Walk recursivo das suites do JSON reporter ────────────────────────────
/**
 * @typedef {{ feature: string, file: string, project: string, title: string,
 *             status: "passed"|"failed"|"timedOut"|"skipped"|"interrupted",
 *             duration: number, location: string|null, error: string|null }} TestRow
 */
const rows = [];

function walkSuites(suites = [], parentTitles = []) {
  for (const suite of suites) {
    const file = suite.file || suite.title || "";
    const titles = suite.title ? [...parentTitles, suite.title] : parentTitles;
    for (const spec of suite.specs ?? []) {
      const specTitle = [...titles, spec.title].filter(Boolean).join(" › ");
      for (const t of spec.tests ?? []) {
        const project = t.projectName || "";
        const last = (t.results ?? []).slice(-1)[0] ?? {};
        // status efetivo: usa o último result (após retries)
        const status =
          t.status === "skipped" || last.status === "skipped"
            ? "skipped"
            : last.status || t.status || "unknown";
        const duration = Number(last.duration) || 0;
        const errorMsg = (last.error?.message || last.errors?.[0]?.message || "")
          .toString()
          .split("\n")[0]
          .slice(0, 200);
        rows.push({
          feature: featureKey(file || spec.file || ""),
          file: file || spec.file || "",
          project,
          title: specTitle,
          status,
          duration,
          location: spec.line ? `${file}:${spec.line}` : null,
          error: errorMsg || null,
          e2eName: extractE2eName(specTitle, errorMsg),
        });
      }
    }
    if (suite.suites) walkSuites(suite.suites, titles);
  }
}
walkSuites(raw.suites);

// ── Agregação por feature ─────────────────────────────────────────────────
const byFeature = new Map();
for (const r of rows) {
  if (!byFeature.has(r.feature)) {
    byFeature.set(r.feature, {
      feature: r.feature,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      failures: [],
    });
  }
  const bucket = byFeature.get(r.feature);
  bucket.total++;
  bucket.duration += r.duration;
  if (r.status === "passed") bucket.passed++;
  else if (r.status === "skipped") bucket.skipped++;
  else {
    bucket.failed++;
    bucket.failures.push(r);
  }
}

const totals = rows.reduce(
  (a, r) => {
    a.total++;
    a.duration += r.duration;
    if (r.status === "passed") a.passed++;
    else if (r.status === "skipped") a.skipped++;
    else a.failed++;
    return a;
  },
  { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 },
);

const failedFeatures = [...byFeature.values()]
  .filter((f) => f.failed > 0)
  .sort((a, b) => b.failed - a.failed || a.feature.localeCompare(b.feature));

const slowestFeatures = [...byFeature.values()]
  .sort((a, b) => b.duration - a.duration)
  .slice(0, TOP_N);

const skippedRows = rows.filter((r) => r.status === "skipped");

// ── Agregação por e2eName (recurso nomeado SSOT) ──────────────────────────
// Agrupa falhas por recurso identificado via `e2eName(...)`. Permite ver,
// por exemplo, que 3 falhas distintas em features diferentes compartilham
// o mesmo recurso (ex: cleanup vazou um orçamento órfão entre specs).
const byE2eName = new Map();
for (const r of rows) {
  if (!r.e2eName || r.status === "passed" || r.status === "skipped") continue;
  if (!byE2eName.has(r.e2eName)) {
    byE2eName.set(r.e2eName, { e2eName: r.e2eName, failures: [], features: new Set() });
  }
  const b = byE2eName.get(r.e2eName);
  b.failures.push(r);
  b.features.add(r.feature);
}
const failedByE2eName = [...byE2eName.values()].sort(
  (a, b) => b.failures.length - a.failures.length || a.e2eName.localeCompare(b.e2eName),
);

// ── Render console ────────────────────────────────────────────────────────
const startedAt = raw.stats?.startTime
  ? new Date(raw.stats.startTime).toISOString().replace("T", " ").slice(0, 16)
  : "(unknown)";
const wallSec = ((raw.stats?.duration || totals.duration) / 1000).toFixed(1);
const projects = [...new Set(rows.map((r) => r.project).filter(Boolean))].join(", ") || "—";

const fmtSec = (ms) => `${(ms / 1000).toFixed(1)}s`;

console.log(`\n${C.bold}═══ E2E Feature Summary ═══${C.reset}`);
console.log(`${C.dim}Projects:${C.reset} ${projects}  ${C.dim}|${C.reset}  ${startedAt}  ${C.dim}|${C.reset}  ${wallSec}s`);
console.log(
  `${C.dim}Total:${C.reset} ${totals.total}  ` +
    `${C.green}✓ ${totals.passed}${C.reset}  ` +
    `${C.red}✗ ${totals.failed}${C.reset}  ` +
    `${C.yellow}⊘ ${totals.skipped}${C.reset}\n`,
);

if (failedFeatures.length === 0) {
  console.log(`${C.green}✓ Nenhuma falha por feature.${C.reset}\n`);
} else {
  console.log(`${C.bold}Failures by feature (${failedFeatures.length}):${C.reset}`);
  for (const f of failedFeatures) {
    console.log(
      `  ${C.red}✗${C.reset} ${C.bold}${f.feature.padEnd(34)}${C.reset} ` +
        `${C.red}${f.failed} failed${C.reset}  ${C.dim}(${f.total} specs, ${fmtSec(f.duration)})${C.reset}`,
    );
    for (const fr of f.failures.slice(0, 5)) {
      console.log(
        `      ${C.dim}·${C.reset} ${fr.title}` +
          (fr.location ? `   ${C.dim}${fr.location}${C.reset}` : ""),
      );
      if (fr.error) console.log(`        ${C.dim}↳ ${fr.error}${C.reset}`);
    }
    if (f.failures.length > 5) {
      console.log(`      ${C.dim}… +${f.failures.length - 5} mais${C.reset}`);
    }
  }
  console.log("");
}

if (failedByE2eName.length > 0) {
  console.log(
    `${C.bold}Failures by e2eName (${failedByE2eName.length} recurso(s) afetado(s)):${C.reset}`,
  );
  for (const r of failedByE2eName) {
    const featList = [...r.features].slice(0, 3).join(", ") + (r.features.size > 3 ? ` +${r.features.size - 3}` : "");
    console.log(
      `  ${C.cyan}◆${C.reset} ${C.bold}${r.e2eName}${C.reset}  ` +
        `${C.red}${r.failures.length} fail${C.reset}  ${C.dim}[${featList}]${C.reset}`,
    );
    for (const fr of r.failures.slice(0, 3)) {
      console.log(`      ${C.dim}·${C.reset} ${fr.feature} › ${fr.title}`);
    }
    if (r.failures.length > 3) {
      console.log(`      ${C.dim}… +${r.failures.length - 3} mais${C.reset}`);
    }
  }
  console.log("");
}

if (skippedRows.length > 0) {
  console.log(`${C.bold}Skipped (${skippedRows.length}):${C.reset}`);
  for (const s of skippedRows.slice(0, 8)) {
    console.log(`  ${C.yellow}⊘${C.reset} ${s.feature}  ${C.dim}${s.title}${C.reset}`);
  }
  if (skippedRows.length > 8) console.log(`  ${C.dim}… +${skippedRows.length - 8} mais${C.reset}`);
  console.log("");
}

console.log(`${C.bold}Top ${TOP_N} slowest features:${C.reset}`);
for (const f of slowestFeatures) {
  console.log(`  ${f.feature.padEnd(34)} ${C.dim}${fmtSec(f.duration)}${C.reset}  (${f.total} specs)`);
}
console.log("");

// ── Render markdown ───────────────────────────────────────────────────────
const mdLines = [];
mdLines.push(`# E2E Feature Summary`);
mdLines.push(``);
mdLines.push(`- **Run started:** ${startedAt}`);
mdLines.push(`- **Wall time:** ${wallSec}s`);
mdLines.push(`- **Projects:** ${projects}`);
mdLines.push(
  `- **Totals:** ${totals.total} total · ✅ ${totals.passed} · ❌ ${totals.failed} · ⏭ ${totals.skipped}`,
);
mdLines.push(``);

if (failedFeatures.length === 0) {
  mdLines.push(`✅ **No failures.**`);
} else {
  mdLines.push(`## Failures by feature`);
  mdLines.push(``);
  mdLines.push(`| Feature | Failed | Total | Duration |`);
  mdLines.push(`|---|---:|---:|---:|`);
  for (const f of failedFeatures) {
    mdLines.push(`| \`${f.feature}\` | ${f.failed} | ${f.total} | ${fmtSec(f.duration)} |`);
  }
  mdLines.push(``);
  for (const f of failedFeatures) {
    mdLines.push(`### \`${f.feature}\` — ${f.failed} failed`);
    for (const fr of f.failures) {
      mdLines.push(`- **${fr.title}**${fr.location ? `  \n  \`${fr.location}\`` : ""}`);
      if (fr.error) mdLines.push(`  - ↳ ${fr.error}`);
    }
    mdLines.push(``);
  }
}

if (failedByE2eName.length > 0) {
  mdLines.push(`## Failures by e2eName`);
  mdLines.push(``);
  mdLines.push(`Recursos nomeados via \`e2eName(...)\` que apareceram em falhas. Útil para rastrear leaks de cleanup ou conflitos cross-spec.`);
  mdLines.push(``);
  mdLines.push(`| Resource | Failures | Affected features |`);
  mdLines.push(`|---|---:|---|`);
  for (const r of failedByE2eName) {
    mdLines.push(
      `| \`${r.e2eName}\` | ${r.failures.length} | ${[...r.features].map((f) => `\`${f}\``).join(", ")} |`,
    );
  }
  mdLines.push(``);
}

if (skippedRows.length > 0) {
  mdLines.push(`## Skipped (${skippedRows.length})`);
  for (const s of skippedRows) mdLines.push(`- \`${s.feature}\` — ${s.title}`);
  mdLines.push(``);
}

mdLines.push(`## Top ${TOP_N} slowest features`);
mdLines.push(``);
mdLines.push(`| Feature | Duration | Specs |`);
mdLines.push(`|---|---:|---:|`);
for (const f of slowestFeatures) {
  mdLines.push(`| \`${f.feature}\` | ${fmtSec(f.duration)} | ${f.total} |`);
}

const outDir = path.dirname(REPORT);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "feature-summary.md"), mdLines.join("\n") + "\n");
fs.writeFileSync(
  path.join(outDir, "feature-summary.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      projects,
      totals,
      features: [...byFeature.values()].sort((a, b) => a.feature.localeCompare(b.feature)),
      e2eNames: failedByE2eName.map((r) => ({
        e2eName: r.e2eName,
        failures: r.failures.length,
        features: [...r.features],
      })),
    },
    null,
    2,
  ) + "\n",
);

console.log(
  `${C.dim}Wrote ${path.join(outDir, "feature-summary.md")} and feature-summary.json${C.reset}\n`,
);

if (totals.failed > 0) {
  console.log(`${C.red}${C.bold}Exit: 1 (${totals.failed} failure(s) detected)${C.reset}\n`);
  process.exit(1);
}
console.log(`${C.green}${C.bold}Exit: 0 (all clear)${C.reset}\n`);
process.exit(0);
