#!/usr/bin/env node
/**
 * Detector estático: uso indevido de `ref` / `forwardRef` em componentes
 * de rota.
 *
 * O React Router (modo declarativo `<BrowserRouter>` + `<Routes>`) NÃO
 * passa refs para o componente em `<Route element={<X />} />`. Portanto:
 *
 *   1. Route guards (AdminRoute, DevRoute, ProtectedRoute) NÃO devem usar
 *      `forwardRef` — qualquer ref ali seria sempre `undefined`/morta e
 *      sinaliza confusão arquitetural.
 *
 *   2. Componentes referenciados em `<Route element={<X />}` no router
 *      principal NÃO devem declarar prop `ref` no tipo de props nem
 *      receber `ref` como segundo argumento de função (sem forwardRef),
 *      pois receberiam o warning canônico do React.
 *
 *   3. Page components no diretório `src/pages/**` NÃO devem usar
 *      `forwardRef` na sua função top-level export — o Router não
 *      fornecerá ref, então é dead code e sinal de pattern errado.
 *
 * Allowlist por linha: `// route-ref-allow: motivo` (na linha da
 * declaração ou imediatamente acima).
 *
 * Referência: docs/security/SELLER_SCOPE_CHECKER.md (padrão de checker
 * estático), mem://ui/radix-nesting-ref-standard.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// ROOT honra ROUTE_REF_ROOT (usado por testes com fixtures); padrão é o
// diretório-pai do script (raiz do repositório).
const ROOT = process.env.ROUTE_REF_ROOT
  ? path.resolve(process.env.ROUTE_REF_ROOT)
  : path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

// --- Configuração ---------------------------------------------------------

/** Componentes que SÃO route guards (não podem usar forwardRef). */
const ROUTE_GUARDS = new Set([
  "AdminRoute",
  "DevRoute",
  "ProtectedRoute",
  "DeprecatedRoute",
]);

/** Diretórios cujo conteúdo é renderizado diretamente pelo Router. */
const ROUTE_DIRS = [
  path.join(SRC, "pages"),
];

/** Allowlist global (caminhos relativos a ROOT) — arquivos ignorados. */
const FILE_ALLOWLIST = new Set([
  // Páginas que PRECISAM de forwardRef por motivos legítimos vão aqui.
  // Manter vazio por padrão; documentar caso a caso.
]);

// --- Utils ----------------------------------------------------------------

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (["node_modules", ".git", "__tests__"].includes(e.name)) continue;
      out.push(...(await walk(full)));
    } else if (/\.(tsx|jsx)$/.test(e.name)) out.push(full);
  }
  return out;
}

function lineOf(source, idx) {
  return source.slice(0, idx).split("\n").length;
}

function hasAllowComment(source, lineNum) {
  const lines = source.split("\n");
  const here = lines[lineNum - 1] ?? "";
  const above = lines[lineNum - 2] ?? "";
  return /route-ref-allow:/i.test(here) || /route-ref-allow:/i.test(above);
}

// --- Regras ---------------------------------------------------------------

const violations = [];

/** Regra 1: route guard usando forwardRef. */
async function ruleGuardsNoForwardRef(file, source) {
  const base = path.basename(file, path.extname(file));
  if (!ROUTE_GUARDS.has(base)) return;
  const re = /(?:React\.)?forwardRef\s*[<(]/g;
  let m;
  while ((m = re.exec(source))) {
    const line = lineOf(source, m.index);
    if (hasAllowComment(source, line)) continue;
    violations.push({
      rule: "guard-no-forwardRef",
      file: path.relative(ROOT, file),
      line,
      detail: `Route guard '${base}' não deve usar forwardRef — Router não passa ref para <Route element>.`,
    });
  }
}

/**
 * Regra 2: componente top-level com prop `ref` no tipo, ou recebendo `ref`
 * como segundo argumento sem forwardRef. Aplicável a guards e a páginas.
 */
function ruleNoRefProp(file, source) {
  const base = path.basename(file, path.extname(file));
  const isGuard = ROUTE_GUARDS.has(base);
  const isPage = ROUTE_DIRS.some((d) => file.startsWith(d + path.sep));
  if (!isGuard && !isPage) return;

  // Procura `export (default )?function NAME(props, ref)` — assinatura
  // suspeita (segundo argumento "ref" em função normal — não forwardRef).
  const fnRe = /export\s+(?:default\s+)?function\s+([A-Z][A-Za-z0-9_]*)\s*\(([^)]*)\)/g;
  let m;
  while ((m = fnRe.exec(source))) {
    const args = m[2];
    // Função pura com 2 parâmetros e o segundo nomeado `ref` é red flag.
    const params = args.split(",").map((p) => p.trim()).filter(Boolean);
    if (params.length >= 2 && /(^|\b)ref\b/.test(params[1])) {
      const line = lineOf(source, m.index);
      if (hasAllowComment(source, line)) continue;
      violations.push({
        rule: "no-ref-second-arg",
        file: path.relative(ROOT, file),
        line,
        detail: `'${m[1]}' aceita 'ref' como 2º argumento sem forwardRef — causa warning do React.`,
      });
    }
  }

  // Procura `interface XProps { ... ref?: ... }` ou `type XProps = { ... ref?: ... }`
  // em arquivos de rota — sinal de tentar passar ref via prop manualmente.
  const propsRe =
    /(?:interface|type)\s+[A-Z][A-Za-z0-9_]*Props\b[^{]*\{([^}]+)\}/g;
  while ((m = propsRe.exec(source))) {
    if (/(^|\s|;|,)ref\s*[:?]/.test(m[1])) {
      const refIdx = m.index + m[0].indexOf("ref");
      const line = lineOf(source, refIdx);
      if (hasAllowComment(source, line)) continue;
      violations.push({
        rule: "no-ref-in-props-type",
        file: path.relative(ROOT, file),
        line,
        detail: `Tipo de Props declara 'ref' explicitamente — use forwardRef ou renomeie para 'innerRef'/'rootRef'.`,
      });
    }
  }
}

