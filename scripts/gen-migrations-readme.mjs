import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const MIG_DIR = join(ROOT, 'supabase/migrations');

const files = readdirSync(MIG_DIR).filter(f => f.endsWith('.sql')).sort();

// Categorize por tipo de prefixo
const seq = files.filter(f => /^\d{1,3}_/.test(f));
const date8 = files.filter(f => /^\d{8}_/.test(f) && !/^\d{14}/.test(f));
const ts14 = files.filter(f => /^\d{14}/.test(f));

// Distribuição mensal (yyyymm → count)
const monthly = {};
for (const f of [...date8, ...ts14]) {
  const ym = f.slice(0, 6);
  monthly[ym] = (monthly[ym] || 0) + 1;
}

// Suspeitas
const suspeitas = {
  final: files.filter(f => /_final\.sql$/i.test(f)),
  fixed: files.filter(f => /_FIXED\.sql$/i.test(f)),
  tests: files.filter(f => /tests?_/i.test(f)),
  testQueries: files.filter(f => /test_queries/i.test(f)),
  uuidNamed: files.filter(f => /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(f)),
};

// Duplicatas (mesmo nome lógico)
const byLogicalName = {};
for (const f of files) {
  const logical = f.replace(/^[0-9_]+/, '');
  byLogicalName[logical] ??= [];
  byLogicalName[logical].push(f);
}
const duplicates = Object.entries(byLogicalName).filter(([_, list]) => list.length > 1);

// Marcos: primeira e última migration
const oldest = files[0];
const newest = files[files.length - 1];

// Categorias temáticas
const themes = {
  rls: files.filter(f => /rls|policy|policies/i.test(f)),
  bi: files.filter(f => /\bbi[-_]|business_intel/i.test(f)),
  crm: files.filter(f => /crm/i.test(f)),
  bitrix: files.filter(f => /bitrix/i.test(f)),
  notifications: files.filter(f => /notification/i.test(f)),
  audit: files.filter(f => /audit/i.test(f)),
  tests: files.filter(f => /test/i.test(f) && !/_test_only|test_assert/i.test(f)),
  seed: files.filter(f => /seed/i.test(f)),
  schema: files.filter(f => /schema/i.test(f)),
  fix: files.filter(f => /^.*?_fix_|_fix\.sql$/i.test(f)),
};

let md = `# Migrations SQL — Catálogo

> Documento gerado em ${new Date().toISOString().split('T')[0]} pela auditoria da Faxina F1.
> Catálogo de **${files.length} migrations** SQL aplicadas no banco Supabase.

## ⚠️ AVISO IMPORTANTE

**Migrations já aplicadas em produção NÃO devem ser editadas.** Pra mudanças no schema, **adicione uma nova migration** seguindo a convenção abaixo. Editar uma migration existente quebra deploys e drift detection.

## 📋 Visão geral

| Métrica | Valor |
|---|---|
| Total de migrations | **${files.length}** |
| Sequenciais antigas (\`001_*\`) | ${seq.length} |
| Com data 8 dígitos (\`20260507_*\`) | ${date8.length} |
| Com timestamp 14 dígitos (\`20260507120000_*\`) | ${ts14.length} |
| Com nome UUID (Lovable-generated) | ${suspeitas.uuidNamed.length} |
| Mais antiga | \`${oldest}\` |
| Mais recente | \`${newest}\` |

## 📅 Cronologia mensal

| Mês | Migrations | Contexto |
|---|---:|---|
`;

const monthContext = {
  '202412': 'Pré-projeto — saved_filters / entity_versions',
  '202501': '🎯 **Schema inicial** — criação das tabelas core (gifts_production)',
  '202512': 'Trabalho intenso — produtos, kits, pricing',
  '202601': 'Ajustes e features de Q1',
  '202602': 'BI, CRM, gamificação',
  '202603': 'Personalização, mockup, integrações',
  '202604': '🔥 **Auge** — saída do Lovable Cloud, refatorações',
  '202605': 'Faxina F1 (atual)',
};

const sortedMonths = Object.keys(monthly).sort();
for (const ym of sortedMonths) {
  const yy = ym.slice(2, 4);
  const mm = ym.slice(4, 6);
  const ctx = monthContext[ym] || '';
  md += `| ${yy}/${mm} | ${monthly[ym]} | ${ctx} |\n`;
}

md += `\n_Migrations sequenciais sem data (\`001_*\` a \`005_*\`): pré-Janeiro 2025, anteriores ao timestamp Supabase CLI._\n\n`;

md += `## 🎯 Marcos importantes\n\n`;
md += `### Schema inicial (3 de janeiro de 2025)\n\nO trabalho fundacional do banco foi feito em **${monthly['202501']} migrations no dia 03/01/2025** — criação das tabelas core do sistema:\n\n`;
md += '```\n';
const jan3 = files.filter(f => f.startsWith('20250103')).sort().slice(0, 6);
for (const f of jan3) md += `${f}\n`;
md += `... +${monthly['202501'] - 6} mais\n\`\`\`\n\n`;

md += `### Mês mais ativo (abril de 2026 — saída do Lovable)\n\n${monthly['202604']} migrations em abril/2026 — refatorações massivas, Lovable Cloud sendo descontinuado:\n\n`;
md += '```\n';
const apr = files.filter(f => f.startsWith('202604')).sort().slice(0, 6);
for (const f of apr) md += `${f}\n`;
md += `... +${monthly['202604'] - 6} mais\n\`\`\`\n\n`;

