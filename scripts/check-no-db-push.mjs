#!/usr/bin/env node
/**
 * Bloqueia commits que reintroduzem `supabase db push` como instrução operacional.
 *
 * O comando destrói o banco prod do Promo_Gifts dado o desync de migrations
 * (ver docs/redeploy/REDEPLOY-T3-MIGRATIONS-AUDIT.md).
 *
 * Allowlist:
 *   - Entradas terminadas em '/' são tratadas como diretórios (prefix match)
 *   - Entradas sem '/' final exigem igualdade exata (evita bypass via
 *     `DEPLOYMENT.md.tmp`, `DEPLOYMENT.md.bak` etc.)
 *
 * Busca usa regex ERE com whitespace livre para pegar variações como
 * `supabase   db   push` (espaços múltiplos, tabs). Quebra de linha
 * entre tokens não é detectada (git grep é linha-a-linha) — risco
 * negligenciável na prática.
 */
import { execSync } from 'node:child_process';

const ALLOWLIST = [
  // Docs/scripts que explicitamente proíbem ou mencionam o comando:
  'docs/DEPLOYMENT.md',
  'docs/redeploy/REDEPLOY-T3-MIGRATIONS-AUDIT.md',
  'docs/redeploy/REDEPLOY-FASE2-EXECUTION-LOG.md',
  'docs/redeploy/REDEPLOY-FASE3-FINAL.md',
  'supabase/MIGRATIONS_README.md',
  'recovery/agent-db/tasks/FASE_0_setup.md',
  'recovery/analysis/ACHADO_ZERO_OVERLAP_MIGRATIONS.md',
  // CONTRIBUTING e ADR explicam a proibição (não são guia operacional):
  'CONTRIBUTING.md',
  'docs/adr/0006-migration-baseline.md',
  // CHANGELOG cita o comando ao descrever a proibição da Fase 2:
  'CHANGELOG.md',
  // Auditoria de redeploy gerada automaticamente (documenta o desync, não é guia operacional):
  // Diretórios de histórico/auditoria (não são guia operacional ativo):
  'docs/historico/',
  'docs/sessoes/',
  // Arquivo de auditoria na raiz (menciona o comando como proibição):
  'AUDITORIA_REDEPLOY_PROMO_GIFTS_2026-05-13_15-32 (1).md',
  // Auto-referências:
  'scripts/check-no-db-push.mjs',
  'scripts/gen-migrations-readme.mjs',
  // Relatorios de auditoria (referenciam o comando ao descrever o problema):
  'AUDITORIA_REDEPLOY_PROMO_GIFTS_2026-05-13_15-32 (1).md',
  'docs/AUDITORIA_INDEPENDENTE_PRE_PRODUCAO_2026-05-13.md',
  'docs/AUDIT_INDEPENDENTE.md',
  'docs/hardening/',
];

function isAllowed(path) {
  return ALLOWLIST.some((p) =>
    p.endsWith('/') ? path.startsWith(p) : path === p,
  );
}

// ERE: aceita whitespace variável intra-linha (espaços múltiplos, tabs).
// Quebras de linha entre tokens NÃO são detectadas — git grep é linha-a-linha;
// ver header.
const PATTERN = 'supabase[[:space:]]+db[[:space:]]+push';

// Diretórios excluídos da busca (dependências, artifacts, caches).
const EXCLUDE_DIRS = [
  'node_modules', '.git', 'dist', 'build', 'coverage',
  'playwright-report', 'e2e-artifacts', '.next', '.cache',
];

let raw = '';
try {
  const excludeArgs = EXCLUDE_DIRS.map((d) => `--exclude-dir=${d}`).join(' ');
  raw = execSync(
    `grep -rlE ${excludeArgs} -- '${PATTERN}' .`,
    { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
  );
} catch (e) {
  // grep convenciona: exit 1 = nenhum match (não é erro real).
  if (e.status === 1) {
    raw = '';
  } else {
    console.error('check-no-db-push: grep falhou inesperadamente.');
    console.error('  status:', e.status, 'code:', e.code);
    console.error('  stderr:', (e.stderr || '').toString().trim());
    console.error('  message:', e.message);
    process.exit(2);
  }
}

const files = raw
  .split('\n')
  .map((s) => s.trim().replace(/^\.\//, ''))
  .filter(Boolean);

const offenders = files.filter((f) => !isAllowed(f));

if (offenders.length === 0) {
  console.log('✅ check-no-db-push: nenhum uso novo de `supabase db push` detectado.');
  process.exit(0);
}

console.error('❌ check-no-db-push: `supabase db push` reintroduzido fora da allowlist.');
console.error('   Esse comando destruiria o banco prod (ver docs/DEPLOYMENT.md).');
console.error('   Arquivos com match:');
for (const f of offenders) console.error('   -', f);
console.error('');
console.error('   Se o uso for legítimo, adicione o caminho à ALLOWLIST em scripts/check-no-db-push.mjs');
console.error('   e justifique em commit message.');
process.exit(1);
