# 🔐 Runbook P0: Rotação de Credenciais — Incidente `.env` Exposto

**Severidade:** 🚨 P0 — Crítica
**Janela máxima de execução:** 24 h após detecção
**Responsável:** Pink (`ti@promobrindes.com.br`)
**Status:** ⏳ Aguardando execução

---

## 1. Contexto

Em sessão de auditoria anterior, detectou-se que um arquivo `.env` foi exposto no histórico do repositório `adm01-debug/Promo_Gifts`. Mesmo após a remoção, **as credenciais que ele continha devem ser tratadas como comprometidas e rotacionadas por padrão**. Esta é prática padrão de incident response — qualquer agente externo pode ter clonado o histórico antes da remoção.

## 2. Princípio Operacional

**Rotacionar > revogar.**

- **Rotacionar** = gerar nova credencial e atualizar consumidores → serviço continua operacional.
- **Revogar** = invalidar a credencial sem substituir → derruba produção sem necessidade.

Sempre rotacionar. Revogação só faz sentido se a credencial já tiver sido confirmadamente usada por terceiros.

## 3. Ordem de Execução (Sequencial — NÃO Paralela)

A ordem importa. Alguns serviços dependem de outros; rotacionar Supabase antes de o n8n estar pronto para receber a nova chave quebra fluxos.

### 3.1 Supabase (banco + Edge Functions)

1. Acessar https://supabase.com/dashboard → projeto `allrjhkpuscmgbsnmjlv`
2. **Settings → API** → anotar valores atuais:
   - `Project URL` (não muda — informativo apenas)
   - `anon` public key (pública por design — não rotacionar)
   - `service_role` key 🔥 **(PRIVADA — rotacionar)**
3. Antes de clicar em **Reset service_role key**, listar consumidores em outra aba:
   - n8n workflows (variáveis com nome `SUPABASE_SERVICE_ROLE_KEY` ou similar)
   - Edge Functions (Settings → Edge Functions → Secrets)
   - Cloudflare Workers (env bindings)
   - Aplicação local em desenvolvimento (`.env`)
4. **Reset service_role key** → copiar nova key (só aparece UMA VEZ)
5. ⚡ Imediatamente atualizar todos os consumidores listados (próximas seções)

### 3.2 n8n (variáveis e credenciais)

1. Acessar painel n8n → **Settings → Variables**
2. Atualizar variáveis Supabase (nova service_role do passo 3.1.4)
3. **Credentials** → revogar e recriar credenciais que dependem de chaves Supabase
4. Disparar manualmente um workflow simples para validar conexão (ex.: leitura de uma tabela trivial)

### 3.3 Bitrix24 (OAuth e webhooks)

1. Acessar Bitrix24 → **Aplicativos → Webhooks de entrada/saída**
2. **Importante:** o webhook clássico `ipkwbb32nhewia33` está marcado como **INVÁLIDO** no histórico. Confirmar que está revogado.
3. **OAuth Bitrix24 ↔ n8n** (`oEUYsInMBZbNlMoI`):
   - Verificar se ainda está em uso
   - Se sim, revogar e gerar novo OAuth client
   - Atualizar n8n com novo `client_id` + `client_secret`
4. Para qualquer credencial OAuth ou webhook usado pelo backend:
   - Revogar o existente
   - Gerar novo
   - Atualizar consumidores
5. **Validar:** disparar uma chamada de teste

### 3.4 Evolution API (WhatsApp)

1. Acessar painel Evolution API
2. Cada instância tem `apikey` própria → **Settings da instância → Regenerate API key**
3. Atualizar consumidores:
   - n8n credentials (categoria Evolution)
   - Backend Promo_Gifts (variável `EVOLUTION_API_KEY`)
4. **Validar:** enviar mensagem de teste para número próprio

## 4. Checklist de Fechamento

Marcar conforme avança:

- [ ] Supabase `service_role` key rotacionada
- [ ] n8n com novas variáveis aplicadas
- [ ] Edge Functions com novos secrets
- [ ] Cloudflare Workers com novos bindings
- [ ] Bitrix24 OAuth/webhook regenerado
- [ ] Evolution API key regenerada
- [ ] Workflows n8n validados (1 teste por integração)
- [ ] Aplicação Promo_Gifts redeployada com novas envs
- [ ] `.env` local atualizado (e nunca commitado)
- [ ] `.env` confirmado em `.gitignore`
- [ ] Histórico do git escaneado: `gitleaks detect --source . --no-git`

## 5. Pós-Rotação (Hardening)

1. Confirmar que o workflow `gitleaks` no CI está ativo (já presente em `.github/workflows/security.yml`)
2. Considerar pre-commit hook `gitleaks` localmente
3. Revisar quem tem acesso aos painéis dos 4 serviços (princípio do menor privilégio)
4. Documentar este incidente em `docs/INCIDENTS/2026-04-env-exposure.md` com timeline e lições aprendidas

## 6. Tempo Estimado

| Etapa | Duração |
|---|---|
| Supabase | 15 min |
| n8n | 20 min |
| Bitrix24 | 15 min |
| Evolution | 10 min |
| Validação ponta a ponta | 30 min |
| **Total** | **~90 min** |

## 7. Bloqueios Potenciais e Mitigação

| Bloqueio | Mitigação |
|---|---|
| Aplicação produção quebra durante a janela | Aceitável se < 5 min de downtime; comunicar ao time antes |
| Esquecer um consumidor da credencial | Antes de rotacionar, `grep -r "SUPABASE_SERVICE_ROLE" .` em todos os repos |
| Nova credencial não copiada (some após o reset) | Armazenar em gerenciador de secrets ANTES de fechar a aba |
| n8n não reconhece nova variável | Reiniciar workflow / clear cache |

## 8. Critério de Sucesso

- [ ] Os 4 serviços operacionais com novas credenciais
- [ ] Nenhum consumidor com credencial antiga ativa
- [ ] CI verde após o deploy
- [ ] Workflow de validação executado em cada integração

---

**Referência:** Issue de tracking deste runbook → será criada em conjunto com este PR.
