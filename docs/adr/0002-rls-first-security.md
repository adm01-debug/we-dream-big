# ADR 0002 — RLS-First Security Model

**Status:** Accepted · **Date:** 2025-Q3

## Contexto
Aplicação client-side (React + Supabase) sem backend tradicional. Lógica de autorização precisa viver no banco para sobreviver a bypass do cliente.

## Decisão
Toda tabela com dados sensíveis tem **RLS habilitado**. Roles ficam em `user_roles` (jamais em `profiles`) e são verificadas via função `has_role()` SECURITY DEFINER para evitar recursão.

## Consequências
- ✅ Impossível escapar autorização por DevTools/curl
- ✅ Edge functions com service-role permanecem como exceção controlada
- ⚠️ Testes RLS obrigatórios para 3 personas (anon, vendedor, admin) — ver `tests/rls/`
- ⚠️ Migrations precisam validar `auth.uid()` em policies, nunca confiar em payload do cliente

## Alternativas rejeitadas
- Autorização só no front-end: bypass trivial
- Edge function como gateway único: latência + complexidade desnecessária para CRUD simples
