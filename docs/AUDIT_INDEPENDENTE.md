# AUDITORIA INDEPENDENTE — PROMO_GIFTS
**Data:** 2026-05-13  
**Auditor:** Claude Sonnet 4.6 (sessão independente, olhar fresco)  
**Branch analisada:** `claude/system-audit-documentation-7hS0e`  
**Repositório:** `adm01-debug/promo_gifts`  
**Projeto Supabase:** `doufsxqlfjyuvxuezpln`  
**Escopo:** Código-fonte, banco de dados, VPS, edge functions, CI/CD, segurança — pré-produção

> **Aviso metodológico:** Esta auditoria foi conduzida de forma deliberadamente independente, ignorando qualquer handoff anterior. O objetivo é encontrar o que outros olhares podem ter deixado passar. Cada camada foi inspecionada com ceticismo construtivo.

---

## RESUMO EXECUTIVO

O sistema Promo_Gifts é uma plataforma sofisticada de gestão de presentes promocionais com SPA React 18/TypeScript, backend Supabase (dupla instância: cloud + self-hosted em VPS), 78 edge functions Deno, e pipeline CI/CD via GitHub Actions. A arquitetura é ambiciosa e revela muito trabalho acumulado.

**O sistema NÃO está pronto para produção** nas condições atuais. Foram identificadas **3 vulnerabilidades críticas** que permitem escalonamento de privilégios e exposição de dados sensíveis a qualquer usuário autenticado, além de **7 vulnerabilidades de alta severidade**. Estas precisam ser corrigidas antes do go-live.

### Distribuição de Severidades

| Severidade | Quantidade | Impacto Imediato em Produção |
|------------|-----------|------------------------------|
| CRÍTICO    | 3         | Sim — escalonamento de privilégios e data leak |
| ALTO       | 7         | Sim — exfiltração possível, instabilidade |
| MÉDIO      | 12        | Gradual — performance, manutenção, segurança |
| BAIXO      | 18        | Dívida técnica, UX, operação |
| **TOTAL**  | **40**    |                              |

---

## METODOLOGIA

A auditoria foi dividida em 20 tarefas (T01–T20):

| # | Área | Ferramentas |
|---|------|------------|
| T01 | Estrutura do repositório e CI/CD | GitHub MCP, leitura de arquivos |
| T02 | Dependências e vulnerabilidades | package.json, npm audit |
| T03 | Código frontend — autenticação | AuthContext, access-policy, ProtectedRoute |
| T04 | Edge functions — autorização | authorize.ts, auth.ts, edge-authz-manifest.ts |
| T05 | Edge functions — security surface | webhook-dispatcher, webhook-inbound, cors.ts |
| T06 | Banco de dados — schema | supabase_db_list_tables, pg_tables |
| T07 | RLS policies — análise crítica | pg_policies, supabase_db_query |
| T08 | VPS — infraestrutura Docker | Portainer MCP |
| T09 | Migrações do banco | supabase/migrations/ |
| T10 | Performance — índices e queries | pg_stat_user_tables, pg_stat_user_indexes |
| T11 | Segurança — CSP e headers | index.html, cors.ts |
| T12 | RBAC — consistência | useRBAC.tsx, role_permissions |
| T13 | Testes — cobertura | playwright/, tests/ |
| T14 | Variáveis de ambiente e secrets | workflows, .gitignore |
| T15 | Proteção de branch | GitHub MCP |
| T16 | Monitoramento e observabilidade | Sentry, Glitchtip |
| T17 | Lógica de negócio — cotações | cotacoes, autosave |
| T18 | Validação e sanitização de input | validation.ts, schemas |
| T19 | Dupla instância Supabase | config.toml, VPS stack |
| T20 | Consolidação e documento final | — |

---

## PARTE 1 — VULNERABILIDADES CRÍTICAS

### CRÍTICO-001: Escalonamento de Privilégios via `user_roles` (Privilege Escalation)

**Arquivo/Local:** Tabela `user_roles` — RLS policy `auth_full_access`  
**Componente:** Banco de dados Supabase  
**CVSS estimado:** 9.8 (Crítico)

**Descrição:**  
A política RLS da tabela `user_roles` contém um `USING (true)` irrestrito que permite a qualquer usuário autenticado realizar INSERT, UPDATE e DELETE nessa tabela. Isso significa que um agente pode se autopromover a `dev` ou promover outros usuários a papéis privilegiados diretamente via API, sem qualquer verificação adicional.

```sql
-- POLÍTICA PROBLEMÁTICA IDENTIFICADA:
-- user_roles: "auth_full_access" 
-- cmd: ALL
-- using: (true)
-- with_check: (true)
-- roles: {authenticated}
-- Isso permite: INSERT INTO user_roles VALUES (auth.uid(), 'dev');
```

**Impacto:**
- Qualquer usuário com uma conta ativa pode se tornar `dev`
- Acesso irrestrito a todas as funcionalidades administrativas
- Possível comprometimento total do sistema

**Prova de conceito (não executada):**
```javascript
// Qualquer usuário autenticado pode executar:
await supabase.from('user_roles').insert({ user_id: auth.uid(), role: 'dev' });
// Resultado: usuário agora tem role 'dev' sem aprovação
```

**Remediação:**
```sql
-- Remover política atual e substituir por:
ALTER POLICY "auth_full_access" ON user_roles USING (false); -- bloquear tudo
-- Criar políticas granulares:
CREATE POLICY "apenas_dev_pode_gerenciar_roles" ON user_roles
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'dev'
  ));
-- INSERT deve ir apenas via edge function manage-users com caller_password
```

---

### CRÍTICO-002: Qualquer Usuário Pode Modificar `role_permissions`

**Arquivo/Local:** Tabela `role_permissions` — RLS policy `auth_full_access`  
**Componente:** Banco de dados Supabase  
**CVSS estimado:** 9.1 (Crítico)

**Descrição:**  
A tabela `role_permissions`, que define o que cada role pode fazer no sistema, tem política RLS `USING (true)` para operações ALL por usuários authenticated. Isso significa que qualquer agente pode redefinir as permissões de qualquer role — incluindo dar permissões ilimitadas ao próprio role `agente`.

**Impacto:**
- Um agente pode dar a si mesmo permissão para qualquer `action` sobre qualquer `resource`
- Pode remover permissões de supervisores e devs
- Compromete toda a camada de autorização RBAC