md += `## 🚨 Migrations suspeitas\n\n`;
md += `### Migrations com sufixo \`_final\` (${suspeitas.final.length})\n\nQuando algo se chama "final" em código, normalmente tem outra "final" depois. Estas merecem leitura cuidadosa pra entender o contexto:\n\n`;
for (const f of suspeitas.final) md += `- \`${f}\`\n`;

md += `\n### Migrations com sufixo \`_FIXED\` (${suspeitas.fixed.length})\n\nIndica conserto urgente de migration anterior:\n\n`;
for (const f of suspeitas.fixed) md += `- \`${f}\`\n`;

md += `\n### Migrations \`test_*\` ou \`tests_*\` (${suspeitas.tests.length})\n\nNomes \`test_*\` são incomuns em produção. Provavelmente seeds/validações deixados após desenvolvimento:\n\n`;
for (const f of suspeitas.tests.slice(0, 10)) md += `- \`${f}\`\n`;
if (suspeitas.tests.length > 10) md += `- ... e mais ${suspeitas.tests.length - 10}\n`;

md += `\n## 🔁 Duplicatas (mesmo nome lógico)\n\n`;
if (duplicates.length === 0) {
  md += `_Nenhuma duplicata detectada._\n`;
} else {
  md += `${duplicates.length} casos onde o mesmo "nome lógico" aparece em 2+ migrations diferentes:\n\n`;
  for (const [logical, list] of duplicates) {
    md += `**\`${logical}\`** (${list.length}×):\n`;
    for (const f of list) md += `- \`${f}\`\n`;
    md += '\n';
  }
  md += `_Importante:_ a migration \`005_push_subscriptions.sql\` (sequencial antiga) e a \`20251227*_push_subscriptions.sql\` referenciam a **mesma tabela** \`push_subscriptions\` — verificar se a primeira foi aplicada com sucesso e a segunda foi um retry, ou se houve um drop+recreate.\n\n`;
}

md += `\n## 🏷 Migrations por tema (heurística por nome)\n\n`;
md += '| Tema | Qtd | Exemplo |\n|---|---:|---|\n';
const themeOrder = ['rls', 'bi', 'crm', 'bitrix', 'notifications', 'audit', 'tests', 'seed', 'schema', 'fix'];
const themeLabels = { rls: 'RLS / Policies', bi: 'BI / Intelligence', crm: 'CRM', bitrix: 'Bitrix', notifications: 'Notifications', audit: 'Audit', tests: 'Tests / Validations', seed: 'Seed', schema: 'Schema', fix: 'Fix migrations' };
for (const t of themeOrder) {
  const list = themes[t];
  if (list.length === 0) continue;
  md += `| ${themeLabels[t]} | ${list.length} | \`${list[0]}\` |\n`;
}

md += `\n## 🏗 Convenções (atual)\n\n`;
md += `### Formato de nome\n\n\`\`\`\n<TIMESTAMP_14_DIGITOS>_<descricao_snake_case>.sql\n\`\`\`\n\nExemplo: \`20260507145245_drop_user_passkeys_table.sql\`\n\n`;
md += `### Como gerar uma nova migration\n\n\`\`\`bash\nsupabase migration new <descricao_snake_case>\n# Cria automaticamente: supabase/migrations/<TIMESTAMP>_<descricao>.sql\n\`\`\`\n\n> ⚠️ **NÃO use \`supabase db push\` neste projeto.** O diretório \`supabase/migrations/\` está desincronizado com o banco prod (ver \`docs/redeploy/REDEPLOY-T3-MIGRATIONS-AUDIT.md\`). Aplique mudanças via MCP \`apply_migration\` ou SQL Editor do Dashboard. Veja \`docs/DEPLOYMENT.md\`.\n\n`;
md += `### Boas práticas\n\n- ✅ **Idempotência**: use \`CREATE TABLE IF NOT EXISTS\`, \`CREATE OR REPLACE\`, \`DROP IF EXISTS\` quando seguro.\n- ✅ **RLS**: toda nova tabela com dados sensíveis deve ter \`ALTER TABLE ... ENABLE ROW LEVEL SECURITY\` + policies na MESMA migration.\n- ✅ **Comentários SQL**: \`-- DESCRIÇÃO:\` no topo explicando o porquê.\n- ❌ **Não editar migrations já aplicadas**: cria drift e quebra deploys de outros environments.\n- ❌ **Não usar nomes UUID** (\`abc-123-def\`): prefira nomes descritivos (\`add_quote_total_column\`).\n\n`;
md += `## 🔍 Como investigar\n\n`;
md += `### Ver SQL de uma migration\n\n\`\`\`bash\ncat supabase/migrations/20260507145245_drop_user_passkeys_table.sql\n\`\`\`\n\n`;
md += `### Listar migrations não aplicadas (Supabase CLI)\n\n\`\`\`bash\nsupabase migration list  # mostra status: aplicada/pendente\n\`\`\`\n\n`;
md += `### Schema atual do banco (sem rastrear migrations)\n\n\`\`\`bash\nsupabase db dump --data=false --schema=public > schema.sql\n\`\`\`\n\n---\n\n_Doc gerado automaticamente. Pra atualizar: \`node scripts/gen-migrations-readme.mjs\` (script preservado em \`scripts/\`)._\n`;

console.log(md);
