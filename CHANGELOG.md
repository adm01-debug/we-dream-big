# Changelog

Todas as mudanças notáveis deste projeto são documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Unreleased]

### 🚀 Redeploy 2026-05 — Fase 2 (T19–T23) + Fase 3 (T24–T30)

**Fase 2 — Segurança P1 (PR #166)**

- T19: 10 views SECURITY DEFINER refatoradas para `security_invoker=true` + REVOKE de anon
- T20: 7 materialized views movidas de `public` para schema `analytics` com wrapper views (frontend não muda)
- T21: 17 policies `USING(true)` expostas a `public`/`anon` — 2 restritas (suppliers/preços) + 15 documentadas via `COMMENT ON POLICY`
- T22: branch protection + Dependabot + Secret Scanning ⏳ (`docs/redeploy/REDEPLOY-FASE2-CHECKLIST-UI.md` — ação UI manual)
- T23: 2 buckets públicos fechados (`recibos-entrega`, `scripts`); policy `recibos_authenticated_read` ⏳ (limitação técnica documentada: `storage.objects` pertence a `supabase_storage_admin`)
- T3: `docs/DEPLOYMENT.md` reescrito (removida instrução perigosa `supabase db push`); CI guard `check-no-db-push.mjs` instalado
- Reviews endereçadas: 7 CodeRabbit + 1 Codex P1 crítico (sentinel push-only) + 4 Copilot + 2 Codex P2

**Fase 3 — Hardening 10/10**

- T24: 2 dos 5 arquivos de teste skipados re-habilitados (`SidebarFocusVisible`, `SidebarNavGroup.harmony`); 3 restantes (collapse/history/suspense) mantidos com justificativa rastreável atualizada
- T28 piloto: 36 funções SECURITY DEFINER (audit/auto/build/cleanup/purge/enforce/sync) revogadas de `anon` + `authenticated`. Advisor: **651 → 578 WARN entries** (-73). Critério C2 do plano atingido
- T28 guard: `scripts/check-security-definer-hardening.mjs` bloqueia migrations novas adicionando função SECURITY DEFINER sem `search_path` + REVOKE de anon
- T26: inventário formal de observability — Sentry + structured logger + webhook metrics + request_id ponta-a-ponta. Gaps catalogados para Fase 4+
- T29 (este entry) + T30 sign-off: ver `docs/redeploy/REDEPLOY-FASE3-FINAL.md`

### 🚀 Adicionado — Hardening 10/10 (Onda 1)
- ESLint integrado ao pipeline de CI (`.github/workflows/ci.yml`)
- Verificação HIBP (Have I Been Pwned) habilitada para senhas fracas/vazadas
- Hardening de RLS em buckets públicos de Storage (UPDATE/DELETE restrito ao dono)
- Template de Pull Request com checklist obrigatório (`.github/pull_request_template.md`)
- Dependabot configurado para atualizações semanais de npm + GitHub Actions
- Cabeçalhos de segurança (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy) em `public/_headers`
- Coverage threshold elevado de 50% → 60% em `vitest.config.ts`
- Husky pre-push hook executando `npm run test` antes de push para prevenir regressões

### 🔒 Segurança
- CSP restritivo com allow-list de domínios externos (Supabase, Cloudflare Stream, CNPJa, OpenAI, Gemini, ElevenLabs)
- HSTS com `preload` (max-age 2 anos) — preparado para inclusão na lista HSTS Preload do Chromium

---

## [3.4.0] - 2025-04-10

### Adicionado
- Sincronização de orçamentos com SalesPro v3.4 (4 casas decimais em `unit_price`/`total_price`)
- Sistema de assinatura eletrônica de orçamentos (MP 2.200-2/2001)
- Workflow de aprovação de descontos com alçada por vendedor

### Corrigido
- Race condition em `acquire_ai_quota` (lock pessimista adicionado)

---

## [3.3.0] - 2025-03-25

### Adicionado
- Suíte Magic Up de marketing com IA (Gemini 3 Pro / Nano Banana Pro)
- Comparador de produtos com chave composta (productId::variant_id)
- Sistema de coleções privadas

---

## [3.2.0] - 2025-03-10

### Adicionado
- Catálogo com busca semântica (8 níveis + re-rank pg_trgm)
- Sistema de Estoque Futuro com previsões de reposição
- Multi-variant carousel nos cards de produto

---

## [3.0.0] - 2025-02-01

### 💥 Breaking
- Plataforma fechada: sign-up público desabilitado, cadastro apenas via convite admin
- RLS migrado para arquitetura SECURITY DEFINER + has_role()

### Adicionado
- 50 Edge Functions com validação Zod (100% de cobertura)
- Anti-scraping: bot detection + rate limit persistente + anti-hotlinking
- Logger estruturado (`src/lib/logger.ts`) substituindo todos os `console.*`

[Unreleased]: https://github.com/promo-gifts/app/compare/v3.4.0...HEAD
[3.4.0]: https://github.com/promo-gifts/app/compare/v3.3.0...v3.4.0
[3.3.0]: https://github.com/promo-gifts/app/compare/v3.2.0...v3.3.0
[3.2.0]: https://github.com/promo-gifts/app/compare/v3.0.0...v3.2.0
[3.0.0]: https://github.com/promo-gifts/app/releases/tag/v3.0.0
