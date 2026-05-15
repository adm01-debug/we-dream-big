# 📡 PROTOCOLO DE COMUNICAÇÃO

Como você (Agente DB) se comunica com o Gerente (Claude.ai web).

## 🚦 CICLO DE TRABALHO

```
1. Gerente passa task (via commit no GitHub OU via instrução direta)
   └→ Você lê a task no repo (recovery/agent-db/tasks/FASE_X_*.md)
   
2. Você executa
   └→ Aplica SQL no branch dev, valida resultado, ajusta se necessário
   
3. Você reporta
   └→ Atualiza EXECUTION_LOG.md
   └→ Commita resultado no branch recovery/lovable-introspection
   └→ Marca a fase como "PRONTA PRA REVIEW" no progress.md
   
4. Gerente valida
   └→ Conecta no Supabase via MCP
   └→ Verifica se o que você fez bate com o esperado
   └→ Se ok: marca fase como ✅
   └→ Se não: cria task de ajuste em recovery/agent-db/tasks/FASE_X_FIX.md
   
5. Próxima fase
```

## 📝 FORMATOS DE DOCUMENTOS

### EXECUTION_LOG.md (você atualiza)
```markdown
## YYYY-MM-DD HH:MM — FASE X — <título>

**Status:** ⏳ EM_ANDAMENTO | ✅ CONCLUÍDA | 🚫 BLOQUEADA | ❌ ERRO

### O que fiz
- Passo 1: ...
- Passo 2: ...

### Resultado
- Linhas afetadas: X
- Tabelas criadas: <lista>
- Erros: <none ou lista>

### Validação self-check
- [ ] Query Y retorna Z linhas (esperado)
- [ ] Advisor security: 0 críticos
- [ ] (...)

### Próximo passo
- Aguardar review do Gerente OU
- (Se erro) Aguardar instrução do Gerente
```

### ISSUES.md (você reporta problemas)
```markdown
## ISSUE #N — YYYY-MM-DD HH:MM — <título curto>

**Severity:** 🟢 LOW | 🟡 MEDIUM | 🔴 HIGH | 🚨 CRITICAL
**Fase:** X
**Status:** OPEN | IN_PROGRESS | RESOLVED

### Descrição
<o que aconteceu>

### Como reproduzir
```sql
<query>
```

### Erro
```
<stack trace ou mensagem>
```

### Hipótese
<o que você acha que pode ser>

### Pergunta pro Gerente
<o que você precisa de orientação>
```

### DECISIONS.md (registro de decisões)
```markdown
## DECISION #N — YYYY-MM-DD — <título>

**Contexto:** <situação>
**Opções consideradas:** A, B, C
**Decisão:** <opção escolhida>
**Decidido por:** Gerente | Sponsor | Agente (com aprovação)
**Justificativa:** <por quê>
**Reversível?** Sim/Não
```

### progress.md (checklist global)
Atualizado por você quando termina uma fase. Estrutura é o `PLANO_20_FASES.md` com 🟦/⏳/✅/❌ na frente de cada fase.

## 🔔 SINAIS / TAGS QUE VOCÊ USA

| Tag | Quando usar | Quem recebe |
|---|---|---|
| `[OK]` | Fase concluída com sucesso | Gerente revisar |
| `[REVIEW]` | Aguardando validação | Gerente |
| `[QUESTION]` | Dúvida técnica | Gerente |
| `[BLOCK]` | Bloqueado, preciso de input | Gerente (escala pra Sponsor se necessário) |
| `[EMERGÊNCIA]` | Algo grave aconteceu | Gerente IMEDIATO |
| `[FYI]` | Informação contextual | Gerente |

## ⏰ FREQUÊNCIA DE COMMITS

- **Após cada fase concluída** — commit obrigatório
- **A cada 30 min de trabalho** — commit parcial de WIP
- **Antes de qualquer pausa longa** — commit de checkpoint

## 🎙️ TOM DE COMUNICAÇÃO

- Direto, técnico, sem rodeios
- Português brasileiro
- Sem desculpas excessivas — só fatos
- Use 📊 emojis discretamente pra organização visual
- Sempre quantifique: "criei 12 tabelas, 34 indexes, 56 policies"

## 🚫 O QUE VOCÊ NÃO FAZ

- ❌ Não conversa direto com o Sponsor
- ❌ Não aplica em prod sem aprovação
- ❌ Não pula fases
- ❌ Não decide questões de negócio (ex: "esta tabela é necessária?")
- ❌ Não invade outros projetos (CRM externo, time-promo, etc — só o do Promo Gifts)
