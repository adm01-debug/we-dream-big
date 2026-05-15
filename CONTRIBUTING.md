# Guia de Contribuição

> Padrão de trabalho da Promo Brindes. Aplica-se a todo este repositório.

## 🎯 Princípio

**Toda alteração em `main` passa por Pull Request.** Sem exceção. Mesmo configs.

Razão: rastreabilidade + revisão automática (CodeRabbit) + ponto de gate antes de deploy.

## 🔄 Fluxo de trabalho

1. **Criar branch** a partir de `main`:
   ```bash
   git checkout main
   git pull
   git checkout -b <tipo>/<descricao-curta>
   ```

2. **Tipos de branch** (prefixo obrigatório):
   - `feat/` — funcionalidade nova
   - `fix/` — correção de bug
   - `chore/` — manutenção, deps, configs
   - `docs/` — documentação
   - `refactor/` — refatoração sem mudança de comportamento
   - `hotfix/` — correção urgente em produção

3. **Commits** seguindo Conventional Commits:
   ```
   <tipo>(<escopo opcional>): descrição curta

   Corpo opcional explicando o porquê.

   Refs: #issue
   ```
   Exemplos:
   - `feat(bitrix): adiciona sync de contatos para SPA Lalamove`
   - `fix(edge-function): corrige timeout em webhook-evolution`
   - `chore(deps): atualiza @supabase/supabase-js para 2.39.0`

4. **Abrir Pull Request** com base em `main`.
   - Preencher o template
   - Aguardar revisão automática do **CodeRabbit** (~3 min)
   - Endereçar comentários críticos
   - Solicitar aprovação humana se mudança não-trivial

5. **Merge** somente após:
   - ✅ CodeRabbit revisou
   - ✅ Comentários críticos / security resolvidos
   - ✅ CI passou (se aplicável)
   - ✅ Aprovação humana (para mudanças em produção)

## 🚫 Proibido

- `git push --force` em `main`
- Commit direto em `main` (use sempre PR)
- Commitar `.env`, tokens, chaves SSH ou qualquer credencial
- Merge sem revisão do CodeRabbit
- Renomear ou deletar tabelas/colunas Supabase sem backup `_backup_*_YYYYMMDD`

## 🔐 Secrets

- **Nunca** commitar tokens, credenciais ou URLs com auth embutida
- Usar `Deno.env.get()` em Edge Functions
- Usar `process.env` (com validação) em Node.js
- Configurar via dashboard Supabase, n8n credentials ou GitHub Secrets

## 🧪 Antes de abrir PR

Checklist mínimo:
- [ ] Código roda local (ou justifica por que não dá pra testar local)
- [ ] Sem `console.log` esquecidos com payloads sensíveis
- [ ] Sem secrets hardcoded
- [ ] Migrations SQL com backup das tabelas afetadas
- [ ] Variáveis de ambiente documentadas se forem novas

## 🎓 Convenções específicas

### Edge Functions Supabase
- Sempre validar payload de webhook (assinatura HMAC ou shared secret)
- Sempre retornar JSON estruturado em erros
- Nunca vazar mensagem de erro com detalhes internos para o cliente

### Migrations Supabase

> **Decision 013 (ADR 0006, 2026-05-12):** O banco Supabase é a fonte da verdade.  
> `supabase/migrations/` é histórico legado — não representa o estado atual do banco.  
> Ver `docs/adr/0006-migration-baseline.md` para contexto completo.

#### ⛔ NUNCA rodar `supabase db push` neste projeto
O banco tem 209 migrations aplicadas que **não têm intersecção** com as 332 no repo.
Rodar `db push` destruiria o banco. Ver `supabase/migrations/README.md`.

#### Processo correto para DDL
1. Escreva o SQL da migration
2. Aplique via **MCP `apply_migration`** ou **Supabase Dashboard → SQL Editor**
3. Confirme que a versão apareceu em `schema_migrations` no banco
4. Commite o arquivo `.sql` no repo em `supabase/migrations/` com timestamp atual

#### Regras de migration
- Operações destrutivas isoladas em migrations próprias
- Backup antes de DROP em tabela `_backup_<original>_YYYYMMDD`
- RLS ON em qualquer tabela nova
- `CREATE INDEX CONCURRENTLY` para índices em tabelas com dados (não bloqueia writes)

### Bitrix24
- `crm.item.get` com `entityTypeId=4` para Smart Companies (não usar `crm.company.get`)
- OAuth2 sempre — webhook clássico está deprecado para nosso uso

## 🔗 Cross-reference Issue ↔ PR (obrigatório)

**Padrão do projeto**: toda issue de `tracking` / `tech-debt` / `discussion` deve ter referência bidirecional à PR que a originou (ou à PR que vai resolvê-la).

### Quando uma PR descobre uma nova questão (que não vai resolver agora)

1. **Abra a issue ANTES de mergear a PR**:
   - Use o template **📌 Tracking / Discussion**
   - Preencha o campo "PR de origem" (`#152`, por exemplo) — é **obrigatório**
   - O bot `Cross-reference PR ↔ Issue` automaticamente adicionará comentário na PR
2. **Mencione a issue no body da PR**:
   - `Closes part of #155` ou `Refs #155`
   - O bot automaticamente adicionará comentário na issue

### Quando uma PR vai resolver uma issue existente

1. **Mencione no body da PR**: `Closes #123`
2. O bot adicionará comentário na issue avisando da PR aberta
3. Quando a PR for mergeada, o bot adicionará comentário final com merge SHA
4. GitHub fecha a issue automaticamente (devido ao `Closes`)

### Por que isso importa

Sem cross-reference, daqui a 3 meses ninguém lembra:
- Por que essa issue foi aberta?
- Quem fez o trabalho relacionado?
- Tem PR antiga abandonada sobre o tema?

Com cross-reference automática, qualquer dev (ou Claude em sessão futura) tem o contexto em 30 segundos: abrir a issue → ver comentário do bot → clicar na PR → ver merge SHA → ler diff e docs.

### Workflow que faz isso

`.github/workflows/cross-reference-issues.yml` — roda em `pull_request` e `issues` events. Idempotente (não duplica comentários).

