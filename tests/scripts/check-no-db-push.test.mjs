/**
 * Tests for scripts/check-no-db-push.mjs
 *
 * Scope: only the logic changed/added in this PR is tested:
 *   - The isAllowed() function (allowlist matching semantics)
 *   - The presence of the new ALLOWLIST entry:
 *     'AUDITORIA_REDEPLOY_PROMO_GIFTS_2026-05-13_15-32 (1).md'
 *
 * NOTE: The script executes side-effectful code (execSync, process.exit) at
 * the module top-level, so we cannot safely import it directly. Instead we
 * re-implement the ALLOWLIST and isAllowed() logic here and also verify the
 * source file's content. If the logic in the script ever changes, this test
 * must be kept in sync.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─────────────────────────────────────────────────────────────────────────────
// Mirror of the ALLOWLIST and isAllowed() from scripts/check-no-db-push.mjs
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWLIST = [
  // Docs/scripts que explicitamente proíbem ou mencionam o comando:
  'docs/DEPLOYMENT.md',
  'docs/redeploy/REDEPLOY-T3-MIGRATIONS-AUDIT.md',
  'docs/redeploy/REDEPLOY-FASE2-EXECUTION-LOG.md',
  'docs/redeploy/REDEPLOY-FASE3-FINAL.md',
  'supabase/migrations/README.md',
  'recovery/agent-db/tasks/FASE_0_setup.md',
  'recovery/analysis/ACHADO_ZERO_OVERLAP_MIGRATIONS.md',
  // CONTRIBUTING e ADR explicam a proibição (não são guia operacional):
  'CONTRIBUTING.md',
  'docs/adr/0006-migration-baseline.md',
  // CHANGELOG cita o comando ao descrever a proibição da Fase 2:
  'CHANGELOG.md',
  // Diretórios de histórico/auditoria (não são guia operacional ativo):
  'docs/historico/',
  'docs/sessoes/',
  // Auto-referências:
  'scripts/check-no-db-push.mjs',
  'scripts/gen-migrations-readme.mjs',
  // Arquivo de auditoria na raiz (cita o comando para alertar contra seu uso):
  'AUDITORIA_REDEPLOY_PROMO_GIFTS_2026-05-13_15-32 (1).md',
];

function isAllowed(path) {
  return ALLOWLIST.some((p) =>
    p.endsWith('/') ? path.startsWith(p) : path === p,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests: new ALLOWLIST entry
// ─────────────────────────────────────────────────────────────────────────────

describe('ALLOWLIST – new entry from PR', () => {
  const NEW_ENTRY = 'AUDITORIA_REDEPLOY_PROMO_GIFTS_2026-05-13_15-32 (1).md';

  it('contains the new audit file entry', () => {
    expect(ALLOWLIST).toContain(NEW_ENTRY);
  });

  it('isAllowed() returns true for the new audit file (exact match)', () => {
    expect(isAllowed(NEW_ENTRY)).toBe(true);
  });

  it('isAllowed() rejects a path that is a prefix of the new entry', () => {
    // e.g. just the base without the suffix — not the same file
    expect(isAllowed('AUDITORIA_REDEPLOY_PROMO_GIFTS_2026-05-13_15-32')).toBe(false);
  });

  it('isAllowed() rejects a path that adds a suffix to the new entry', () => {
    // Must be exact — a .bak or .tmp variant should NOT be allowed
    expect(isAllowed(NEW_ENTRY + '.bak')).toBe(false);
    expect(isAllowed(NEW_ENTRY + '.tmp')).toBe(false);
  });

  it('isAllowed() rejects a path that is a directory containing the new entry name', () => {
    expect(isAllowed('subdir/' + NEW_ENTRY)).toBe(false);
  });

  it('source file contains the new ALLOWLIST entry as a string literal', () => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const scriptPath = resolve(__dirname, '../../scripts/check-no-db-push.mjs');
    const source = readFileSync(scriptPath, 'utf8');
    expect(source).toContain(NEW_ENTRY);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests: isAllowed() core semantics
// ─────────────────────────────────────────────────────────────────────────────

describe('isAllowed() – exact match entries (no trailing slash)', () => {
  it('returns true for exact match', () => {
    expect(isAllowed('docs/DEPLOYMENT.md')).toBe(true);
    expect(isAllowed('CONTRIBUTING.md')).toBe(true);
    expect(isAllowed('CHANGELOG.md')).toBe(true);
    expect(isAllowed('scripts/check-no-db-push.mjs')).toBe(true);
    expect(isAllowed('scripts/gen-migrations-readme.mjs')).toBe(true);
  });

  it('returns false for paths that merely start with an exact-match entry', () => {
    // "DEPLOYMENT.md.tmp" must not be allowed even though it starts with a known path
    expect(isAllowed('docs/DEPLOYMENT.md.tmp')).toBe(false);
    expect(isAllowed('docs/DEPLOYMENT.md.bak')).toBe(false);
    expect(isAllowed('CONTRIBUTING.md.new')).toBe(false);
  });

  it('returns false for paths that are sub-paths of an exact-match entry', () => {
    // e.g. "docs/DEPLOYMENT.md/something" (dir-looking variant)
    expect(isAllowed('docs/DEPLOYMENT.md/sub')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isAllowed('')).toBe(false);
  });

  it('returns false for completely unknown file', () => {
    expect(isAllowed('src/pages/index.tsx')).toBe(false);
    expect(isAllowed('supabase/db-push-helper.sh')).toBe(false);
    expect(isAllowed('DEPLOYMENT.md')).toBe(false); // note: no "docs/" prefix
  });
});

describe('isAllowed() – directory prefix entries (trailing slash)', () => {
  it('returns true for a file directly inside an allowlisted directory', () => {
    expect(isAllowed('docs/historico/some-log.md')).toBe(true);
    expect(isAllowed('docs/sessoes/session-2024.md')).toBe(true);
  });

  it('returns true for a file in a nested subdirectory of an allowlisted directory', () => {
    expect(isAllowed('docs/historico/subdir/deep-file.md')).toBe(true);
    expect(isAllowed('docs/sessoes/jan/feb/entry.txt')).toBe(true);
  });

  it('returns false for a path that is a sibling of the allowlisted directory', () => {
    // "docs/historico" itself (without trailing slash) is not in the allowlist
    expect(isAllowed('docs/historico')).toBe(false);
    // A sibling dir "docs/historico2/" should not match "docs/historico/"
    expect(isAllowed('docs/historico2/file.md')).toBe(false);
  });

  it('returns false for a path that shares a prefix but is not under the directory', () => {
    // "docs/historicoXXX/file.md" does NOT start with "docs/historico/"
    expect(isAllowed('docs/historicoXXX/file.md')).toBe(false);
  });
});

describe('isAllowed() – boundary / regression cases', () => {
  it('is case-sensitive (Linux filesystem semantics)', () => {
    expect(isAllowed('Docs/DEPLOYMENT.md')).toBe(false);
    expect(isAllowed('docs/deployment.md')).toBe(false);
    expect(isAllowed('CHANGELOG.MD')).toBe(false);
  });

  it('rejects a path with a leading slash even if base matches', () => {
    // Git paths are repo-relative and never start with "/"
    expect(isAllowed('/docs/DEPLOYMENT.md')).toBe(false);
    expect(isAllowed('/CONTRIBUTING.md')).toBe(false);
  });

  it('rejects a path with Windows-style backslash separators', () => {
    expect(isAllowed('docs\\DEPLOYMENT.md')).toBe(false);
  });

  it('allows all pre-existing allowlist entries to be recognized', () => {
    const exactEntries = ALLOWLIST.filter((p) => !p.endsWith('/'));
    for (const entry of exactEntries) {
      expect(isAllowed(entry), `entry "${entry}" should be allowed`).toBe(true);
    }
  });

  it('directory prefix entries match only via startsWith, not exact equality', () => {
    // The entries ending with '/' themselves are not valid file paths
    // e.g. "docs/historico/" is a dir marker, not a real file
    expect(isAllowed('docs/historico/')).toBe(true); // startsWith("docs/historico/") is true for itself
    // but "docs/historico" (no slash) does not start with "docs/historico/"
    expect(isAllowed('docs/historico')).toBe(false);
  });
});
