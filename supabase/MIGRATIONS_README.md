# ⚠️ ATENÇÃO — `supabase/migrations/` neste projeto

## NÃO rode `supabase db push` neste projeto

O **banco Supabase** (`doufsxqlfjyuvxuezpln`) é a fonte da verdade do schema. Mudanças entram nele por várias rotas: Lovable IDE, Dashboard direto, MCP, scripts ad-hoc.

O conteúdo deste diretório:
- Contém **332 arquivos** que historicamente vieram de várias fontes (bootstrap, iterações do Lovable, tentativas locais)
- **Não reflete o estado real do banco** — zero intersecção entre os filenames aqui e a tabela `supabase_migrations.schema_migrations` em prod
- Aplicar via `supabase db push` causaria conflitos massivos (recriação de tabelas, drops em cascata, perda de dados)

## Como aplicar uma mudança de schema neste projeto

### Opção A — Via Lovable IDE
Peça a mudança no chat do Lovable. Ele gera o SQL, aplica via API do Supabase, e adiciona o arquivo aqui (via commit "Changes").

### Opção B — Migration ad-hoc fora do Lovable
1. Criar arquivo `YYYYMMDDHHMMSS_descricao.sql` neste diretório (para rastreabilidade no git)
2. Aplicar via MCP `apply_migration` ou SQL Editor do Supabase Dashboard
3. Verificar que foi aplicado:
   ```sql
   SELECT version FROM supabase_migrations.schema_migrations
   WHERE version = 'YYYYMMDDHHMMSS';
   ```

## Contexto

Esta situação foi detectada e documentada na **Tarefa 3 do redeploy** (2026-05-12).  
Detalhes completos: [`../docs/redeploy/REDEPLOY-T3-MIGRATIONS-AUDIT.md`](../../docs/redeploy/REDEPLOY-T3-MIGRATIONS-AUDIT.md)

Issue de follow-up para discussão estratégica: (a ser criada na T3)
