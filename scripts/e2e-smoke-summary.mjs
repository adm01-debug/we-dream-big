#!/usr/bin/env node
/**
 * e2e-smoke-summary — Resumo dedicado da suíte SMOKE por funcionalidade.
 *
 * Diferente de `e2e-feature-summary.mjs` (que agrupa por arquivo .spec),
 * este script ABRE o spec smoke (`flows/20-all-features-smoke.spec.ts`) e
 * lista cada `test("NN · Nome", ...)` como uma linha independente — uma
 * feature por linha, com ✅/❌/⏭, duração e snippet do erro.
 *
 * Saídas:
 *   1. Tabela colorida no console (CI logs).
 *   2. `playwright-report/smoke-summary.md` (markdown) — anexado ao
 *      `$GITHUB_STEP_SUMMARY` pelo workflow.
 *   3. `playwright-report/smoke-summary.json` — para tooling/dashboards.
 *
 * Exit code:
 *   0 — todos os smoke tests passaram (ou foram pulados intencionalmente)
 *   1 — pelo menos 1 falha (não derruba o job — workflow já decide)
 *   2 — `results.json` ausente ou inválido
 *
 * Envs:
 *   E2E_RESULTS_JSON   caminho alternativo do results.json
 *   E2E_SMOKE_PROJECT  nome do project Playwright do smoke (default "chromium-smoke")
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
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
};

const REPORT = process.env.E2E_RESULTS_JSON || "playwright-report/results.json";
const SMOKE_PROJECT = process.env.E2E_SMOKE_PROJECT || "chromium-smoke";
const SMOKE_FILE_RE = /flows\/20-all-features-smoke\.spec\.tsx?$/;

if (!fs.existsSync(REPORT)) {
  console.error(
    `${C.red}[smoke-summary] não encontrei ${REPORT}.${C.reset}\n` +
      `Rode antes: npm run test:e2e:smoke`,
  );
  process.exit(2);
}

let raw;
try {
  raw = JSON.parse(fs.readFileSync(REPORT, "utf8"));
} catch (err) {
  console.error(`${C.red}[smoke-summary] JSON inválido em ${REPORT}: ${err}${C.reset}`);
  process.exit(2);
}

/** @typedef {{ num: string, label: string, status: "passed"|"failed"|"timedOut"|"skipped"|"interrupted"|"unknown",
 *              duration: number, retries: number, location: string|null,
 *              error: string|null, fullError: string|null, group: "auth"|"public"|"governance" }} SmokeRow */

/** @type {SmokeRow[]} */
const rows = [];

/** Extrai NN + label do título "NN · Nome legível" (separadores `·` ou `-`). */
function parseTitle(rawTitle) {
  const m = rawTitle.match(/^\s*(\d{2})\s*[·\-]\s*(.+?)\s*$/);
  if (m) return { num: m[1], label: m[2] };
  return { num: "??", label: rawTitle.trim() };
}

/** Classifica por grupo a partir do describe pai e do número. */
function classify(num, parentTitles) {
  const desc = parentTitles.join(" / ").toLowerCase();
  if (num === "99") return "governance";
  if (desc.includes("públic")) return "public";
  return "auth";
}

