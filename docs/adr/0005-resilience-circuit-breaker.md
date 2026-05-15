# ADR 0005 — Circuit Breaker em Bridges Externas

**Status:** Accepted · **Date:** 2025-Q4

## Contexto
`external-db-bridge` e `crm-db-bridge` chamam Supabase externos. Falhas em cascata derrubavam o catálogo todo quando o CRM ficava lento.

## Decisão
Implementar **circuit breaker in-memory** nos edge functions:
- Threshold: 5 falhas em janela de 30s → abre o circuito
- Estado aberto: rejeita por 60s com fallback (cache stale ou erro 503 estruturado)
- Half-open após 60s: 1 request de teste; sucesso fecha, falha reabre

Implementação em `supabase/functions/_shared/circuit-breaker.ts`.

## Consequências
- ✅ Degradação graciosa: catálogo principal continua se CRM cai
- ✅ Reduz custo de invocação durante outage upstream
- ⚠️ Estado per-instance (Deno isolate) — aceitável: cada isolate detecta falha independentemente em <5 requests