/**
 * Regra 3: página em src/pages/** com forwardRef no export TOP-LEVEL da
 * própria página (default export OU export cujo nome bate com o nome do
 * arquivo). Sub-componentes auxiliares no mesmo arquivo são ignorados —
 * eles podem usar forwardRef legitimamente.
 */
function rulePagesNoForwardRef(file, source) {
  const isPage = ROUTE_DIRS.some((d) => file.startsWith(d + path.sep));
  if (!isPage) return;
  const baseName = path.basename(file, path.extname(file));

  // Casos que importam:
  //   export default forwardRef(...)
  //   export default React.forwardRef(...)
  //   const NAME = forwardRef(...); export default NAME;
  //   export const NAME = forwardRef(...);   // onde NAME === baseName
  const patterns = [
    {
      re: /export\s+default\s+(?:React\.)?forwardRef\s*[<(]/g,
      why: "default export usa forwardRef",
    },
    {
      re: new RegExp(
        `export\\s+const\\s+${baseName}\\s*=\\s*(?:React\\.)?forwardRef\\s*[<(]`,
        "g",
      ),
      why: `export const ${baseName} (top-level da página) usa forwardRef`,
    },
  ];

  for (const { re, why } of patterns) {
    let m;
    while ((m = re.exec(source))) {
      const line = lineOf(source, m.index);
      if (hasAllowComment(source, line)) continue;
      violations.push({
        rule: "pages-no-forwardRef",
        file: path.relative(ROOT, file),
        line,
        detail: `Page '${path.relative(SRC, file)}': ${why} — Router não fornece ref; remova o forwardRef.`,
      });
    }
  }

  // Padrão `const NAME = forwardRef(...); export default NAME;`
  const namedDef = /const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*(?:React\.)?forwardRef\s*[<(]/g;
  let m;
  while ((m = namedDef.exec(source))) {
    const name = m[1];
    const defaultExportRe = new RegExp(`export\\s+default\\s+${name}\\b`);
    if (!defaultExportRe.test(source)) continue;
    const line = lineOf(source, m.index);
    if (hasAllowComment(source, line)) continue;
    violations.push({
      rule: "pages-no-forwardRef",
      file: path.relative(ROOT, file),
      line,
      detail: `Page '${path.relative(SRC, file)}': '${name}' (export default) usa forwardRef — Router não fornece ref.`,
    });
  }
}

// --- Runner ---------------------------------------------------------------

async function checkFile(file) {
  if (FILE_ALLOWLIST.has(path.relative(ROOT, file))) return;
  const source = await fs.readFile(file, "utf8");
  await ruleGuardsNoForwardRef(file, source);
  ruleNoRefProp(file, source);
  rulePagesNoForwardRef(file, source);
}

async function main() {
  const guardFiles = (await walk(path.join(SRC, "components", "layout"))).filter(
    (f) => ROUTE_GUARDS.has(path.basename(f, path.extname(f))),
  );
  const pageFiles = await walk(path.join(SRC, "pages"));
  const files = [...new Set([...guardFiles, ...pageFiles])];
  await Promise.all(files.map(checkFile));

  if (violations.length === 0) {
    console.log(
      `✓ route-ref checker: nenhum uso indevido de ref/forwardRef encontrado ` +
        `(${files.length} arquivos varridos: ${guardFiles.length} guards + ${pageFiles.length} pages).`,
    );
    process.exit(0);
  }

  console.error(
    `\n✗ route-ref checker: ${violations.length} violação(ões) encontrada(s):\n`,
  );
  // Agrupa por regra para legibilidade.
  const byRule = new Map();
  for (const v of violations) {
    if (!byRule.has(v.rule)) byRule.set(v.rule, []);
    byRule.get(v.rule).push(v);
  }
  for (const [rule, list] of byRule) {
    console.error(`  [${rule}] ${list.length} ocorrência(s):`);
    for (const v of list) {
      console.error(`    ${v.file}:${v.line}  ${v.detail}`);
    }
  }
  console.error(
    `\nCorreções:\n` +
      `  • Route guards: remover forwardRef e retornar <Outlet /> ou children diretamente.\n` +
      `  • Páginas: remover forwardRef do export top-level (ou mover ref para um sub-componente).\n` +
      `  • Tipos com 'ref': renomear para 'innerRef'/'rootRef' OU converter o componente em forwardRef.\n` +
      `  • Allowlist por linha: '// route-ref-allow: motivo'.\n`,
  );
  process.exit(1);
}

main().catch((err) => {
  console.error("Erro inesperado no route-ref checker:", err);
  process.exit(2);
});