function walkSuites(suites = [], parentTitles = [], inheritedFile = "") {
  for (const suite of suites) {
    const file = suite.file || inheritedFile || "";
    const titles = suite.title ? [...parentTitles, suite.title] : parentTitles;

    const isSmokeFile = SMOKE_FILE_RE.test(file);
    if (isSmokeFile) {
      for (const spec of suite.specs ?? []) {
        for (const t of spec.tests ?? []) {
          if (t.projectName && t.projectName !== SMOKE_PROJECT) continue;

          const results = t.results ?? [];
          const last = results.slice(-1)[0] ?? {};
          const status =
            t.status === "skipped" || last.status === "skipped"
              ? "skipped"
              : last.status || t.status || "unknown";
          const duration = Number(last.duration) || 0;
          const retries = Math.max(0, results.length - 1);
          const errorMsg =
            (last.error?.message || last.errors?.[0]?.message || "")
              .toString()
              .replace(/\u001b\[[0-9;]*m/g, "")
              .trim();
          const errorFirstLine = errorMsg.split("\n")[0].slice(0, 220);

          const { num, label } = parseTitle(spec.title);
          rows.push({
            num,
            label,
            status,
            duration,
            retries,
            location: spec.line ? `${file}:${spec.line}` : null,
            error: errorFirstLine || null,
            fullError: errorMsg || null,
            group: classify(num, titles),
          });
        }
      }
    }
    if (suite.suites) walkSuites(suite.suites, titles, file);
  }
}
walkSuites(raw.suites);

if (rows.length === 0) {
  console.warn(
    `${C.yellow}[smoke-summary] nenhum teste smoke encontrado em ${REPORT}.${C.reset}\n` +
      `Verifique se o project "${SMOKE_PROJECT}" rodou (--project=${SMOKE_PROJECT}).`,
  );
  // Não é fatal — pode ser run de regression sem smoke.
  process.exit(0);
}

// Ordena por NN ascendente (governance "99" naturalmente fica no fim).
rows.sort((a, b) => a.num.localeCompare(b.num));

const totals = rows.reduce(
  (a, r) => {
    a.total++;
    a.duration += r.duration;
    if (r.status === "passed") a.passed++;
    else if (r.status === "skipped") a.skipped++;
    else a.failed++;
    if (r.retries > 0) a.retried++;
    return a;
  },
  { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0, retried: 0 },
);

const failed = rows.filter((r) => r.status !== "passed" && r.status !== "skipped");
const flaky = rows.filter((r) => r.status === "passed" && r.retries > 0);

// Quebra de ordem: detecta features que quebraram após uma feature anterior
// passar — útil pra sinalizar "smoke parou sequencialmente em N".
const firstFailIdx = rows.findIndex((r) => r.status !== "passed" && r.status !== "skipped");

// ── Render console ────────────────────────────────────────────────────────
const wallSec = ((raw.stats?.duration || totals.duration) / 1000).toFixed(1);
const startedAt = raw.stats?.startTime
  ? new Date(raw.stats.startTime).toISOString().replace("T", " ").slice(0, 16)
  : "(unknown)";

const fmtSec = (ms) => `${(ms / 1000).toFixed(1)}s`;
const icon = (s) =>
  s === "passed" ? `${C.green}✓${C.reset}`
    : s === "failed" || s === "timedOut" || s === "interrupted" ? `${C.red}✗${C.reset}`
    : s === "skipped" ? `${C.yellow}⊘${C.reset}`
    : `${C.dim}?${C.reset}`;

console.log(`\n${C.bold}═══ E2E Smoke Summary (${SMOKE_PROJECT}) ═══${C.reset}`);
console.log(`${C.dim}Started:${C.reset} ${startedAt}  ${C.dim}|${C.reset}  ${C.dim}Wall:${C.reset} ${wallSec}s`);
console.log(
  `${C.dim}Smoke tests:${C.reset} ${totals.total}  ` +
    `${C.green}✓ ${totals.passed}${C.reset}  ` +
    `${C.red}✗ ${totals.failed}${C.reset}  ` +
    `${C.yellow}⊘ ${totals.skipped}${C.reset}` +
    (totals.retried > 0 ? `  ${C.magenta}⟲ ${totals.retried} retried${C.reset}` : "") +
    "\n",
);

if (firstFailIdx >= 0) {
  const r = rows[firstFailIdx];
  console.log(`${C.red}${C.bold}↯ Primeira falha:${C.reset} ${r.num} · ${r.label}`);
  console.log(`  ${C.dim}${r.location ?? ""}${C.reset}\n`);
}

console.log(`${C.bold}Status por funcionalidade:${C.reset}`);
let lastGroup = null;
for (const r of rows) {
  if (r.group !== lastGroup) {
    const label =
      r.group === "auth" ? "—— Autenticadas ——"
      : r.group === "public" ? "—— Públicas ——"
      : "—— Governança ——";
    console.log(`${C.dim}${label}${C.reset}`);
    lastGroup = r.group;
  }
  const num = r.num.padStart(2, "0");
  const dur = fmtSec(r.duration).padStart(7);
  const retry = r.retries > 0 ? `${C.magenta} ⟲${r.retries}${C.reset}` : "";
  console.log(`  ${icon(r.status)} ${C.bold}${num}${C.reset} · ${r.label.padEnd(40)} ${C.dim}${dur}${C.reset}${retry}`);
  if (r.status !== "passed" && r.status !== "skipped" && r.error) {
    console.log(`        ${C.red}↳ ${r.error}${C.reset}`);
  }
}
console.log("");

if (failed.length > 0) {
  console.log(`${C.bold}${C.red}Diagnóstico expandido (${failed.length} falha(s)):${C.reset}`);
  for (const r of failed) {
    console.log(`\n  ${C.red}${C.bold}✗ ${r.num} · ${r.label}${C.reset}`);
    if (r.location) console.log(`    ${C.dim}@ ${r.location}${C.reset}`);
    if (r.fullError) {
      const lines = r.fullError.split("\n").slice(0, 6);
      for (const l of lines) console.log(`    ${C.dim}│${C.reset} ${l}`);
      if (r.fullError.split("\n").length > 6) {
        console.log(`    ${C.dim}│ … (truncado — veja playwright-report/)${C.reset}`);
      }
    }
  }
  console.log("");
}

if (flaky.length > 0) {
  console.log(`${C.magenta}${C.bold}⚠ Flaky (passou após retry — investigar):${C.reset}`);
  for (const r of flaky) {
    console.log(`  ${C.magenta}⟲${C.reset} ${r.num} · ${r.label} ${C.dim}(${r.retries} retry)${C.reset}`);
  }
  console.log("");
}

// ── Render markdown (CI step summary) ─────────────────────────────────────
const md = [];
md.push(`# 🚦 E2E Smoke Summary`);
md.push(``);
md.push(`- **Project:** \`${SMOKE_PROJECT}\``);
md.push(`- **Started:** ${startedAt}`);
md.push(`- **Wall time:** ${wallSec}s`);
md.push(
  `- **Totals:** ${totals.total} · ✅ ${totals.passed} · ❌ ${totals.failed} · ⏭ ${totals.skipped}` +
    (totals.retried > 0 ? ` · 🔁 ${totals.retried} retried` : ""),
);
if (firstFailIdx >= 0) {
  const r = rows[firstFailIdx];
  md.push(`- **🛑 Primeira falha:** \`${r.num} · ${r.label}\``);
}
md.push(``);

md.push(`## Status por funcionalidade`);
md.push(``);
md.push(`| # | Funcionalidade | Status | Duração | Retries | Grupo |`);
md.push(`|---:|---|:---:|---:|---:|:---:|`);
for (const r of rows) {
  const statusIcon =
    r.status === "passed" ? "✅"
    : r.status === "skipped" ? "⏭"
    : r.status === "timedOut" ? "⏱❌"
    : "❌";
  const groupTag =
    r.group === "auth" ? "🔐 auth"
    : r.group === "public" ? "🌐 public"
    : "🛡 gov";
  md.push(
    `| ${r.num} | ${r.label} | ${statusIcon} | ${fmtSec(r.duration)} | ${r.retries || "—"} | ${groupTag} |`,
  );
}
md.push(``);

if (failed.length > 0) {
  md.push(`## ❌ Falhas detalhadas`);
  md.push(``);
  for (const r of failed) {
    md.push(`### \`${r.num} · ${r.label}\``);
    if (r.location) md.push(`- **Local:** \`${r.location}\``);
    md.push(`- **Status:** \`${r.status}\``);
    if (r.retries > 0) md.push(`- **Retries:** ${r.retries}`);
    if (r.fullError) {
      md.push(``);
      md.push("```");
      md.push(...r.fullError.split("\n").slice(0, 12));
      md.push("```");
    }
    md.push(``);
  }
}

if (flaky.length > 0) {
  md.push(`## ⚠ Flaky (passou após retry)`);
  md.push(``);
  for (const r of flaky) md.push(`- \`${r.num} · ${r.label}\` — ${r.retries} retry(s)`);
  md.push(``);
}

if (failed.length === 0 && flaky.length === 0) {
  md.push(`✅ **Smoke verde — gate liberado.**`);
}

const outDir = path.dirname(REPORT);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "smoke-summary.md"), md.join("\n") + "\n");
fs.writeFileSync(
  path.join(outDir, "smoke-summary.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      project: SMOKE_PROJECT,
      startedAt,
      wallSec: Number(wallSec),
      totals,
      firstFailIndex: firstFailIdx,
      rows,
    },
    null,
    2,
  ) + "\n",
);

