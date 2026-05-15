#!/usr/bin/env node
/**
 * Triage isolado de `deno check` por Edge Function.
 *
 * Diferente de `scripts/typecheck-edge-functions.mjs` (que roda tudo e agrega
 * todos os erros), este script é uma ferramenta de DIAGNÓSTICO:
 *
 *  - Itera cada `supabase/functions/<fn>/` em ordem alfabética.
 *  - Roda `deno check` ISOLADAMENTE em cada uma (sem reaproveitar cache entre
 *    funções, para garantir que a falha pertence àquela função e não a um
 *    side-effect de outra).
 *  - Por padrão, PARA na primeira função que falhar (`--fail-fast`), captura
 *    a primeira mensagem de erro do Deno e identifica o arquivo:linha:coluna
 *    responsável. Use `--all` para inspecionar todas as funções e gerar um
 *    relatório completo (uma entrada por função quebrada).
 *  - Emite um relatório legível em stdout E um JSON estruturado em
 *    `triage-edge-typecheck.json` na raiz para consumo do CI / agente.
 *
 * Uso:
 *   node scripts/triage-edge-typecheck.mjs                  # para na 1ª falha
 *   node scripts/triage-edge-typecheck.mjs --all            # examina todas
 *   node scripts/triage-edge-typecheck.mjs --only=fn1,fn2   # subset explícito
 *   node scripts/triage-edge-typecheck.mjs --json=out.json  # caminho do JSON
 *
 * Códigos de saída:
 *   0  = nenhuma falha
 *   1  = pelo menos uma função quebrou (relatório gerado)
 *   2  = pré-requisito ausente (deno não instalado, dir inválido)
 */

