# ADR 0001 — SSOT em Banco Externo (Catálogo & CRM)

**Status:** Accepted · **Date:** 2025-Q4

## Contexto
O Promo Gifts opera com 3 ambientes Supabase: Local (auth/orçamentos), Catálogo (produtos) e CRM (empresas). Duplicar produtos/empresas no banco local geraria divergência crônica.

## Decisão
Adotar **Single Source of Truth** nos bancos externos. O banco local **nunca** persiste cópias de produtos ou empresas — apenas IDs de referência (`product_id`, `client_id` como TEXT/UUID).

## Consequências
- ✅ Zero divergência de dados mestres
- ✅ Sincronização eliminada (não existe job ETL)
- ⚠️ Toda leitura de catálogo/CRM passa por `external-db-bridge` (single point of failure → mitigado por circuit breaker, ADR 0005)
- ⚠️ JOINs cross-DB são impossíveis → enriquecimento direcionado em batches de 3000

## Alternativas rejeitadas
- Replicação via Supabase Realtime: latência alta, sem garantia transacional
- Cache local com TTL: gerou inconsistências em testes piloto