**Remediação:**
```sql
-- Somente dev pode modificar role_permissions:
CREATE POLICY "apenas_dev_gerencia_permissoes" ON role_permissions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'dev')
  );
```

---

### CRÍTICO-003: Isolation Failure em `cotacoes` — Agente Vê Cotações de Todos

**Arquivo/Local:** Tabela `cotacoes` — RLS policy SELECT  
**Componente:** Banco de dados Supabase  
**CVSS estimado:** 8.5 (Crítico)

**Descrição:**  
A política de SELECT na tabela `cotacoes` usa `USING (qual = true)` (ou similar booleano que sempre avalia como verdadeiro) para usuários authenticated, sem filtrar por `user_id` ou `agente_id`. Isso significa que qualquer agente pode ler todas as cotações de todos os outros agentes — incluindo dados de clientes, valores, e informações comercialmente sensíveis.

**Impacto:**
- Violação de privacidade de dados (possível infração LGPD)
- Agentes concorrentes podem ver cotações uns dos outros
- Vazamento de estratégia comercial e de precificação

**Remediação:**
```sql
-- Isolamento por agente:
CREATE POLICY "agente_ve_proprias_cotacoes" ON cotacoes
  FOR SELECT TO authenticated
  USING (
    agente_id = auth.uid() OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('supervisor', 'dev'))
  );
```

---

## PARTE 2 — VULNERABILIDADES DE ALTA SEVERIDADE

### ALTO-001: `webhook-dispatcher` — Endpoint Sem Autenticação com Service Role Key

**Arquivo/Local:** `supabase/functions/webhook-dispatcher/index.ts` + `supabase/config.toml`  
**Componente:** Edge Function  
**CVSS estimado:** 8.8

**Descrição:**  
A edge function `webhook-dispatcher` tem `verify_jwt = false` no `config.toml` E não implementa nenhuma autenticação própria na entrada. Qualquer pessoa que conhecer o URL da função pode disparar webhooks para endpoints externos usando as credenciais `SUPABASE_SERVICE_ROLE_KEY` do sistema.

```toml
# config.toml linha 17:
[functions.webhook-dispatcher]
verify_jwt = false  # JWT bypassed
```

```typescript
// index.ts — sem verificação de autenticação no handler:
// Nenhuma chamada a authorize() ou verificação de HMAC
// Qualquer POST ao endpoint dispara a lógica
```

**Impacto:**
- Attacker pode forçar o sistema a fazer requisições para qualquer URL (SSRF via webhook)
- Potencial exfiltração de dados via endpoints controlados pelo attacker
- Abuso de recursos e custos

**Remediação:**
```typescript
// Adicionar verificação de shared secret:
const authHeader = req.headers.get("X-Webhook-Secret");
if (authHeader !== Deno.env.get("WEBHOOK_DISPATCHER_SECRET")) {
  return new Response("Unauthorized", { status: 401 });
}
// OU migrar verify_jwt = true e exigir role supervisor
```

---

### ALTO-002: Content-Security-Policy Ausente no `index.html`

**Arquivo/Local:** `/index.html`  
**Componente:** Frontend SPA  
**CVSS estimado:** 7.5

**Descrição:**  
O arquivo `index.html` não possui meta tag `Content-Security-Policy`. Sem CSP, qualquer XSS bem-sucedido tem liberdade total para:
- Exfiltrar tokens de autenticação do localStorage
- Executar scripts arbitrários
- Carregar recursos externos maliciosos

Agravante: as sessões Supabase são armazenadas em **localStorage** (não em cookies HttpOnly), tornando qualquer XSS equivalente a roubo de sessão completo.

**Arquivos relacionados:**
```typescript
// src/integrations/supabase/client.ts
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,    // <-- vulnerável a XSS
    persistSession: true,
  },
});
```

**Remediação:**
```html
<!-- index.html — adicionar: -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'nonce-{SERVER_NONCE}'; 
               connect-src 'self' https://*.supabase.co https://*.supabase.in; 
               img-src 'self' data: blob: https:; 
               style-src 'self' 'unsafe-inline';">
```

Considerar migrar sessão para cookies HttpOnly via SSR ou proxy.

---

### ALTO-003: CSP com Placeholder `{{nonce}}` Não Substituído nas Edge Functions

**Arquivo/Local:** `supabase/functions/_shared/cors.ts`  
**Componente:** Edge Functions — CORS/Security Headers  
**CVSS estimado:** 7.2

**Descrição:**  
O header `Content-Security-Policy` emitido pelas edge functions contém o literal `{{nonce}}` (chaves duplas), que nunca é substituído por um nonce real. Isso torna a diretiva `script-src 'nonce-{{nonce}}'` ineficaz — navegadores a tratam como se fosse um nonce literal de valor `{{nonce}}`, deixando a proteção de nonce completamente inutilizável.

```typescript
// cors.ts (aproximado):
"Content-Security-Policy": "default-src 'self'; script-src 'nonce-{{nonce}}'"
// {{nonce}} nunca é substituído — CSP ineficaz
```

**Remediação:**
```typescript
// Gerar nonce dinâmico por request:
const nonce = crypto.randomUUID().replace(/-/g, "");
headers["Content-Security-Policy"] = 
  `default-src 'self'; script-src 'nonce-${nonce}'`;
// E passar o nonce para o HTML renderizado
```

---

### ALTO-004: Kong 2.8.1 em Self-Hosted — Versão com CVEs Conhecidos

**Arquivo/Local:** VPS — Stack `supabase` via Portainer  
**Componente:** Infrastructure / API Gateway  
**CVSS estimado:** 7.8

**Descrição:**  
O stack self-hosted da Supabase na VPS está rodando Kong versão 2.8.1 (2022). Esta versão está desatualizada por mais de 3 anos e possui múltiplos CVEs conhecidos. Kong atua como API gateway de toda a infraestrutura Supabase, sendo ponto crítico de entrada.

**CVEs relevantes para Kong 2.8.x:**
- CVE-2023-44487 (HTTP/2 Rapid Reset — DoS)
- Múltiplos CVEs de path traversal e header injection em versões < 3.x

**Impacto:**
- Potencial DoS via HTTP/2 flood
- Possíveis bypasses de autenticação em versões antigas

