#!/usr/bin/env node
/**
 * Gera supabase/functions/README.md com catálogo das edge functions.
 *
 * Standalone: lê manifest + filesystem + faz scan de callers via grep.
 * Não depende de arquivos temporários.
 *
 * Uso: node scripts/gen-edges-readme.mjs > supabase/functions/README.md
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const FUNCS_DIR = join(ROOT, 'supabase/functions');

// 1. Parse manifest
const manifestSrc = readFileSync(join(FUNCS_DIR, '_shared/edge-authz-manifest.ts'), 'utf8');
const manifest = {};
const re = /"([^"]+)":\s*\{\s*category:\s*"(\w+)",\s*rationale:\s*"([^"]+)"/g;
let m;
while ((m = re.exec(manifestSrc)) !== null) {
  manifest[m[1]] = { category: m[2], rationale: m[3] };
}

// 2. Lista de dirs (filesystem direto, ignora _shared/tests/deno.json)
const SKIP = new Set(['_shared', 'tests', 'deno.json']);
const allDirs = readdirSync(FUNCS_DIR)
  .filter(name => {
    if (SKIP.has(name)) return false;
    try {
      return statSync(join(FUNCS_DIR, name)).isDirectory();
    } catch { return false; }
  })
  .sort();

// 3. Callers (grep direto no src/)
const callers = {};
for (const dir of allDirs) {
  try {
    // grep retorna exit 1 se não encontra; capture stderr e ignore
    const out = execSync(
      `grep -rE "functions\\.invoke\\(['\\"']${dir}['\\"']|invoke\\(['\\"']${dir}['\\"']" --include='*.ts' --include='*.tsx' src/ 2>/dev/null || true`,
      { encoding: 'utf8' }
    );
    callers[dir] = out.trim() ? out.trim().split('\n').length : 0;
  } catch {
    callers[dir] = 0;
  }
}

// 4. LOC do index.ts
const loc = {};
for (const dir of allDirs) {
  try {
    const idxPath = join(FUNCS_DIR, dir, 'index.ts');
    loc[dir] = readFileSync(idxPath, 'utf8').split('\n').length;
  } catch { loc[dir] = 0; }
}

// 5. Categorize
const byCategory = { public: [], authenticated: [], supervisor: [], dev: [], service: [], scoped: [], '?': [] };
for (const dir of allDirs) {
  const m = manifest[dir];
  const cat = m?.category || '?';
  byCategory[cat] ??= [];
  byCategory[cat].push({
    name: dir,
    rationale: m?.rationale || '(sem entrada no manifest)',
    callers: callers[dir] || 0,
    loc: loc[dir] || 0,
  });
}

// 6. Identificar órfãs
const potentiallyOrphan = allDirs.filter(d => {
  const m = manifest[d];
  if (!m) return false;
  if (['authenticated', 'supervisor'].includes(m.category) && (callers[d] || 0) === 0) return true;
  return false;
}).sort();

// 7. Gera markdown
const cs = (cat) => byCategory[cat]?.length || 0;
let md = `# Edge Functions — Catálogo

> Documento gerado em ${new Date().toISOString().split('T')[0]} pela auditoria da Faxina F1.
> Catálogo de **${allDirs.length} edge functions** ativas no Supabase deste repo.

## 📋 Visão geral por categoria

| Categoria | Qtd | Descrição |
|---|---|---|
| **public** | ${cs('public')} | Chamável sem autenticação (rotas públicas, webhooks, health, image-proxy) |
| **authenticated** | ${cs('authenticated')} | Exige JWT válido, qualquer role logada |
| **supervisor** | ${cs('supervisor')} | Exige role >= supervisor (admin/dev) |
| **dev** | ${cs('dev')} | Exige role dev (debugging, secrets, MCP keys) |
| **service** | ${cs('service')} | Server-to-server (cron / outras edges) — não invocada pelo front |
| **scoped** | ${cs('scoped')} | Auth custom (HMAC, MCP scope, webhook signature) |

A categoria de cada função é a fonte de verdade em \`_shared/edge-authz-manifest.ts\` e o gate de CI \`scripts/check-edge-authorization.mjs\` falha se houver função sem entrada no manifest.

## 🚨 Funções potencialmente órfãs

Edges \`authenticated\` ou \`supervisor\` com **zero invocações no front** (\`functions.invoke('nome')\`). Candidatas a investigação — podem ser código morto, ou podem ser chamadas por mecanismos que esta busca não pega (outros edges, cron, webhooks externos).

`;

if (potentiallyOrphan.length > 0) {
  md += '| Função | Categoria | Rationale |\n|---|---|---|\n';
  for (const name of potentiallyOrphan) {
    const m = manifest[name];
    md += `| \`${name}\` | ${m.category} | ${m.rationale} |\n`;
  }
} else {
  md += '_Nenhuma órfã óbvia detectada._\n';
}
md += `\n_Total potencialmente órfãs: **${potentiallyOrphan.length}**_\n\n`;

const catOrder = ['public', 'authenticated', 'supervisor', 'dev', 'service', 'scoped', '?'];
const catTitles = {
  public: '🌐 Públicas (sem autenticação)',
  authenticated: '🔐 Autenticadas (qualquer user logado)',
  supervisor: '👑 Supervisor / Admin',
  dev: '🛠 Dev-only',
  service: '⚙️ Service / Cron',
  scoped: '🎫 Scoped (auth custom)',
  '?': '❓ Sem entrada no manifest'
};

for (const cat of catOrder) {
  const list = byCategory[cat] || [];
  if (list.length === 0) continue;
  md += `\n## ${catTitles[cat]} (${list.length})\n\n`;
  md += '| Função | Propósito | LOC | Callers (front) |\n|---|---|---:|---:|\n';
  for (const f of list.sort((a, b) => a.name.localeCompare(b.name))) {
    const callerStr = f.callers > 0 ? `${f.callers}` : (cat === 'service' || cat === 'scoped' || cat === 'public' ? '— (não chamada do front por design)' : '**0 ⚠️**');
    md += `| \`${f.name}\` | ${f.rationale} | ${f.loc} | ${callerStr} |\n`;
  }
}

md += `\n## 📊 Top 10 maiores funções por LOC\n\n`;
md += '| Função | LOC | Categoria |\n|---|---:|---|\n';
const topLoc = allDirs
  .map(d => ({ name: d, loc: loc[d] || 0, cat: manifest[d]?.category || '?' }))
  .sort((a, b) => b.loc - a.loc)
  .slice(0, 10);
for (const f of topLoc) md += `| \`${f.name}\` | ${f.loc} | ${f.cat} |\n`;

md += `\n## 🔥 Top 10 funções mais invocadas (no front)\n\n`;
md += '| Função | Callers | Categoria |\n|---|---:|---|\n';
const topCallers = allDirs
  .map(d => ({ name: d, c: callers[d] || 0, cat: manifest[d]?.category || '?' }))
  .filter(f => f.c > 0)
  .sort((a, b) => b.c - a.c)
  .slice(0, 10);
for (const f of topCallers) md += `| \`${f.name}\` | ${f.c} | ${f.cat} |\n`;

md += `
## 🏗 Convenções

- **Estrutura**: \`supabase/functions/<nome>/index.ts\`
- **Fonte de verdade da autorização**: \`_shared/edge-authz-manifest.ts\` — toda edge nova precisa ser adicionada aqui no mesmo PR.
- **Gate de CI**: \`scripts/check-edge-authorization.mjs\` falha se houver função em \`supabase/functions/<name>/index.ts\` ausente do manifest.
- **Testes de bypass**: \`tests/security/edge-authz-bypass.test.ts\` valida que cada edge respeita sua categoria declarada.

## 🔍 Como investigar uma função

1. Ler \`supabase/functions/<nome>/index.ts\` (o handler)
2. Ler \`_shared/edge-authz-manifest.ts\` (categoria + rationale)
3. Buscar callers no front: \`grep -r "functions.invoke('<nome>')" src/\`
4. Verificar logs em produção: dashboard Supabase → Functions → \`<nome>\` → Logs

---

_Doc gerado automaticamente. Pra atualizar: \`node scripts/gen-edges-readme.mjs > supabase/functions/README.md\`._
`;

console.log(md);
