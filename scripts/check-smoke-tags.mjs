#!/usr/bin/env node
/**
 * check-smoke-tags — Garante que todo `test(...)` em
 * `e2e/flows/20-all-features-smoke.spec.ts` está dentro de um
 * `test.describe(...)` cujo título contenha a tag `@smoke`.
 *
 * Por quê: o project Playwright `chromium-smoke` usa `grep: /@smoke/`
 * (vide playwright.config.ts). Tests fora de um describe `@smoke` são
 * silenciosamente IGNORADOS pelo gate — bug invisível.
 *
 * Estratégia (parser leve por linha — sem ts-node/babel):
 *   1. Varre o arquivo linha a linha rastreando profundidade `{ ... }`.
 *   2. Empilha cada `test.describe("...", () => {` registrando título +
 *      depth de abertura. Faz pop quando a depth volta ao patamar.
 *   3. Para cada `test("...", ...)`, checa se há ALGUM describe ativo na
 *      pilha cujo título contenha `@smoke`. Se não → reporta violação.
 *   4. Falha hard (exit 1) se houver violações OU se o array
 *      `SMOKE_COVERAGE` estiver vazio (sanity).
 *
 * Limitações conscientes:
 *   - Não tokeniza comentários multi-line `/* ... *​/` que envolvam um
 *     `test(...)` — risco aceitável (smoke spec não usa esse padrão).
 *   - Strings template com `{` dentro são tratadas como código; o spec
 *     do smoke não tem isso.
 *
 * Uso:
 *   node scripts/check-smoke-tags.mjs           # local
 *   npm run check:smoke-tags                    # alias
 *   (CI: roda no workflow E2E antes do gate)
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SPEC = resolve(ROOT, "e2e/flows/20-all-features-smoke.spec.ts");

const C = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};
const isCI = process.env.CI === "true" || process.env.CI === "1";

if (!existsSync(SPEC)) {
  console.error(`${C.red}❌ Spec do smoke não encontrado: ${SPEC}${C.reset}`);
  process.exit(2);
}

const src = readFileSync(SPEC, "utf8");
const lines = src.split("\n");

/* ── Parser de profundidade ─────────────────────────────────
 * Conta `{` e `}` ignorando os que estão dentro de strings/templates/
 * comentários de linha. Suficiente para o estilo do spec do smoke. */
function countBraces(line) {
  let opens = 0;
  let closes = 0;
  let inStr = null; // null | '"' | "'" | "`"
  let prev = "";
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inStr) {
      if (c === inStr && prev !== "\\") inStr = null;
    } else {
      if (c === "/" && line[i + 1] === "/") break; // comentário de linha
      if (c === '"' || c === "'" || c === "`") inStr = c;
      else if (c === "{") opens++;
      else if (c === "}") closes++;
    }
    prev = c;
  }
  return { opens, closes };
}

/* ── Scan ─────────────────────────────────────────────────── */
const RE_DESCRIBE = /\btest\.describe(?:\.configure|\.skip|\.only)?\(\s*["'`]([^"'`]+)["'`]/;
const RE_TEST = /\btest(?:\.skip|\.only|\.fixme)?\(\s*["'`]([^"'`]+)["'`]/;

/** Pilha: { title, openDepth } */
const describeStack = [];
let depth = 0;
const violations = [];
const testsSeen = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNo = i + 1;

  // Detecta abertura de describe ANTES de contar braces — o `{` do
  // arrow function abre na mesma linha tipicamente.
  const mDesc = line.match(RE_DESCRIBE);
  if (mDesc && !line.includes("describe.configure")) {
    // `configure({...})` não é um bloco describe — pular.
    describeStack.push({ title: mDesc[1], openDepth: depth });
  }

  // Detecta test() — registra para validação.
  const mTest = line.match(RE_TEST);
  if (mTest && !line.includes("test.describe") && !line.includes("test.use")) {
    const activeDescribes = describeStack.map((d) => d.title);
    const hasSmoke = activeDescribes.some((t) => /@smoke\b/.test(t));
    testsSeen.push({ line: lineNo, title: mTest[1], describes: activeDescribes, hasSmoke });
    if (!hasSmoke) {
      violations.push({
        line: lineNo,
        test: mTest[1],
        describes: activeDescribes.length > 0 ? activeDescribes : ["(top-level — sem describe)"],
      });
    }
  }

  // Atualiza profundidade ao final da linha.
  const { opens, closes } = countBraces(line);
  depth += opens - closes;

  // Pop describes cuja depth de abertura é >= depth atual.
  while (describeStack.length > 0 && describeStack[describeStack.length - 1].openDepth >= depth) {
    describeStack.pop();
  }
}

/* ── Sanity: SMOKE_COVERAGE não vazio ─────────────────────── */
const covMatch = src.match(/const\s+SMOKE_COVERAGE\s*=\s*\[([\s\S]*?)\]\s*as const/);
const covCount = covMatch ? [...covMatch[1].matchAll(/"[^"]+"/g)].length : 0;

/* ── Relatório ────────────────────────────────────────────── */
console.log(`${C.bold}═══ check-smoke-tags ═══${C.reset}`);
console.log(`${C.dim}Spec:${C.reset} e2e/flows/20-all-features-smoke.spec.ts`);
console.log(
  `${C.dim}Tests detectados:${C.reset} ${testsSeen.length}  ${C.dim}|${C.reset}  ` +
    `${C.dim}SMOKE_COVERAGE:${C.reset} ${covCount} entradas`,
);

let exitCode = 0;

if (covCount === 0) {
  console.error(`\n${C.red}❌ SMOKE_COVERAGE está vazio ou ausente.${C.reset}`);
  exitCode = 1;
}

if (violations.length === 0) {
  console.log(
    `\n${C.green}✅ Todos os ${testsSeen.length} test() estão sob describe @smoke.${C.reset}\n`,
  );
} else {
  console.error(
    `\n${C.red}❌ ${violations.length} test(s) FORA de describe @smoke:${C.reset}\n`,
  );
  for (const v of violations) {
    console.error(
      `  ${C.red}✗${C.reset} ${C.bold}${SPEC.replace(ROOT + "/", "")}:${v.line}${C.reset}`,
    );
    console.error(`      test: "${v.test}"`);
    console.error(`      describes ativos: ${v.describes.map((d) => `"${d}"`).join(" › ") || "—"}`);
    if (isCI) {
      // Annotation clicável no PR (aba "Files Changed").
      const safeMsg = `Test "${v.test}" não está sob describe @smoke — ficará INVISÍVEL ao gate (grep /@smoke/ no chromium-smoke).`;
      console.log(
        `::error file=e2e/flows/20-all-features-smoke.spec.ts,line=${v.line},title=Smoke tag missing::${safeMsg}`,
      );
    }
  }
  console.error(
    `\n${C.yellow}→ Solução:${C.reset} envolver o(s) test(s) em ` +
      `${C.bold}test.describe("@smoke ...", () => { ... })${C.reset} ` +
      `ou mover para fora do spec do smoke.\n`,
  );
  exitCode = 1;
}

process.exit(exitCode);