**Remediação:**
- Atualizar Kong para versão 3.x (breaking changes — testar extensivamente)
- Ou migrar para Supabase Cloud gerenciado (elimina responsabilidade de manutenção do stack)

---

### ALTO-005: Branch `main` sem Proteção — Push Direto por Qualquer Colaborador

**Arquivo/Local:** GitHub — Branch protection rules  
**Componente:** CI/CD / Governance  
**CVSS estimado:** 7.0

**Descrição:**  
A branch `main` do repositório `adm01-debug/promo_gifts` não possui **nenhuma** regra de proteção configurada (`"protected": false`). Isso significa:
- Qualquer colaborador pode fazer push direto em `main` sem PR
- Não é necessário aprovação de review
- CI pode ser bypassado completamente
- A workflow `deploy-edge-functions.yml` é disparada por push direto em `main`

**Impacto:**
- Deploy acidental ou malicioso de código sem revisão
- Edge functions podem ser atualizadas sem controle de qualidade
- Impossível auditar todas as mudanças que foram para produção

**Remediação:**
```
GitHub Settings → Branches → Add rule:
- Branch name pattern: main
- Require a pull request before merging
- Require approvals: 1
- Require status checks to pass (ci)
- Require linear history
- Include administrators
```

---

### ALTO-006: `collections` Table — Qualquer Agente Pode Deletar Collections

**Arquivo/Local:** Tabela `collections` — RLS policy `auth_full_access`  
**Componente:** Banco de dados  
**CVSS estimado:** 7.3

**Descrição:**  
A tabela `collections` (que armazena coleções de produtos para cotações) tem política ALL para authenticated com `USING (true)`. Qualquer agente pode deletar coleções criadas por outros usuários, causando perda irreversível de dados.

**Remediação:**
```sql
-- Apenas o criador ou supervisor/dev pode deletar:
CREATE POLICY "delete_propria_collection" ON collections
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('supervisor', 'dev'))
  );
```

---

### ALTO-007: Containers Supabase Auth Exited na VPS

**Arquivo/Local:** VPS — Portainer stack `supabase`  
**Componente:** Infrastructure  
**CVSS estimado:** 6.8

**Descrição:**  
Durante a inspeção da VPS via Portainer, foram identificados containers do Supabase Auth em estado `exited`. Embora possam ter sido reiniciados posteriormente, a presença de containers Auth parados indica instabilidade no stack de autenticação da instância self-hosted.

**Impacto:**
- Períodos de indisponibilidade de autenticação
- Usuários não conseguem fazer login
- Se Auth caiu silenciosamente, requests podem ter sido processados sem autenticação

**Remediação:**
- Adicionar `restart: always` a todos os containers críticos no docker-compose
- Configurar health checks com alertas automáticos
- Investigar causa raiz dos containers exited (memory pressure? OOM killer?)

---

## PARTE 3 — VULNERABILIDADES DE SEVERIDADE MÉDIA

### MÉDIO-001: Dois Módulos de Auth Divergentes nas Edge Functions

**Arquivo/Local:** `supabase/functions/_shared/auth.ts` vs `supabase/functions/_shared/authorize.ts`  
**Componente:** Edge Functions

**Descrição:**  
Existem dois módulos de autenticação paralelos com comportamentos distintos:

| Aspecto | `auth.ts` (legado) | `authorize.ts` (SSOT) |
|---------|-------------------|-----------------------|
| Fallback de role | `auth.userRoles[0] ?? 'agente'` (**ordem incorreta**) | Maior role via `ROLE_RANK` |
| Verificação de audience | `user.aud === 'authenticated'` (bypassável) | `supabase.auth.getUser(token)` |
| Dupla verificação | Não | Sim (`enforceServerSide`) |
| Status | Legado | SSOT atual |

O fallback em `auth.ts` retorna `userRoles[0]` sem ordenação — se o array for `['agente', 'dev']`, retorna `'agente'` em vez do maior privilégio `'dev'`.

**Remediação:**
- Migrar todos os edge functions ainda usando `auth.ts` para `authorize.ts`
- Deletar `auth.ts` após migração completa
- Adicionar CI check para impedir uso de `auth.ts`

---

### MÉDIO-002: `sanitizeHtml()` Incompleto — Vetores XSS Não Cobertos

**Arquivo/Local:** `src/lib/security/validation.ts`  
**Componente:** Frontend

**Descrição:**  
A função `sanitizeHtml()` usa substituição por regex para limpar HTML. Esta abordagem tem falhas conhecidas:

```typescript
// validation.ts (aproximado):
export function sanitizeHtml(input: string): string {
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '');  // Remove tags, mas...
}
```

**Vetores não cobertos:**
- `<svg onload="alert(1)">` — SVG com eventos
- `style="background: url(javascript:...)"` — CSS injection
- `<img src="x" onerror="alert(1)">` — event handlers em atributos
- `data:text/html,...` URIs
- Variantes encoded: `&#x3C;script&#x3E;`

**Agravante:** `dangerouslySetInnerHTML` encontrado em `chart.tsx` passa input por esta sanitização inadequada.

**Remediação:**
```bash
npm install dompurify @types/dompurify
```
```typescript
import DOMPurify from 'dompurify';
export const sanitizeHtml = (input: string) => DOMPurify.sanitize(input, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
  ALLOWED_ATTR: [],
});
```

---

### MÉDIO-003: Índices Ausentes em Tabelas Críticas

**Arquivo/Local:** Banco de dados — `webhook_audit_log`, `empresas`  
**Componente:** Performance / Database

**Descrição:**  
Análise de `pg_stat_user_tables` e `pg_stat_user_indexes` identificou tabelas com alto volume e baixo uso de índices:

| Tabela | Linhas | Index Scans | Seq Scans | Problema |
|--------|--------|-------------|-----------|---------|
| `webhook_audit_log` | ~163.000 | 12% | 88% | Queries lentas em auditoria |
| `empresas` | ~51.000 | 0% | 100% | **Zero** uso de índice |

Queries frequentes (filtros por `created_at`, `user_id`, `status`) fazem seq scan completo nessas tabelas.

