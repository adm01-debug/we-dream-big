#!/usr/bin/env node
/**
 * Coverage gate dedicado aos arquivos de "price freshness".
 *
 * Lê `coverage/coverage-summary.json` (gerado pelo reporter `json-summary`
 * do Vitest/V8) e falha o build (exit 1) se qualquer arquivo monitorado
 * cair abaixo do limiar mínimo definido abaixo.
 *
 * Por que um gate por arquivo (em vez do `thresholds` global do Vitest)?
 *  - O threshold global do Vitest é uma média do projeto. Um arquivo
 *    crítico pode regredir sem disparar o gate global.
 *  - Aqui travamos arquivos específicos com um piso mais alto (95%),
 *    independente da cobertura geral do projeto.
 *
 * Como ler a saída:
 *   ✓ src/utils/price-freshness.ts                   100%/100%/100%/100%
 *   ✗ src/components/products/PriceFreshnessBadge.tsx 88%/72%/90%/88%  ← regressão
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const SUMMARY_PATH = path.resolve("coverage/coverage-summary.json");

/**
 * Pisos por arquivo (em %).
 *
 * Política: cada piso é o baseline atual menos ~3pp de margem para absorver
 * o ruído conhecido do reporter V8 do Vitest em `branches.pct` (oscila ±1–2pp
 * entre runs dependendo do cache de transformação do Vite). Adicionalmente,
 * `COVERAGE_TOLERANCE_PP` (default 1) é subtraído de cada piso na hora da
 * checagem — isso evita que flutuação infinitesimal quebre `main` sem mascarar
 * regressões reais (queda > tolerância ainda falha o gate).
 *
 * Quando subirmos a cobertura real de um arquivo, **subimos também o piso**
 * neste arquivo — assim cada PR só pode manter ou melhorar.
 *
 * Para subir um piso depois de adicionar testes:
 *   1. Rode `npm run test:coverage` localmente.
 *   2. Leia o % real em coverage/coverage-summary.json.
 *   3. Atualize o objeto abaixo (novo piso = real − 3pp).
 */
const FILE_THRESHOLDS = {
  "src/utils/price-freshness.ts": {
    statements: 99,
    branches: 99,
    functions: 99,
    lines: 99,
  },
  "src/components/products/PriceFreshnessBadge.tsx": {
    statements: 62,
    branches: 75,
    functions: 49,
    lines: 62,
  },
};

const TOLERANCE_PP = Number(process.env.COVERAGE_TOLERANCE_PP ?? "1");

const TRACKED_FILES = Object.keys(FILE_THRESHOLDS);

function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(SUMMARY_PATH)) {
  fail(
    `coverage-summary.json não encontrado em ${SUMMARY_PATH}. ` +
      `Rode 'npm run test:coverage' antes deste script.`,
  );
}

const summary = JSON.parse(fs.readFileSync(SUMMARY_PATH, "utf8"));

// O summary usa chaves em path absoluto. Resolvemos por sufixo.
function findEntry(relPath) {
  const normalized = relPath.replace(/\\/g, "/");
  const key = Object.keys(summary).find(
    (k) => k !== "total" && k.replace(/\\/g, "/").endsWith(normalized),
  );
  return key ? summary[key] : null;
}

let hasFailure = false;
const lines = [];

for (const file of TRACKED_FILES) {
  const entry = findEntry(file);
  if (!entry) {
    hasFailure = true;
    lines.push(`✗ ${file.padEnd(60)} (sem cobertura — arquivo não foi exercitado)`);
    continue;
  }

  const m = {
    statements: entry.statements?.pct ?? 0,
    branches: entry.branches?.pct ?? 0,
    functions: entry.functions?.pct ?? 0,
    lines: entry.lines?.pct ?? 0,
  };

  const thresholds = FILE_THRESHOLDS[file];
  const violations = Object.entries(thresholds).filter(
    ([metric, min]) => m[metric] < min - TOLERANCE_PP,
  );

  const fmt = `S:${m.statements.toFixed(0)}% B:${m.branches.toFixed(0)}% F:${m.functions.toFixed(0)}% L:${m.lines.toFixed(0)}%`;

  if (violations.length === 0) {
    lines.push(`✓ ${file.padEnd(60)} ${fmt}`);
  } else {
    hasFailure = true;
    const detail = violations
      .map(([metric, min]) => `${metric} ${m[metric].toFixed(1)}% < ${(min - TOLERANCE_PP).toFixed(1)}% (piso ${min}% − tol ${TOLERANCE_PP}pp)`)
      .join(", ");
    lines.push(`✗ ${file.padEnd(60)} ${fmt}   ← ${detail}`);
  }
}

console.log("\nPrice Freshness — coverage gate");
console.log("─".repeat(80));
for (const l of lines) console.log(l);
console.log("─".repeat(80));
console.log(
  `Pisos calibrados por arquivo (baseline atual − ~3pp) com tolerância adicional ` +
    `de ${TOLERANCE_PP}pp para ruído do reporter V8. Para subir um piso após adicionar ` +
    `testes, edite FILE_THRESHOLDS em scripts/check-price-freshness-coverage.mjs.`,
);

if (hasFailure) {
  fail("Cobertura de price freshness regrediu abaixo do piso. Adicione testes.");
}

console.log("\n✅ Cobertura de price freshness dentro do piso.\n");
