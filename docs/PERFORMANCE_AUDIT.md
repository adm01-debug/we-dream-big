# Performance Audit — N+1 & Hot Queries

**Última auditoria:** 2026-04-17 · **Próxima revisão:** Trimestral

## Metodologia
1. Identificar top-10 hooks por frequência de invocação (telemetria `query_telemetry`)
2. Rodar `EXPLAIN (ANALYZE, BUFFERS)` em ambiente staging
3. Flag queries > 200ms ou > 1000 buffers shared hit

## Top-10 Queries Auditadas

### 1. `useExternalProducts` — listagem paginada
- **Padrão:** `external-db-bridge` op=`list_products` limit=60
- **Plan:** Index Scan via `idx_products_active_created_at`
- **Resultado:** ~80ms p95, 0 N+1
- **Status:** ✅ OK

### 2. `useProductDetail` — produto + variants + images
- **Risco N+1:** variants e images carregadas em paralelo via `Promise.all` (não sequencial)
- **Resultado:** ~120ms p95
- **Status:** ✅ OK

### 3. `useQuotesList` — kanban de orçamentos
- **Plan:** Index Scan `quotes_seller_id_status_idx`
- **Resultado:** ~60ms p95
- **Status:** ✅ OK

### 4. `useNotifications` — polling 30s
- **Plan:** Index Scan `workspace_notifications_user_id_is_read_idx`
- **Resultado:** ~15ms p95
- **Status:** ✅ OK (polling > realtime — ver memória `notifications/workspace-notification-service-v2`)

### 5. `useStockAlerts` — header indicator
- **Plan:** Aggregate via RPC `get_stock_alerts_summary`
- **Resultado:** ~180ms p95 (cache 5min mitiga)
- **Status:** ⚠️ Considerar materialized view se p95 > 250ms

### 6. `useSupplierStats`
- **Status:** ✅ OK (~40ms)

### 7. `useCategoryTree` — sidebar
- **Plan:** Recursive CTE via `get_category_descendants`
- **Resultado:** ~25ms p95 (resultado cacheado em React Query 1h)
- **Status:** ✅ OK

### 8. `useDiscountApprovalRequests` — admin queue
- **Status:** ✅ OK (~30ms)

### 9. `useAIQuota` — Flow header
- **Plan:** Aggregate `ai_usage_logs` filtered by month
- **Resultado:** ~20ms p95 (índice `idx_ai_logs_user_created`)
- **Status:** ✅ OK

### 10. `useClientHistory` — cliente 360°
- **Plan:** 3 queries paralelas (quotes, orders, comments)
- **Resultado:** ~150ms p95
- **Status:** ✅ OK

## Conclusão
Nenhum N+1 identificado. Maior gargalo é `useStockAlerts` mitigado por cache. Indexes em `quotes(seller_id, status)` e `workspace_notifications(user_id, is_read)` estão sustentando a carga atual.

## Próximas otimizações
- Materialized view para stock alerts se a base crescer >2x
- Considerar PgBouncer transaction pooling se concorrência > 100
