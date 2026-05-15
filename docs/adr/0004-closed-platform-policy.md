# ADR 0004 — Plataforma Fechada (No Public Signup)

**Status:** Accepted · **Date:** 2025-Q3

## Contexto
Promo Gifts é ferramenta interna de vendedores autorizados. Signup público não faz sentido de negócio e amplia superfície de ataque.

## Decisão
- Signup público **desabilitado** no Supabase Auth
- Todos os usuários criados via Admin API por administrador
- Recuperação de senha: fluxo manual em 3 fases (request → admin approval → reset link)
- Rota `/admin/*` protegida por `<AdminRoute>` (verifica role `admin` em `user_roles`)

## Consequências
- ✅ Zero contas fantasmas
- ✅ Rate limiting de auth menos crítico
- ⚠️ Onboarding de novo vendedor exige ação manual de admin (~5min)
