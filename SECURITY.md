# Política de Segurança

## 🔐 Reportar Vulnerabilidades

**Não abra issue pública para vulnerabilidades.**

Use um destes canais:

1. **Preferido:** [GitHub Security Advisory](../../security/advisories/new) (canal privado)
2. **Alternativo:** e-mail para `adm01@promobrindes.com.br`

Inclua, se possível:
- Descrição da vulnerabilidade
- Passos para reproduzir
- Impacto potencial
- Sugestão de correção (opcional)

## ⏱️ SLA de resposta

| Severidade | Primeira resposta | Correção alvo |
|---|---|---|
| 🔴 Crítica (RCE, data leak, auth bypass) | 24h | 72h |
| 🟠 Alta (privilege escalation, XSS armado) | 48h | 7d |
| 🟡 Média (info disclosure limitado) | 5d | 30d |
| 🟢 Baixa (best practice, hardening) | 14d | conforme roadmap |

## 🛡️ Escopo

**Em escopo:**
- Código deste repositório
- Edge Functions Supabase publicadas
- Endpoints expostos publicamente
- Secrets vazados em commits

**Fora de escopo:**
- Engenharia social
- Ataques físicos
- DoS volumétrico
- Vulnerabilidades em dependências de terceiros já reportadas upstream

## 🚫 O que NÃO fazer

- Não realizar testes em produção sem coordenação prévia
- Não acessar dados de clientes ou colaboradores
- Não tornar a vulnerabilidade pública antes da correção

## 🏆 Reconhecimento

Pesquisadores responsáveis serão creditados (com permissão) no `CHANGELOG.md` da versão que contém a correção.
