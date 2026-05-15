#!/usr/bin/env node
/**
 * check-seller-scope.mjs
 *
 * Checker estático de defesa em profundidade: falha o CI se alguma query
 * Supabase para tabelas críticas do vendedor (quotes, orders,
 * discount_approval_requests) não aplicar escopo de seller.
 *
 * Sinais aceitos como "scope aplicado" no statement (até 40 linhas após o `.from`):
 *   - applySellerScope(
 *   - .eq("seller_id", ...)  /  .eq('seller_id', ...)
 *   - .in("seller_id", ...)  /  .in('seller_id', ...)
 *   - .match({ seller_id: ... })
 *   - filter("seller_id", ...)
 *   - .or("seller_id.eq...,seller_id.in...")
 *   - comentário de allowlist na mesma linha ou linha anterior do `.from`:
 *       // rls-allow: <razão>
 *
 * Allowlist por arquivo (caminhos onde o filtro é aplicado server-side via RPC,
 * edge function admin, ou onde o RLS já é suficiente e há justificativa documentada):
 * usar a anotação inline `// rls-allow: <razão>`.
 *
 * Uso:
 *   node scripts/check-seller-scope.mjs
 *   node scripts/check-seller-scope.mjs --json   # saída para CI
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const TABLES = ["quotes", "orders", "discount_approval_requests"];
const WINDOW_LINES = 40;

const SCOPE_SIGNALS = [
  /applySellerScope\s*\(/,
  /\.eq\(\s*["']seller_id["']\s*,/,
  /\.in\(\s*["']seller_id["']\s*,/,
  /\.match\(\s*\{\s*[^}]*seller_id\s*:/,
  /\.filter\(\s*["']seller_id["']\s*,/,
  /\.or\(\s*["'][^"']*seller_id\.(eq|in)/,
  // RPC server-side calls que aplicam seller scope no banco
  /supabase\.rpc\(/,
];

const ALLOW_INLINE = /\/\/\s*rls-allow\s*:\s*\S+/;

// Diretórios ignorados (testes, mocks, helpers de scope, loggers).
const IGNORE_DIR = new Set(["__tests__", "node_modules", "dist", "build"]);
const IGNORE_FILE_SUFFIX = [".test.ts", ".test.tsx", ".spec.ts", ".spec.tsx"];
const IGNORE_FILE_PATHS = new Set([
  "src/lib/auth/apply-seller-scope.ts",
  "src/lib/security/rls-denial-logger.ts",
]);

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

function isIgnored(relPath) {
  if (IGNORE_FILE_PATHS.has(relPath.replaceAll("\\", "/"))) return true;
  return IGNORE_FILE_SUFFIX.some((s) => relPath.endsWith(s));
}

function findTableRefs(lines, table) {
  const re = new RegExp(`\\.from\\(\\s*["']${table}["']\\s*\\)`);
  const refs = [];
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i])) refs.push(i);
  }
  return refs;
}

function statementHasScope(lines, startIdx) {
  const end = Math.min(lines.length, startIdx + WINDOW_LINES);
  // Statement termina no primeiro `;` em fim de linha (heurística suficiente
  // para o estilo de código do projeto, que sempre fecha com `;`).
  let endIdx = end;
  for (let i = startIdx; i < end; i++) {
    if (/;\s*(\/\/.*)?$/.test(lines[i])) {
      endIdx = i + 1;
      break;
    }
  }
  const block = lines.slice(startIdx, endIdx).join("\n");
  return SCOPE_SIGNALS.some((re) => re.test(block));
}

function hasAllowAnnotation(lines, idx) {
  if (ALLOW_INLINE.test(lines[idx])) return true;
  if (idx > 0 && ALLOW_INLINE.test(lines[idx - 1])) return true;
  return false;
}

const violations = [];
for (const file of walk(SRC)) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  if (isIgnored(rel)) continue;
  const src = readFileSync(file, "utf8");
  const lines = src.split("\n");
  for (const table of TABLES) {
    for (const idx of findTableRefs(lines, table)) {
      if (hasAllowAnnotation(lines, idx)) continue;
      if (statementHasScope(lines, idx)) continue;
      violations.push({
        file: rel,
        line: idx + 1,
        table,
        snippet: lines[idx].trim(),
      });
    }
  }
}

const asJson = process.argv.includes("--json");

if (asJson) {
  console.log(JSON.stringify({ ok: violations.length === 0, violations }, null, 2));
} else {
  if (violations.length === 0) {
    console.log("✅ seller-scope check passed — todas as queries para tabelas críticas aplicam seller scope.");
  } else {
    console.error(`❌ seller-scope check falhou — ${violations.length} violação(ões):\n`);
    for (const v of violations) {
      console.error(`  • ${v.file}:${v.line}  [${v.table}]`);
      console.error(`      ${v.snippet}`);
    }
    console.error(
      "\nResolva aplicando uma das opções:\n" +
        "  1) Use applySellerScope(query, { scope, userId }) do src/lib/auth/apply-seller-scope.ts\n" +
        '  2) Adicione .eq("seller_id", userId) explícito\n' +
        "  3) Se a query é legítima sem scope (RPC server-side, admin scope=all),\n" +
        "     anote com // rls-allow: <razão> na linha do .from(...) ou imediatamente acima.\n",
    );
  }
}

process.exit(violations.length === 0 ? 0 : 1);