console.log(
  `${C.dim}Wrote ${path.join(outDir, "smoke-summary.md")} and smoke-summary.json${C.reset}\n`,
);

/* ============================================================
 * Saída para o LOG FINAL do CI (GitHub Actions workflow commands)
 * ============================================================
 * 1. `::error file=...,line=...::` — anotações inline no PR (1 por falha).
 * 2. `::group::` / `::endgroup::` — diagnóstico expandido colapsável.
 * 3. Bloco "FINAL SUMMARY" sempre impresso ao final, sem cores/ANSI,
 *    fácil de scanear no log do step quando o job termina.
 */
const isCI = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";

if (isCI && failed.length > 0) {
  // Anotações inline (renderizam na aba "Files Changed" do PR)
  for (const r of failed) {
    const loc = r.location ?? "e2e/flows/20-all-features-smoke.spec.ts";
    const [file, line] = loc.split(":");
    const msg = `Smoke ${r.num} · ${r.label} — ${r.error ?? r.status}`;
    // Escape de %, \r, \n conforme spec do GitHub Actions
    const safe = msg.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
    console.log(
      `::error file=${file}${line ? `,line=${line}` : ""},title=Smoke fail: ${r.num} · ${r.label}::${safe}`,
    );
  }
}

if (isCI && (failed.length > 0 || flaky.length > 0)) {
  console.log(`::group::🔬 Smoke diagnostics (clique para expandir)`);
  for (const r of failed) {
    console.log(`✗ ${r.num} · ${r.label}`);
    if (r.location) console.log(`  @ ${r.location}`);
    if (r.fullError) {
      for (const l of r.fullError.split("\n").slice(0, 8)) console.log(`  | ${l}`);
    }
    console.log("");
  }
  for (const r of flaky) {
    console.log(`⟲ ${r.num} · ${r.label} — flaky (${r.retries} retry)`);
  }
  console.log(`::endgroup::`);
}