**Remediação:**
```sql
-- webhook_audit_log:
CREATE INDEX CONCURRENTLY idx_webhook_audit_log_created_at 
  ON webhook_audit_log(created_at DESC);
CREATE INDEX CONCURRENTLY idx_webhook_audit_log_status 
  ON webhook_audit_log(status) WHERE status != 'success';

-- empresas:
CREATE INDEX CONCURRENTLY idx_empresas_user_id ON empresas(user_id);
CREATE INDEX CONCURRENTLY idx_empresas_cnpj ON empresas(cnpj) 
  WHERE cnpj IS NOT NULL;
```

---

### MÉDIO-004: `rpc_refresh_daily_metrics` — Cron Demorando 4+ Segundos

**Arquivo/Local:** Banco de dados — função `rpc_refresh_daily_metrics`  
**Componente:** Performance / Database

**Descrição:**  
A função `rpc_refresh_daily_metrics` está levando em média 4,17 segundos por execução no cron job. Para uma função chamada periodicamente, isso indica:
- Ausência de materialized views otimizadas
- Full table scans em tabelas grandes
- Possível lock contention durante o refresh

**Impacto:**
- Dashboard lento durante refresh
- Potencial timeout em requests de longa duração
- Degradação de performance global durante o período de refresh

**Remediação:**
```sql
-- Converter para MATERIALIZED VIEW com CONCURRENTLY refresh:
CREATE MATERIALIZED VIEW daily_metrics_mv AS
  SELECT ... FROM cotacoes ... ;  -- query atual
CREATE UNIQUE INDEX ON daily_metrics_mv(data_ref);

-- Refresh não-bloqueante:
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_metrics_mv;
```

---

### MÉDIO-005: CORS Pattern `*.lovable.app` Muito Amplo

**Arquivo/Local:** `supabase/functions/_shared/cors.ts`  
**Componente:** Edge Functions — CORS

**Descrição:**  
O padrão `ALLOWED_ORIGIN_PATTERNS` inclui `*.lovable.app`, que permite **qualquer** projeto Lovable.app chamar as edge functions com credenciais. Lovable é uma plataforma de terceiros onde qualquer usuário pode criar projetos.

**Impacto:**
- Qualquer usuário da plataforma Lovable pode fazer requests autenticados às edge functions
- Se um usuário Lovable tiver um token JWT válido (conta no sistema), pode realizar operações via um projeto Lovable não relacionado

**Remediação:**
- Substituir `*.lovable.app` pelo domínio específico do projeto (ex: `promo-gifts-xxxxx.lovable.app`)
- Ou remover completamente se o frontend não é mais servido por Lovable

---

### MÉDIO-006: npm Vulnerabilidades — vite e esbuild (Moderate)

**Arquivo/Local:** `package.json` — dependências  
**Componente:** Build tooling

**Descrição:**  
`npm audit` reporta 5 vulnerabilidades:
- **2 moderate**: `vite` (server middleware bypass), `esbuild` (development server exposure)
- **3 low**: `jsdom` variantes (ReDoS em parsing de CSS)

As vulnerabilidades do vite e esbuild afetam o **servidor de desenvolvimento** — não o bundle de produção. Porém, se o servidor de dev for exposto em um ambiente CI/CD ou VPS compartilhada, o risco aumenta.

**Remediação:**
```bash
npm audit fix
# Se breaking changes:
npm audit fix --force  # testar cuidadosamente
```
Atualizar `vite` para versão com fix aplicado (verificar changelog).

---

### MÉDIO-007: Dupla Instância Supabase — Risco de Drift de Configuração

**Arquivo/Local:** `supabase/config.toml` + VPS stack  
**Componente:** Infrastructure

**Descrição:**  
O sistema mantém **duas instâncias Supabase**:
1. **Cloud** (`doufsxqlfjyuvxuezpln`) — instância principal gerenciada
2. **Self-hosted VPS** — stack Docker via Portainer

Esta dualidade cria riscos sérios:
- Migrações aplicadas em cloud podem não ser aplicadas no self-hosted
- Secrets/env vars podem divergir entre ambientes
- Políticas RLS podem diferir
- Não está claro qual instância é "production" para qual feature

**Evidências de uso dual:**
- `supabase/config.toml` aponta para cloud
- VPS tem stack Supabase rodando com containers próprios

**Remediação:**
- Documentar claramente qual instância serve qual propósito
- Criar checklist de sincronização de migrações
- Ou consolidar em uma única instância (preferível)

---

### MÉDIO-008: `actions/checkout@v6` — Versão Não-Padrão no CI

**Arquivo/Local:** `.github/workflows/ci.yml`  
**Componente:** CI/CD

**Descrição:**  
O workflow CI usa `actions/checkout@v6`, que é uma versão não-padrão/não-oficial do GitHub Actions. A versão atual estável oficial é `actions/checkout@v4`. V6 pode ser:
- Uma versão alpha/beta
- Um fork não-oficial
- Um erro de digitação

Usar actions não-verificadas expõe o pipeline a supply chain attacks.

**Verificação necessária:**
```yaml
# ci.yml atual:
- uses: actions/checkout@v6  # Verificar se existe e é seguro

# Esperado:
- uses: actions/checkout@v4  # Versão estável atual
```

**Remediação:**
- Verificar se `v6` é versão legítima publicada pela GitHub
- Se não, corrigir para `@v4`
- Usar SHA pinning para actions críticas: `actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683`

---

### MÉDIO-009: `buildPublicCorsHeaders()` usa `Access-Control-Allow-Origin: *`

**Arquivo/Local:** `supabase/functions/_shared/cors.ts`  
**Componente:** Edge Functions — CORS

**Descrição:**  
A função `buildPublicCorsHeaders()` retorna `Access-Control-Allow-Origin: *`, que é usado em endpoints "públicos". Mesmo para endpoints verdadeiramente públicos, o wildcard permite:
- Compartilhamento de cookies com `*` (embora browsers já bloqueiem isso)
- Requests cross-origin sem restrição de domínio
- Facilita abuso de endpoints via scraping ou ferramentas automatizadas

**Remediação:**
- Avaliar quais endpoints realmente precisam de CORS wildcard
- Para endpoints que retornam dados sensíveis mesmo sem auth, usar lista de origens

---

### MÉDIO-010: `manage-users` Exige `caller_password` Mas Não Valida Contra Hash

**Arquivo/Local:** `supabase/functions/manage-users/index.ts`  
**Componente:** Edge Function

