#!/usr/bin/env node
/**
 * Bloqueia migrations que adicionam funções SECURITY DEFINER novas
 * sem hardening mínimo (search_path explícito + REVOKE de anon/authenticated
 * quando não-RLS helper).
 *
 * Heurística:
 *   - Detecta arquivos novos em supabase/migrations/ que contêm
 *     CREATE FUNCTION ... SECURITY DEFINER
 *   - Para cada uma, exige que o MESMO arquivo contenha:
 *       1) SET search_path TO ... (qualquer forma)
 *       2) REVOKE EXECUTE ... FROM anon (ou comentário explicitando
 *          que a função é helper de RLS legítimo)
 *
 * Allowlist: arquivos históricos do repo ficam livres para evitar quebra
 * de baseline; só novos arquivos (adicionados na PR) são validados.
 *
 * Uso CI: rodar com `node scripts/check-security-definer-hardening.mjs`.
 * Em PR: compara HEAD vs base.
 */
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';

const ADDED_FILES = (() => {
  // Em CI: GITHUB_BASE_REF aponta para base da PR.
  const baseRef = process.env.GITHUB_BASE_REF || 'main';
  try {
    const out = execSync(
      `git diff --name-only --diff-filter=A origin/${baseRef}...HEAD -- 'supabase/migrations/*.sql'`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
    );
    return out.split('\n').filter(Boolean);
  } catch {
    // Fora de PR (ex: rodando local sem origin/main): valida só arquivos
    // não-rastreados ou modificados.
    try {
      const out = execSync('git status --porcelain -- "supabase/migrations/*.sql"', {
        encoding: 'utf8',
      });
      return out
        .split('\n')
        .filter((l) => /^[AM]/.test(l))
        .map((l) => l.slice(3).trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  }
})();

if (ADDED_FILES.length === 0) {
  console.log('✅ check-security-definer-hardening: nenhuma migration nova para validar.');
  process.exit(0);
}

const offenders = [];

for (const path of ADDED_FILES) {
  if (!existsSync(path)) continue;
  const content = readFileSync(path, 'utf8');
  const lower = content.toLowerCase();

  // Detecta CREATE FUNCTION ... SECURITY DEFINER em qualquer ordem (até 500 chars entre).
  const hasSdCreate = /create\s+(or\s+replace\s+)?function[\s\S]{0,500}security\s+definer/i.test(
    content,
  );
  if (!hasSdCreate) continue;

  const hasSearchPath = /set\s+search_path\s+to/i.test(content) || /search_path\s*=/i.test(content);
  // Aceita revoke explícito OU comentário marcador para helper de RLS.
  const hasRevokeAnon =
    /revoke\s+execute[\s\S]{0,200}\bfrom\b[\s\S]{0,200}\banon\b/i.test(content) ||
    /--\s*rls-helper:/i.test(lower);

  if (!hasSearchPath || !hasRevokeAnon) {
    offenders.push({
      path,
      missing_search_path: !hasSearchPath,
      missing_revoke_or_marker: !hasRevokeAnon,
    });
  }
}

if (offenders.length === 0) {
  console.log(
    `✅ check-security-definer-hardening: ${ADDED_FILES.length} migration(s) nova(s) validadas com hardening completo.`,
  );
  process.exit(0);
}

console.error('❌ check-security-definer-hardening: migrations novas sem hardening de SECURITY DEFINER:');
for (const o of offenders) {
  console.error(`   - ${o.path}`);
  if (o.missing_search_path) console.error('       ⤷ FALTA: SET search_path TO ...');
  if (o.missing_revoke_or_marker)
    console.error(
      "       ⤷ FALTA: REVOKE EXECUTE ... FROM anon (ou comentário '-- rls-helper:' justificando)",
    );
}
console.error('');
console.error('Toda função SECURITY DEFINER nova deve incluir, no mesmo arquivo:');
console.error('  1) SET search_path TO pg_catalog, public (ou equivalente)');
console.error('  2) REVOKE EXECUTE ON FUNCTION ... FROM anon (e authenticated se admin-only)');
console.error('     OU comentário "-- rls-helper: <razão>" se a função é callable de policy RLS');
console.error('');
console.error('Detalhes: docs/redeploy/REDEPLOY-FASE3-PLAN.md');
process.exit(1);
