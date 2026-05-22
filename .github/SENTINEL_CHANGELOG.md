# Sentinel Changelog

> **Por que este arquivo existe:** o `Branch Protection Sentinel` é um guard-rail
> ativo. Mudar suas regras sem registro é uma forma fácil de degradar a segurança
> sem ninguém perceber. Cada mudança aqui é uma decisão registrada para sobreviver
> a trocas de sessão de chat, trocas de pessoa no plantão, etc.

## v2.0.0 — 2026-05-22 — Hardening híbrido (Opção C)

**Contexto:** push direto em `main` com commit `docs(redeploy): add README as index to redeploy folder` (SHA `8e9ef02`) disparou o sentinel v1 corretamente. Aprovada a Opção C do plano híbrido: ligar Branch Protection real + afinar o sentinel.

**Mudanças no comportamento:**

| # | Mudança | Resolve |
|---|---|---|
| 1 | `fetch-depth` de `2` → `0` (histórico completo) e auditoria de **todos** os commits do push, não só HEAD | G1: push com N commits passava N-1 invisíveis |
| 2 | `tr -d '\r'` em subject e full_msg para normalizar CRLF | G2: regex `$` quebrava em ambientes Windows/Git Bash |
| 3 | Job paralelo `check-protection-config` que avisa se Branch Protection está desligada em `main` | G3: sentinel era só alarme reativo |
| 4 | `set -euo pipefail` explícito em todos os steps | G5: boa prática faltando |
| 5 | Mensagem de erro acionável (mostra comandos de correção no Summary) | G6: dev recebia exit 1 sem orientação |
| 6 | Lógica extraída para `scripts/sentinel-check.sh` (testável isoladamente) | G7: mudanças no bash só validavam em prod |
| 7 | Workflow `sentinel-self-test.yml` rodando 28 fixtures (PASS + FAIL esperados) em PRs que mexem no sentinel | G7: idem |
| 8 | Notificação Slack opcional via secret `SENTINEL_SLACK_WEBHOOK` (no-op se ausente) | G8: sem notificação ativa |
| 9 | Bypass explícito `[skip-sentinel: <motivo>]` com motivo obrigatório (>=5 chars não-espaço) | G9: sem escape hatch documentado |
| 10 | Allowlist estreita: `docs(redeploy):`, `chore(workflows):`, `chore(docs):` | Resolve o caso original (docs/redeploy) sem virar peneira |

**Decisões importantes:**

- **Allowlist é estreita por design.** Cada novo prefixo aceito é uma porta de fuga. Adicionar prefixo aqui exige registro neste changelog com justificativa.
- **Bypass exige motivo.** `[skip-sentinel]` puro (sem `:`) é rejeitado para evitar uso preguiçoso. Motivo `< 5` chars também é rejeitado (`ok`, `wip` não passam).
- **Branch Protection é o controle primário.** O sentinel é defesa em profundidade. Sem Branch Protection, o sentinel só registra; com ela, o push direto é bloqueado pelo próprio GitHub.

**Famílias de bot reconhecidas:**

- Oficiais GitHub: `github-actions[bot]`, `dependabot[bot]`, `renovate[bot]`
- Lovable / gpt-engineer (regex): `^(lovable|gpt-engineer)-[a-z0-9-]+\[bot\]$`
  - Cobre: `lovable-dev[bot]`, `lovable-bot[bot]`, `lovable-cloud[bot]`, `gpt-engineer-app[bot]`, etc.

**Como adicionar uma nova família de bot no futuro:**

1. Edite `scripts/sentinel-check.sh` (regra 3 ou 4).
2. Adicione fixtures de PASS em `.github/workflows/sentinel-self-test.yml`.
3. Registre aqui com data e justificativa.
4. Abra PR com a mudança.

## v1.0.0 — pré-2026-05-22 — Versão inicial

5 padrões aceitos:

1. Squash merge: subject termina em `(#NNN)`
2. Merge commit: subject começa com `Merge pull request #NNN`
3. Bot oficial: `github-actions[bot]`, `dependabot[bot]`, `renovate[bot]`
4. Família Lovable (regex): `^(lovable|gpt-engineer)-[a-z0-9-]+\[bot\]$`
5. Release: subject começa com `chore(release):`

Limitações conhecidas (documentadas como G1–G10 na v2.0.0): só auditava HEAD, regex frágil com CRLF, sem bypass documentado, sem teste, sem notificação, sem job de check de proteção, sem mensagens acionáveis.