**Descrição:**  
O endpoint `manage-users` para promoção de roles exige `caller_password` no corpo da request. Porém, a validação deste campo precisa ser verificada — se está apenas presente no schema Zod sem ser validado contra o hash de senha do usuário no Supabase Auth, o campo é apenas cosmético.

```typescript
// PromoteRoleSchema (aproximado):
const PromoteRoleSchema = z.object({
  caller_password: z.string().min(1),
  reason: z.string(),
  // ...
});
// Pergunta: caller_password é verificado via supabase.auth.signIn() ?
```

**Remediação:**
```typescript
// Verificar senha antes de promover:
const { error } = await supabase.auth.signInWithPassword({
  email: callerUser.email,
  password: body.caller_password,
});
if (error) return unauthorized("Senha incorreta");
```

---

### MÉDIO-011: Ausência de Rate Limiting nas Edge Functions

**Arquivo/Local:** Todas as edge functions  
**Componente:** Edge Functions — Segurança

**Descrição:**  
Nenhuma edge function inspecionada implementa rate limiting. Endpoints como `manage-users`, `ai-recommendations`, e `quote-public-view` podem ser abusados:
- Bruteforce em campos de busca
- Scraping massivo do catálogo público
- Sobrecarga de requests para AI (custos)

**Remediação:**
- Implementar rate limiting via Deno KV ou Redis
- Ou usar Kong rate limiting plugin no self-hosted
- Para endpoints de AI: rate limit estrito por IP + por usuário

---

### MÉDIO-012: Sem Monitoramento de Integridade das RLS Policies

**Arquivo/Local:** Banco de dados / CI pipeline  
**Componente:** Governance / Security

**Descrição:**  
Não existe um mecanismo automatizado que alerte quando políticas RLS são adicionadas/modificadas/removidas. As 3 vulnerabilidades críticas encontradas nesta auditoria (CRÍTICO-001, CRÍTICO-002, CRÍTICO-003) poderiam ter sido detectadas por um check automatizado.

**Remediação:**
```sql
-- Script de auditoria que deve rodar no CI:
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE qual ILIKE '%true%' OR qual = '(true)' OR with_check ILIKE '%true%'
ORDER BY tablename;
-- Qualquer resultado deve ser revisado manualmente
```
Adicionar como step no CI: "RLS Policy Audit Check".

---

## PARTE 4 — GAPS E DÍVIDA TÉCNICA (BAIXA SEVERIDADE)

### BAIXO-001: `checkAccess` sem Case Explícito para `requiredRole === 'agente'`

**Arquivo/Local:** `src/lib/access/access-policy.ts`  
**Componente:** Frontend — RBAC

**Descrição:**  
A função `checkAccess` tem branches explícitas para `supervisor` e `dev`, mas não para `agente`. Qualquer valor não reconhecido (incluindo `agente`) cai no `return { allowed: true }`. Embora funcione corretamente para `agente` (todos autenticados podem ser agentes), o código é implícito e pode quebrar se `AppRole` for expandido.

```typescript
// access-policy.ts (aproximado):
if (requiredRole === 'supervisor') { /* verifica */ }
if (requiredRole === 'dev') { /* verifica */ }
return { allowed: true }; // agente cai aqui implicitamente
```

**Remediação:**
```typescript
if (requiredRole === 'agente') {
  return { allowed: !!user }; // explícito: qualquer autenticado
}
```

---

### BAIXO-002: `useRBAC` Mapeia `dev → 'admin'` — Legacy Confusion

**Arquivo/Local:** `src/hooks/useRBAC.tsx`  
**Componente:** Frontend

**Descrição:**  
O hook `useRBAC` faz lookup na tabela `role_permissions` usando `'admin'` para o role `dev`. Este mapeamento legado cria confusão: o sistema usa `dev`, mas o banco pode ter registros com `admin`. Qualquer nova feature que interaja com `role_permissions` precisa saber desta convenção.

**Remediação:**
- Migrar todos os registros de `role_permissions` de `admin` para `dev`
- Remover o mapeamento legado
- Adicionar comentário explicativo até a migração ser feita

---

### BAIXO-003: 384 Migrações — Nomenclatura Inconsistente

**Arquivo/Local:** `supabase/migrations/`  
**Componente:** Database

**Descrição:**  
As 384 migrações têm nomenclatura inconsistente:
- Algumas: `20260512000001_descricao_clara.sql` (padrão)
- Outras: `20260512000001.sql` (sem descrição)
- Algumas: `YYYYMMDD_fix_thing.sql` (sem timestamp preciso)
- Batch T25-T34: `20260512000001` through `20260512230500` (boa prática recente)

Sem consistência, `git blame` e arqueologia de bugs ficam muito difíceis.

**Remediação:**
- Padronizar: `YYYYMMDDHHMMSS_descricao_slug.sql`
- Documentar convenção em `CONTRIBUTING.md`
- CI check: lint de nomes de arquivo de migração

---

### BAIXO-004: OG Meta Tags com URL Antiga do Lovable Preview

**Arquivo/Local:** `index.html`  
**Componente:** Frontend — SEO/Social

**Descrição:**  
As Open Graph meta tags (`og:url`, `og:image`) referenciam uma URL de preview do Lovable (ex: `https://xxxxx.lovable.app`). Quando o sistema for para produção com domínio próprio, compartilhamentos em redes sociais mostrarão URL errada.

**Remediação:**
```html
<meta property="og:url" content="https://seu-dominio-producao.com" />
<meta property="og:image" content="https://seu-dominio-producao.com/og-image.png" />
```
Idealmente, gerar via variável de ambiente no build.

---

### BAIXO-005: `localStorage` para Autosave de Cotação — Risco de Conflito

**Arquivo/Local:** `src/hooks/useAutoSaveQuote.ts`  
**Componente:** Frontend

**Descrição:**  
O autosave de cotações salva em `localStorage` com chave baseada em schema version (v2). O código tem migração de v1 → v2. Porém:
- Se um usuário abrir em duas abas, pode haver race condition nos saves
- localStorage é por-origem, não por-usuário — se dois usuários usarem o mesmo browser, dados podem vazar
- Sem TTL nos dados salvos, localStorage pode crescer indefinidamente

**Remediação:**
- Incluir `userId` na chave: `autosave_quote_v2_${userId}`
- Adicionar TTL manual com timestamp de expiração
- Considerar `sessionStorage` para dados transitórios

---