/* ── Bloco FINAL SUMMARY (sempre impresso, sem ANSI) ─────────────────── */
const plain = (s) => s.replace(/\u001b\[[0-9;]*m/g, "");
const sep = "─".repeat(72);
const finalLines = [
  "",
  sep,
  `🚦 SMOKE FINAL SUMMARY · project=${SMOKE_PROJECT}`,
  sep,
  `Total: ${totals.total}   ✅ ${totals.passed}   ❌ ${totals.failed}   ⏭ ${totals.skipped}` +
    (totals.retried > 0 ? `   🔁 ${totals.retried} retried` : ""),
  `Duration: ${wallSec}s   Started: ${startedAt}`,
  "",
];
if (failed.length === 0 && flaky.length === 0) {
  finalLines.push("✅ Todas as funcionalidades passaram — gate liberado.");
} else {
  if (failed.length > 0) {
    finalLines.push(`❌ Funcionalidades quebradas (${failed.length}):`);
    for (const r of failed) {
      finalLines.push(`   ${r.num} · ${r.label}`);
      if (r.error) finalLines.push(`        ↳ ${plain(r.error)}`);
    }
    if (firstFailIdx >= 0) {
      const r = rows[firstFailIdx];
      finalLines.push("");
      finalLines.push(`🛑 Primeira falha: ${r.num} · ${r.label}`);
    }
  }
  if (flaky.length > 0) {
    finalLines.push("");
    finalLines.push(`⚠ Flaky — passou após retry (${flaky.length}):`);
    for (const r of flaky) finalLines.push(`   ${r.num} · ${r.label}  (${r.retries} retry)`);
  }
  finalLines.push("");
  finalLines.push("Detalhes completos: artifact 'e2e-smoke-summary' + 'playwright-report'.");
}
finalLines.push(sep, "");
console.log(finalLines.join("\n"));

process.exit(totals.failed > 0 ? 1 : 0);