import { spawnSync } from "node:child_process";
import { readdirSync, statSync, existsSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const FUNCTIONS_DIR = "supabase/functions";
const SKIP = new Set(["_shared", "tests"]);

// ---------- args ----------
const args = process.argv.slice(2);
const flags = {
  all: args.includes("--all"),
  only: (args.find((a) => a.startsWith("--only=")) ?? "")
    .replace("--only=", "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  jsonPath:
    (args.find((a) => a.startsWith("--json=")) ?? "").replace("--json=", "") ||
    "triage-edge-typecheck.json",
};
const failFast = !flags.all;

// ---------- helpers ----------
function ensureDeno() {
  const probe = spawnSync("deno", ["--version"], { encoding: "utf8" });
  if (probe.status !== 0) {
    console.error("❌ `deno` não está no PATH. Instale antes de rodar este script.");
    process.exit(2);
  }
  return probe.stdout.trim().split("\n")[0];
}

function listFunctions() {
  if (!existsSync(FUNCTIONS_DIR)) {
    console.error(`❌ Diretório não encontrado: ${FUNCTIONS_DIR}`);
    process.exit(2);
  }
  const all = readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !SKIP.has(e.name))
    .map((e) => e.name)
    .filter((name) => existsSync(join(FUNCTIONS_DIR, name, "index.ts")))
    .sort();
  if (flags.only.length === 0) return all;
  const set = new Set(flags.only);
  return all.filter((n) => set.has(n));
}

function listFilesToCheck(fnDir) {
  const files = [];
  const indexFile = join(fnDir, "index.ts");
  if (existsSync(indexFile)) files.push(indexFile);
  for (const entry of readdirSync(fnDir)) {
    if (entry === "index.ts") continue;
    if (!entry.endsWith(".ts")) continue;
    const full = join(fnDir, entry);
    if (statSync(full).isFile()) files.push(full);
  }
  return files;
}

/**
 * Extrai a primeira falha estruturada do output do `deno check`.
 * Formatos conhecidos:
 *   - "TS2322 [ERROR]: ..." seguido de "    at file:///abs/path/file.ts:LINHA:COL"
 *   - "error: TS... at file:///..."
 *   - "Check file:///abs/path/file.ts" (sucesso, ignorado)
 *
 * Retorna { code, message, file, line, column, snippet } ou null.
 */
function stripAnsi(s) {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\u001B\[[0-9;]*[A-Za-z]/g, "");
}

function isNoiseLine(line) {
  // Linhas de progresso do Deno que não são erros reais.
  return (
    /^\s*Download\s+https?:\/\//.test(line) ||
    /^\s*Check\s+file:\/\//.test(line) ||
    /^\s*Warning\s/.test(line) ||
    line.trim() === ""
  );
}

function parseFirstError(rawOutput) {
  if (!rawOutput) return null;
  const lines = stripAnsi(rawOutput).split(/\r?\n/);

  // Coleta o primeiro bloco de erro REAL. Aceitamos:
  //   "TSxxxx [ERROR]: ..."           (formato moderno do `deno check`)
  //   "error: TSxxxx ..."              (formato alternativo)
  //   "error: <msg>"                   (erros não-TS, ex: módulo não resolvido)
  // Ignoramos linhas de Download/Check/Warning.
  let codeMatch = null;
  let message = null;
  let location = null;
  const contextLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (codeMatch === null) {
      if (isNoiseLine(line)) continue;
      const m1 = line.match(/^(TS\d+)\s*\[ERROR\]:\s*(.*)$/);
      const m2 = line.match(/^error:\s*(TS\d+)\s+(.*)$/);
      const m3 = line.match(/^error:\s+(.*)$/);
      if (m1) {
        codeMatch = m1[1];
        message = (m1[2] || "").trim();
      } else if (m2) {
        codeMatch = m2[1];
        message = (m2[2] || "").trim();
      } else if (m3) {
        codeMatch = "ERROR";
        message = (m3[1] || "").trim();
      } else {
        continue;
      }
      contextLines.push(line);
      continue;
    }

    contextLines.push(line);
    // Localização: "    at file:///dev-server/.../index.ts:42:10"
    const loc = line.match(/at\s+(file:\/\/\S+?):(\d+):(\d+)/);
    if (loc) {
      location = { file: loc[1], line: Number(loc[2]), column: Number(loc[3]) };
      break;
    }
    if (contextLines.length > 12) break; // safety
  }

  if (!codeMatch) {
    const firstReal = lines.find((l) => !isNoiseLine(l));
    if (!firstReal) return null;
    return {
      code: "UNKNOWN",
      message: firstReal.trim(),
      file: null,
      line: null,
      column: null,
      snippet: lines.filter((l) => !isNoiseLine(l)).slice(0, 8).join("\n"),
    };
  }

  let fileRel = null;
  if (location) {
    const url = location.file.replace(/^file:\/\//, "");
    try {
      fileRel = relative(process.cwd(), url) || url;
    } catch {
      fileRel = url;
    }
  }

  return {
    code: codeMatch,
    message,
    file: fileRel,
    line: location?.line ?? null,
    column: location?.column ?? null,
    snippet: contextLines.slice(0, 10).join("\n"),
  };
}

function checkFunction(fn) {
  const fnDir = join(FUNCTIONS_DIR, fn);
  const files = listFilesToCheck(fnDir);
  if (files.length === 0) {
    return { fn, status: "skipped", reason: "no .ts files" };
  }

  const started = Date.now();
  // Se a função possui `deno.json` local (ex: mcp-server com import map para
  // hono/mcp-lite), respeitamos o config — caso contrário usamos --no-config
  // para evitar herdar um deno.json de raiz que possa mascarar erros.
  // --reload força revalidação do cache desta função (isolamento).
  const localConfig = join(fnDir, "deno.json");
  const configArgs = existsSync(localConfig)
    ? ["--config", localConfig]
    : ["--no-config"];
  const result = spawnSync(
    "deno",
    ["check", ...configArgs, "--reload", ...files],
    { encoding: "utf8" },
  );
  const elapsedMs = Date.now() - started;

  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  const combined = `${stdout}\n${stderr}`.trim();

  if (result.status === 0) {
    return { fn, status: "ok", elapsedMs, files: files.length };
  }

  const firstError = parseFirstError(combined);
  return {
    fn,
    status: "failed",
    elapsedMs,
    files: files.length,
    exitCode: result.status,
    firstError,
    rawHead: combined.split("\n").slice(0, 40).join("\n"),
  };
}

// ---------- main ----------
const denoVersion = ensureDeno();
const functions = listFunctions();

console.log(`\n🔎 Triage Deno typecheck por Edge Function`);
console.log(`   ${denoVersion}`);
console.log(`   modo: ${failFast ? "fail-fast (para na 1ª falha)" : "varredura completa"}`);
console.log(`   alvos: ${functions.length} função(ões)\n`);

const results = [];
let firstFailure = null;

for (const fn of functions) {
  process.stdout.write(`  • ${fn.padEnd(40)} `);
  const r = checkFunction(fn);
  results.push(r);
  if (r.status === "ok") {
    console.log(`✅ ok (${r.elapsedMs}ms, ${r.files} arquivo(s))`);
  } else if (r.status === "skipped") {
    console.log(`⏭️  ${r.reason}`);
  } else {
    console.log(`❌ FALHOU (${r.elapsedMs}ms, exit=${r.exitCode})`);
    if (r.firstError) {
      const loc = r.firstError.file
        ? `${r.firstError.file}:${r.firstError.line}:${r.firstError.column}`
        : "(localização não detectada)";
      console.log(`      ↳ ${r.firstError.code}  ${loc}`);
      console.log(
        `      ↳ ${r.firstError.message?.slice(0, 200) || "(sem mensagem)"}`,
      );
    }
    if (!firstFailure) firstFailure = r;
    if (failFast) break;
  }
}

// ---------- relatório ----------
const failures = results.filter((r) => r.status === "failed");
const okCount = results.filter((r) => r.status === "ok").length;
const skipped = results.filter((r) => r.status === "skipped").length;

console.log("\n" + "─".repeat(78));
console.log(`Resumo: ${okCount} ok · ${failures.length} falha(s) · ${skipped} skip`);

if (firstFailure) {
  console.log("\n🩺 Primeira falha (causa raiz candidata):");
  console.log(`   função:  ${firstFailure.fn}`);
  if (firstFailure.firstError) {
    const fe = firstFailure.firstError;
    console.log(`   código:  ${fe.code}`);
    if (fe.file) console.log(`   arquivo: ${fe.file}:${fe.line}:${fe.column}`);
    console.log(`   mensagem: ${fe.message}`);
    console.log("\n   trecho bruto do Deno:");
    for (const l of (fe.snippet || "").split("\n")) console.log(`     ${l}`);
  } else {
    console.log("   (não foi possível extrair erro estruturado — veja rawHead)");
    for (const l of (firstFailure.rawHead || "").split("\n")) console.log(`     ${l}`);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  denoVersion,
  mode: failFast ? "fail-fast" : "all",
  totals: { checked: results.length, ok: okCount, failed: failures.length, skipped },
  firstFailure: firstFailure
    ? {
        fn: firstFailure.fn,
        exitCode: firstFailure.exitCode,
        elapsedMs: firstFailure.elapsedMs,
        firstError: firstFailure.firstError,
      }
    : null,
  failures: failures.map((f) => ({
    fn: f.fn,
    exitCode: f.exitCode,
    elapsedMs: f.elapsedMs,
    firstError: f.firstError,
  })),
  ok: results.filter((r) => r.status === "ok").map((r) => r.fn),
};

writeFileSync(flags.jsonPath, JSON.stringify(report, null, 2));
console.log(`\n📝 Relatório JSON: ${flags.jsonPath}`);

process.exit(failures.length > 0 ? 1 : 0);