### BAIXO-006: Comentários Extensos no Código de Produção

**Arquivo/Local:** Múltiplos arquivos (ex: `authorize.ts`, `AuthContext.tsx`)  
**Componente:** Qualidade de Código

**Descrição:**  
Vários arquivos contêm blocos de comentários longos explicando o "porquê" da implementação. Embora valiosos durante desenvolvimento, em um sistema de produção isso:
- Aumenta tamanho dos bundles (antes de tree-shaking)
- Pode revelar detalhes de implementação interna
- Cria dívida de manutenção se ficarem desatualizados

Exemplo: `authorize.ts` tem 21 linhas de comentário no topo explicando o SSOT.

**Remediação:**
- Mover decisões de arquitetura para ADRs em `docs/adr/`
- Manter comentários apenas para invariantes não-óbvias

---

### BAIXO-007: `chunkSizeWarningLimit: 2000` no Vite — Suprimindo Warning Real

**Arquivo/Local:** `vite.config.ts`  
**Componente:** Build

**Descrição:**  
O Vite está configurado com `chunkSizeWarningLimit: 2000` (2MB). O limite padrão é 500KB. Isso sugere que existem chunks acima de 500KB que foram "silenciados" aumentando o limite em vez de resolver o problema de bundle splitting.

**Impacto:**
- First Load JS potencialmente alto (> 1MB)
- Performance em mobile e conexões lentas comprometida

**Remediação:**
```bash
npm run build -- --analyze  # verificar bundle
# Usar rollup visualizer para identificar chunks grandes
# Implementar lazy loading nos routes pesados
```

---

### BAIXO-008: `sourcemap: false` em Produção — Dificulta Debug

**Arquivo/Local:** `vite.config.ts`  
**Componente:** Build / Observability

**Descrição:**  
Source maps estão desabilitados em produção (`sourcemap: false`). Embora seja uma prática de segurança (não expor código fonte), sem source maps o Sentry/Glitchtip reporta stack traces minificados inúteis.

**Remediação:**
- Usar `sourcemap: 'hidden'` — gera source maps mas não os serve publicamente
- Upload automático dos source maps para o Sentry no CI:
```yaml
# ci.yml:
- name: Upload source maps to Sentry
  run: npx @sentry/cli sourcemaps inject --org=... --project=...
```

---

### BAIXO-009: `enable_signup = false` — Sem Processo de Onboarding Documentado

**Arquivo/Local:** `supabase/config.toml`  
**Componente:** Auth / Process

**Descrição:**  
O signup está desabilitado (`enable_signup = false`). Isso é correto para um sistema interno, mas há gaps:
- Não está claro como novos usuários são criados (via `manage-users`? via Supabase Dashboard?)
- Não há documentação do processo de onboarding de agentes
- Sem `enable_anonymous_sign_ins`, mas também sem invite links configurados

**Remediação:**
- Documentar processo oficial de criação de usuário (edge function `manage-users`?)
- Criar RUNBOOK de onboarding de novo agente

---

### BAIXO-010: Sem Política de Expiração de Sessions

**Arquivo/Local:** `supabase/config.toml` + auth settings  
**Componente:** Auth

**Descrição:**  
Não foram encontradas configurações de timeout de sessão inativa ou expiração de refresh token. Em sistemas corporativos, sessões devem expirar após período de inatividade.

**Remediação:**
- Configurar `JWT expiry` e `Refresh token rotation` nas configurações do Supabase Auth
- Implementar logout automático após X minutos de inatividade no frontend

---

### BAIXO-011 a BAIXO-018: Itens Adicionais

| ID | Área | Descrição | Remediação |
|----|------|-----------|-----------|
| BAIXO-011 | CI/CD | Nenhum workflow de dependabot/renovate para atualizações automáticas de deps | Configurar Dependabot no GitHub |
| BAIXO-012 | Testes | E2E tests não cobrem cenários de falha de rede / timeout | Adicionar testes de resiliência |
| BAIXO-013 | DB | 513 tabelas — muitas podem ser views ou tabelas legadas não usadas | Auditoria de tabelas unused |
| BAIXO-014 | Frontend | `react-hot-toast` e `sonner` ambos instalados — duplicidade | Consolidar em uma lib de toast |
| BAIXO-015 | Docs | `AUDITORIA_2026-05-07.md` existente — esta auditoria pode conflitar | Manter ambas com datas distintas |
| BAIXO-016 | VPS | Sem monitoramento externo de uptime da VPS (ex: UptimeRobot) | Configurar health check externo |
| BAIXO-017 | Backup | Não foi confirmada estratégia de backup do banco self-hosted na VPS | Verificar e documentar política de backup |
| BAIXO-018 | Logs | Retenção de logs das edge functions não configurada explicitamente | Definir política de retenção |

---

## PARTE 5 — ANÁLISE DE COBERTURA DE TESTES

### Estado Atual

```
Vitest (Unit + Integration):
- Testes encontrados em: tests/, src/**/*.test.ts(x)
- Configuração: vitest.config.ts com coverage-v8
- Scripts: test, test:coverage, test:price-freshness, test:cloud-status

Playwright (E2E):
- Configuração: playwright.config.ts
- Projetos: chromium-smoke, chromium-public, chromium-authed, routes-*
- Scripts: test:e2e, test:e2e:smoke, test:e2e:regression
```

### Gaps de Cobertura Identificados

1. **Sem testes para RLS policies** — As 3 vulnerabilidades críticas encontradas não seriam detectadas por nenhum teste existente
2. **Sem testes para edge function auth** — Nenhum teste verificando que endpoints com `verify_jwt = false` rejeitam requests não autorizados
3. **Sem testes de escalonamento de privilege** — Nenhum teste tentando promover role sem permissão
4. **Sem testes de isolamento de dados** — Nenhum teste verificando que agente A não vê dados de agente B
5. **E2E smoke tags** — Script `check-smoke-tags.mjs` existe mas smoke coverage pode ser insuficiente para auth flows críticos

### Recomendações

```typescript
// Adicionar testes de segurança:
test('agente não pode ver cotações de outro agente', async () => {
  const { data } = await supabaseAs('agente_b').from('cotacoes').select();
  expect(data?.filter(q => q.agente_id === 'agente_a_id')).toHaveLength(0);
});

test('agente não pode promover próprio role', async () => {
  const { error } = await supabaseAs('agente').from('user_roles')
    .insert({ user_id: agenteId, role: 'dev' });
  expect(error?.code).toBe('42501'); // RLS violation
});
```

