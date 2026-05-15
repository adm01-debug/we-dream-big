#!/usr/bin/env node
/**
 * Consolida snapshots por-worker (`coverage/console-snapshot.<id>.json`)
 * em um único `coverage/console-snapshot.json` para upload como artifact
 * de CI e para auditoria humana.
 *
 * Também imprime um sumário curto e faz exit 1 se houver ref warnings
 * (independentemente do modo estrito do setup) — útil como gate
 * extra no pipeline mesmo se a env var não estiver presente.
 *
 * Flags:
 *   --no-fail   não retorna exit 1 mesmo com ref warnings (apenas reporta)
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const COVERAGE = path.resolve(ROOT, "coverage");
const OUT = path.resolve(COVERAGE, "console-snapshot.json");
const NO_FAIL = process.argv.includes("--no-fail");

async function main() {
  let entries = [];
  try {
    const files = (await fs.readdir(COVERAGE)).filter((f) =>
      /^console-snapshot\.[^.]+\.json$/.test(f),
    );
    for (const f of files) {
      try {
        const raw = await fs.readFile(path.join(COVERAGE, f), "utf8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.entries)) entries.push(...parsed.entries);
      } catch (err) {
        console.warn(`[consolidate] ignorando ${f}:`, err.message);
      }
    }
  } catch {
    console.log("[consolidate] sem snapshots para consolidar.");
    return;
  }

  // Ordena por timestamp para legibilidade.
  entries.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));

  const refWarnings = entries.filter((e) => e.isRefWarning);
  const summary = {
    generatedAt: new Date().toISOString(),
    totalEntries: entries.length,
    refWarnings: refWarnings.length,
    byLevel: {
      error: entries.filter((e) => e.level === "error").length,
      warn: entries.filter((e) => e.level === "warn").length,
    },
    entries,
  };

  await fs.mkdir(COVERAGE, { recursive: true });
  await fs.writeFile(OUT, JSON.stringify(summary, null, 2));
  console.log(
    `[consolidate] ${entries.length} entrada(s) consolidada(s) em ${path.relative(ROOT, OUT)}`,
  );
  console.log(
    `  ref warnings: ${refWarnings.length} | errors: ${summary.byLevel.error} | warns: ${summary.byLevel.warn}`,
  );

  if (refWarnings.length > 0) {
    console.error(`\n✗ ${refWarnings.length} ref warning(s) detectado(s):`);
    for (const r of refWarnings.slice(0, 10)) {
      console.error(`  (${r.level}) ${r.message.slice(0, 240)}`);
    }
    if (refWarnings.length > 10) {
      console.error(`  ...e mais ${refWarnings.length - 10}.`);
    }
    if (!NO_FAIL) process.exit(1);
  }
}

main().catch((err) => {
  console.error("[consolidate] erro inesperado:", err);
  process.exit(2);
});
