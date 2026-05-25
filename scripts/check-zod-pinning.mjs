#!/usr/bin/env node
/**
 * Guardrail anti-regressão #52 — pinning centralizado de Zod.
 *
 * Falha (exit 1) se encontrar imports diretos de Zod fora de
 * `supabase/functions/_shared/contracts/`. Edge Functions devem importar
 * `z` exclusivamente via barrel:
 *
 *   import { z } from "../_shared/contracts/index.ts";
 *
 * Ref: https://github.com/adm01-debug/promo-gifts-v4/issues/52
 */
import { execSync } from 'node:child_process';
import { exit } from 'node:process';

const ALLOWED_ROOT = 'supabase/functions/_shared/contracts/';

// grep com -P (pcre) não disponível em todo lugar; usa -E e filtramos depois
let output = '';
try {
  output = execSync(
    'grep -rn "from[[:space:]]*[\\"\\\\\']https://.*zod" supabase/functions/ 2>/dev/null || true',
    { encoding: 'utf8' },
  );
} catch (err) {
  // grep retorna exit 1 quando não acha nada — tratamos como sucesso
  output = '';
}

const violations = output
  .split('\n')
  .filter(Boolean)
  .filter(line => !line.startsWith(ALLOWED_ROOT));

if (violations.length === 0) {
  console.log('✓ Pinning de Zod centralizado (0 imports diretos fora de _shared/contracts/)');
  exit(0);
}

console.error('❌ Imports diretos de Zod encontrados fora de _shared/contracts/:');
console.error('   (Zod deve ser importado via barrel: import { z } from "../_shared/contracts/index.ts")\n');
for (const v of violations) {
  console.error(`   ${v}`);
}
console.error('\n   Veja https://github.com/adm01-debug/promo-gifts-v4/issues/52 para contexto.');
exit(1);