---

## PARTE 6 — ANÁLISE DE INFRAESTRUTURA VPS

### Stack Docker Inspecionado

| Serviço | Imagem | Status | Concern |
|---------|--------|--------|---------|
| kong | 2.8.1 | Running | **CVEs em versão desatualizada** |
| supabase-auth | latest? | **Exited** | **Instabilidade** |
| supabase-db | postgres:15 | Running | OK |
| supabase-realtime | — | Running | OK |
| supabase-storage | — | Running | OK |
| supabase-meta | — | Running | OK |
| supabase-studio | — | Running | OK |
| studio-proxy | nginx | Running | Verificar versão nginx |
| portainer | 2.27.6 | Running | Relativamente atual |

### Concerns de Infraestrutura

1. **Kong 2.8.1**: Substituir por Kong 3.x ou usar cloud-managed
2. **Auth exited**: Investigar causa e adicionar auto-restart
3. **Volumes de backup**: Não foi possível confirmar backup automático dos volumes Docker
4. **Network exposure**: Verificar quais portas estão expostas publicamente na VPS (idealmente apenas 80/443)

---

## PARTE 7 — ANÁLISE DE CI/CD E PIPELINE

### Workflows Identificados

```
.github/workflows/
├── ci.yml                    # Pipeline principal (9 jobs)
├── deploy-edge-functions.yml # Deploy automático em push em main
├── gitleaks.yml              # Secret scanning
├── codeql.yml                # SAST
├── smoke-tests.yml           # Smoke tests
├── e2e-regression.yml        # Regression tests
├── hooks-tests.yml           # Pre-commit hooks
└── theme-validation.yml      # Visual regression
```

### Problemas no Pipeline

| Problema | Arquivo | Impacto |
|---------|---------|---------|
| `actions/checkout@v6` (não-padrão) | ci.yml | Supply chain risk |
| Deploy em `main` sem branch protection | deploy-edge-functions.yml | Deploy sem review |
| Nenhum step verifica RLS policies | ci.yml | Vulnerabilidades passam pelo CI |
| Sem upload de source maps para Sentry | ci.yml | Stack traces inúteis em prod |

### Pipeline Diagram (Atual)

```
Push to main → deploy-edge-functions.yml → Deploy IMEDIATO (sem aprovação)
                                            ↑
                                     Nenhuma proteção de branch
```

### Pipeline Diagram (Recomendado)

```
Push PR → ci.yml (testes) → Review aprovado → Merge para main
                                               ↓
                              deploy-edge-functions.yml (com aprovação manual)
```

---

## PARTE 8 — MATRIZ DE RISCO E PRIORIZAÇÃO

### Quadrante de Risco vs. Esforço

```
Alto Risco | Baixo Esforço        | Alto Risco | Alto Esforço
-----------+----------------------+-----------+------------------
CRÍTICO-001| Corrigir RLS user_roles  | ALTO-004 | Atualizar Kong
CRÍTICO-002| Corrigir RLS role_perms  | ALTO-007 | Estabilizar Auth VPS
CRÍTICO-003| Corrigir RLS cotacoes    | MÉDIO-007 | Consolidar Supabase
ALTO-005   | Branch protection GitHub |           |

Baixo Risco | Baixo Esforço      | Baixo Risco | Alto Esforço
-----------+----------------------+------------+------------------
ALTO-002   | CSP meta tag         | BAIXO-007  | Bundle splitting
MÉDIO-006  | npm audit fix        | MÉDIO-003  | Criar índices DB
BAIXO-001  | checkAccess explícito| MÉDIO-004  | Otimizar cron func
```

### Plano de Remediação por Sprint

**Sprint 0 (IMEDIATO — antes de qualquer usuário usar o sistema):**
- [ ] CRÍTICO-001: Corrigir RLS `user_roles`
- [ ] CRÍTICO-002: Corrigir RLS `role_permissions`
- [ ] CRÍTICO-003: Corrigir RLS `cotacoes` (isolamento por agente)
- [ ] ALTO-005: Ativar branch protection no GitHub

**Sprint 1 (Semana 1):**
- [ ] ALTO-001: Autenticar `webhook-dispatcher`
- [ ] ALTO-002: Adicionar CSP ao `index.html`
- [ ] ALTO-003: Corrigir nonce placeholder `{{nonce}}`
- [ ] MÉDIO-001: Migrar edge functions de `auth.ts` para `authorize.ts`
- [ ] MÉDIO-002: Substituir `sanitizeHtml()` por DOMPurify

**Sprint 2 (Semana 2):**
- [ ] ALTO-004: Atualizar Kong (planejar com cuidado — breaking changes)
- [ ] MÉDIO-003: Criar índices nos `webhook_audit_log` e `empresas`
- [ ] MÉDIO-006: `npm audit fix`
- [ ] MÉDIO-008: Verificar/corrigir `actions/checkout@v6`
- [ ] ALTO-006: Corrigir RLS `collections`

**Sprint 3 (Semana 3):**
- [ ] MÉDIO-012: CI check de políticas RLS perigosas
- [ ] MÉDIO-011: Rate limiting nas edge functions
- [ ] BAIXO-008: Source maps hidden + Sentry upload
- [ ] BAIXO-005: Autosave com userId na chave

---

## PARTE 9 — CHECKLIST DE CONFORMIDADE LGPD

| Requisito | Status | Evidência |
|-----------|--------|-----------|
| Usuário autenticado não acessa dados de terceiros | **FALHA** | CRÍTICO-003: cotações de todos visíveis |
| Dados de clientes isolados por empresa/agente | **FALHA** | RLS policies com USING (true) |
| Logs de acesso a dados pessoais | **Parcial** | webhook_audit_log existe, sem cobertura de cotações |
| Política de retenção de dados definida | **Não confirmado** | Não encontrado |
| Processo de exclusão de dados (right to erasure) | **Não confirmado** | Não encontrado |
| Criptografia de dados em repouso | **Parcial** | Supabase cloud (sim); VPS (verificar) |
| Criptografia em trânsito (TLS) | **Sim** | HTTPS/TLS via Kong/Nginx |
| Responsável pelo tratamento identificado (DPO) | **Não confirmado** | Não encontrado nos docs |

