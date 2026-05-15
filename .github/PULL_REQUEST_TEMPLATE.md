## 📋 Descrição

<!-- O que muda e por quê. Seja conciso (1-3 frases). -->

## 🎯 Tipo de mudança

- [ ] 🚀 feat — nova funcionalidade
- [ ] 🐛 fix — correção de bug
- [ ] ♻️ refactor — refatoração (sem mudança de comportamento)
- [ ] 🔧 chore — manutenção, deps, config
- [ ] 📚 docs — documentação
- [ ] ⚡ perf — performance
- [ ] 🔒 security — segurança
- [ ] 🚨 hotfix — correção urgente em produção
- [ ] 💥 breaking change — quebra compatibilidade

## 🔗 Issues relacionadas

<!--
Use uma das palavras-chave abaixo para conectar issues e fechá-las automaticamente ao merge:

  Closes #123     → fecha #123 quando esta PR for mergeada
  Fixes #456      → fecha #456 (sinônimo)
  Refs #789       → apenas referencia (não fecha)
  Part of #999    → indica que é parte de um trabalho maior

Se esta PR DESCOBRIR uma issue nova (caso de tracking), abra-a ANTES e linke aqui.
Padrão do projeto: issues sempre devem ter referência à PR que as criou.
-->

Closes #
Refs #

## 🌐 Sistemas afetados

- [ ] Bitrix24 (CRM, SPAs, BizProc)
- [ ] Supabase (DB, Edge Functions, RLS, migrations)
- [ ] n8n (workflows)
- [ ] Evolution API / WhatsApp
- [ ] Bling (NFe, OAuth)
- [ ] Cloudflare (Workers, Images, Tunnels)
- [ ] Frontend (UI, dashboards)
- [ ] CI / GitHub Actions
- [ ] Outro: ____

## 🧪 Como testar

<!-- Passo a passo para validar. Inclua dados de teste se necessário. -->

1.
2.
3.

## ✅ Checklist pré-merge

### Qualidade
- [ ] Código segue style guide (ESLint passa)
- [ ] `npx tsc --noEmit` passa sem erros
- [ ] Testes passam (`npm run test`)
- [ ] Adicionei testes para novas funcionalidades quando aplicável
- [ ] CodeRabbit revisou o PR (ou justificativa para skip)

### Segurança
- [ ] Sem secrets, tokens ou credenciais hardcoded
- [ ] Variáveis de ambiente novas documentadas
- [ ] Sem `console.log` com payloads sensíveis (usar `logger.*`)
- [ ] RLS revisado se houve mudança em tabelas
- [ ] Edge functions: input validado com Zod

### Documentação
- [ ] Atualizei docs (README / CHANGELOG / docs/) se necessário
- [ ] Memória atualizada (`mem://`) se a mudança afetar arquitetura/regras
- [ ] Migrations com backup em `_backup_*_YYYYMMDD` se destrutivas

### UI
- [ ] Componentes usam tokens semânticos (sem cores hardcoded)
- [ ] Screenshots / vídeo anexados (se mudança visual)

## 📸 Screenshots (se UI)

<!-- Antes / Depois -->

## 🔄 Plano de rollback

<!-- Como reverter se algo der errado em produção? -->

## ⚠️ Notas para o reviewer

<!-- Algo que mereça atenção especial -->
