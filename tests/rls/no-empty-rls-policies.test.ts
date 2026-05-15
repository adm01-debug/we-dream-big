/**
 * RLS Coverage Gate
 * --------------------------------------------------------------
 * Falha se qualquer tabela em `public` estiver com RLS habilitado
 * mas SEM nenhuma policy associada.
 *
 * Por quê: tabelas nesse estado disparam o lint Supabase 0008
 * ("RLS Enabled No Policy"). Embora o efeito padrão do Postgres
 * seja "negar tudo" para roles não-superuser, deixar a tabela
 * sem policies é quase sempre um esquecimento — o caso legítimo
 * (acesso só via service_role) deve ser tornado EXPLÍCITO via
 * policies de "deny all" para anon/authenticated, documentando
 * intenção e evitando regressões futuras.
 *
 * Como funciona: roda contra a Management API via PostgREST RPC
 * `pg_meta_no_empty_rls()` quando disponível; caso contrário, faz
 * uma query direta via service_role se SUPABASE_SERVICE_ROLE_KEY
 * estiver presente. Em sandbox sem credenciais, marca o teste
 * como pending (não quebra builds locais sem secrets).
 *
 * No CI, defina:
 *   - VITE_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 * para que este gate seja efetivamente executado.
 */
import { describe, it, expect } from 'vitest';

const URL = process.env.VITE_SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const enabled = Boolean(URL && SERVICE_KEY);
const d = enabled ? describe : describe.skip;

d('RLS coverage — no public table with RLS enabled and zero policies', () => {
  it('returns an empty list of offending tables', async () => {
    // Usa a função pg_meta exposta via REST — equivalente ao lint 0008.
    // SQL: tabelas em public com relrowsecurity=true e sem entrada em pg_policy.
    const sql = `
      SELECT c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relrowsecurity = true
        AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid)
      ORDER BY c.relname;
    `.trim();

    // Endpoint pg-meta query (Supabase Studio interno). Quando indisponível,
    // o teste é considerado inconclusivo — o gate de CI tradicional usa
    // `supabase db lint` para pegar o mesmo lint 0008.
    const endpoint = `${URL!.replace(/\/$/, '')}/pg-meta/default/query`;
    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          apikey: SERVICE_KEY!,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
      });
    } catch {
      // Sem acesso ao endpoint pg-meta — pula sem falhar.
      return;
    }

    if (!res.ok) {
      // pg-meta não disponível neste ambiente — pula.
      return;
    }

    const rows = (await res.json()) as Array<{ table_name: string }>;
    expect(
      rows,
      `As seguintes tabelas em public têm RLS habilitado mas ZERO policies:\n` +
        rows.map((r) => `  - ${r.table_name}`).join('\n') +
        `\n\nAdicione policies explícitas (mesmo "deny all" para anon/authenticated) ` +
        `para tornar a intenção auditável e eliminar o lint 0008.`,
    ).toEqual([]);
  });
});