---

## PARTE 10 — PONTOS POSITIVOS (O QUE FUNCIONA BEM)

Esta auditoria, por natureza investigativa, foca em problemas. Para balanço, destacam-se implementações notáveis:

1. **`_shared/authorize.ts`** — Implementação de SSOT de auth robusta, com hierarquia de roles clara e double-check opcional via RPC. Excelente padrão.

2. **`webhook-inbound/index.ts`** — Validação HMAC-SHA256 com comparação timing-safe. Implementação correta de webhook security para inbound.

3. **`edge-authz-manifest.ts`** — SSOT para categorização de autorização das edge functions com CI gate. Excelente prática de governance.

4. **384 migrações versionadas** — O histórico de migrações é completo e auditável. A batch recente (T25-T34) mostra maturidade crescente.

5. **Husky + lint-staged** — Pre-commit hooks que garantem qualidade mínima de código antes de cada commit.

6. **Gitleaks + CodeQL** — SAST e secret scanning automatizados no CI. Boas práticas de DevSecOps.

7. **MFA/AAL2 support** — A plataforma suporta MFA com verificação de `currentAAL`. Importante para sistema corporativo.

8. **`manage-users` com `caller_password` + `reason`** — A exigência de senha e motivo para promoção de roles é uma boa prática de auditoria, mesmo que a validação da senha precise ser verificada.

9. **TanStack Query v5** — Configuração com `staleTime`, `gcTime` e `retry` adequados reduz requests desnecessários.

10. **Playwright multi-project** — Cobertura de smoke, public, authed e mobile em projetos separados.

---

## APÊNDICE A — COMANDOS DE VERIFICAÇÃO RÁPIDA

### Verificar vulnerabilidades RLS (executar no Supabase SQL Editor):

```sql
-- Encontrar políticas com USING (true) irrestrito:
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check,
  array_to_string(roles, ', ') as roles
FROM pg_policies
WHERE 
  (qual = '(true)' OR qual = 'true' OR with_check = '(true)' OR with_check = 'true')
  AND 'authenticated' = ANY(roles)
ORDER BY tablename, cmd;
```

### Verificar tabelas sem RLS habilitado:

```sql
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;
```

### Verificar índices ausentes em tabelas grandes:

```sql
SELECT 
  relname as tabela,
  n_live_tup as linhas,
  seq_scan,
  idx_scan,
  ROUND(100.0 * seq_scan / NULLIF(seq_scan + idx_scan, 0), 1) as pct_seq_scan
FROM pg_stat_user_tables
WHERE n_live_tup > 10000
  AND seq_scan > idx_scan
ORDER BY n_live_tup DESC;
```

---

## APÊNDICE B — INVENTÁRIO DE EDGE FUNCTIONS COM `verify_jwt = false`

Estas functions **não** recebem validação automática de JWT pelo runtime Supabase. Cada uma deve implementar autenticação própria **ou** ter justificativa documentada para ser pública:

| Função | verify_jwt | Auth Própria? | Justificativa Necessária |
|--------|------------|---------------|--------------------------|
| `crm-db-bridge` | false | A verificar | Bridge interno — verificar se exposto |
| `quote-public-view` | false | N/A (público) | Endpoint público — OK se sem dados privados |
| `ai-recommendations` | false | A verificar | Se usa API key de AI, custos podem ser abusados |
| `external-db-inspect` | false | **A verificar** | Inspeciona DB externo — alto risco |
| `image-proxy` | false | N/A (proxy) | Verificar hotlinking protection |
| `webhook-dispatcher` | false | **NÃO** | **ALTO-001: crítico** |
| `webhook-inbound` | false | Sim (HMAC) | OK — HMAC validado |
| `mcp-server` | false | A verificar | Se exposto externamente, verificar |
| `connections-auto-test` | false | A verificar | Testa conexões — verificar permissões |
| `e2e-cleanup` | false | A verificar | Deleta dados de teste — verificar isolamento |

---

## APÊNDICE C — ESTRUTURA DE ROLES E PERMISSÕES

### Hierarquia Documentada

```
dev (rank 3) — acesso total
  └── supervisor (rank 2) — gestão de equipe, não-críticos
        └── agente (rank 1) — operações do dia-a-dia
```

### Aliases Legados (causa de confusão)

| Alias Legado | Role Atual | Onde Usado |
|--------------|------------|-----------|
| `admin` | `dev` | `useRBAC.tsx` lookup em `role_permissions` |
| `manager` | `supervisor` | Alguns lugares do frontend |
| `vendedor` | `agente` | Comentários legados |

### Inconsistência de Terminologia

- Backend: `dev`, `supervisor`, `agente`
- Frontend (useRBAC DB lookup): `admin`, `supervisor`, `agente`
- Frontend UI: mistura de ambos

Recomendação: migrar `role_permissions` de `admin` → `dev` e remover mapeamento legado.

---

## CONCLUSÃO

O sistema Promo_Gifts demonstra arquitetura cuidadosa em várias camadas — o código frontend é bem estruturado, o CI/CD tem boa cobertura de testes automatizados, e a implementação recente do `authorize.ts` mostra maturidade crescente em segurança. Porém, a camada de banco de dados (RLS) apresenta falhas críticas que invalidam todo o trabalho de segurança feito nas camadas superiores.

**A regra de ouro da segurança em multicamadas** é: todas as camadas devem colaborar. Uma camada de apresentação segura com uma camada de dados vulnerável é equivalente a uma casa com fechadura na porta principal mas janelas abertas.

As 3 vulnerabilidades críticas identificadas (CRÍTICO-001, CRÍTICO-002, CRÍTICO-003) devem ser corrigidas **antes de qualquer usuário usar o sistema**. Não é uma questão de "melhorar com o tempo" — são falhas que permitem escalonamento de privilégios imediato e vazamento de dados.

**Veredicto: Sistema NÃO aprovado para produção no estado atual.**  
**Estimativa de esforço para aprovação: 2–3 sprints focados em segurança.**

---

*Documento gerado em: 2026-05-13*  
*Próxima revisão recomendada: após aplicação das correções críticas (esperado: 2026-05-20)*  
*Feramentas utilizadas: GitHub MCP, Supabase MCP, Portainer MCP, inspeção direta de código-fonte*
