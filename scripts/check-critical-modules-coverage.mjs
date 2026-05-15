#!/usr/bin/env node
/**
 * Coverage gate para os módulos críticos (Catalog, Kit Builder, Mockup).
 */
import fs from "node:fs";
import path from "node:path";

const SUMMARY_PATH = path.resolve("coverage/coverage-summary.json");

const FILE_THRESHOLDS = {
  "src/pages/FiltersPage.tsx": { statements: 40, branches: 40, functions: 40, lines: 40 },
  "src/pages/KitBuilderPage.tsx": { statements: 40, branches: 40, functions: 40, lines: 40 },
  "src/pages/MockupGenerator.tsx": { statements: 40, branches: 40, functions: 40, lines: 40 },
};

const TOLERANCE_PP = 1;

if (!fs.existsSync(SUMMARY_PATH)) {
  console.error("coverage-summary.json não encontrado.");
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(SUMMARY_PATH, "utf8"));

function findEntry(relPath) {
  const normalized = relPath.replace(/\\/g, "/");
  const key = Object.keys(summary).find(k => k.endsWith(normalized));
  return key ? summary[key] : null;
}

let hasFailure = false;
for (const [file, thresholds] of Object.entries(FILE_THRESHOLDS)) {
  const entry = findEntry(file);
  if (!entry) {
    console.log(`✗ ${file} (sem cobertura)`);
    hasFailure = true;
    continue;
  }
  
  const m = {
    statements: entry.statements?.pct ?? 0,
    branches: entry.branches?.pct ?? 0,
    functions: entry.functions?.pct ?? 0,
    lines: entry.lines?.pct ?? 0,
  };

  const violations = Object.entries(thresholds).filter(([metric, min]) => m[metric] < min - TOLERANCE_PP);

  if (violations.length === 0) {
    console.log(`✓ ${file} (S:${m.statements.toFixed(0)}%)`);
  } else {
    hasFailure = true;
    console.log(`✗ ${file} regrediu!`);
  }
}

if (hasFailure) process.exit(1);
console.log("✅ Cobertura de módulos críticos validada.");
