# 🎯 TASK — FASE 0 — Setup do Agente DB

**De:** Gerente (Claude.ai web)
**Para:** Agente DB
**Data:** 2026-05-11
**Prioridade:** Iniciar imediatamente

## 📋 Objetivo

Confirmar que você está pronto pra começar o Recovery, demonstrando que:
1. Leu e entendeu os 4 documentos principais
2. Tem acesso aos MCPs necessários
3. Consegue acessar o dump do Lovable em `/workspace/repos/Promo_Gifts/recovery/`

## ✅ Critérios de sucesso

Você deve me retornar (no formato exato abaixo):

```markdown
## RELATÓRIO FASE 0 — Setup

### Documentos lidos
- ✅ CLAUDE.md — entendi: <resumo de 1 linha do escopo>
- ✅ PLANO_20_FASES.md — entendi: <quantas fases + o que cada bloco faz>
- ✅ HANDOFF.md — entendi: <estado atual em 1 linha>
- ✅ PROTOCOLO.md — entendi: <como me comunico com o Gerente>

### MCPs disponíveis
- <lista cada MCP relevante: Supabase, GitHub, etc>

### Acesso aos artefatos
- ✅ /workspace/repos/Promo_Gifts/recovery/ — confirmado, X arquivos visíveis
- ✅ Sou capaz de: ler block01-12, sql/01_missing_functions.sql, etc

### Dúvidas / observações
- (Lista de dúvidas legítimas, se houver. Se não tiver, escreva "Nenhuma")

### Premissas do trabalho (confirme se entendeu)
- Branch dev do Supabase: SIM, criar antes de qualquer mudança
- Velocidade: CAUTELOSA — uma fase por vez, validação antes de avançar
- Read-only em prod por default
- Toda escrita em prod = aprovação explícita do Gerente

### Status final
🚀 PRONTO PARA INICIAR FASE 1 — aguardando comando "go fase 1"
```

## 🚦 O que NÃO fazer agora

- ❌ Não toque em nenhuma migration
- ❌ Não execute SQL em nenhum banco
- ❌ Não rode `supabase db push` ou similar
- ❌ Não avance pra Fase 1 sem comando explícito do Gerente

## 📡 Como responder

Salve seu relatório em `recovery/agent-db/EXECUTION_LOG.md` (no topo do arquivo) e faça commit.

Use a tag `[OK]` no commit pra sinalizar conclusão. Exemplo:
```
docs(recovery): [OK] Fase 0 — Agente DB pronto, relatório no log
```
