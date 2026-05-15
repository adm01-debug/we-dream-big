---
name: Business Intelligence Module
description: Módulo /ferramentas/bi com inteligência 360° por cliente em 6 zonas. Usa quote_items + quotes via RPCs (top products, benchmark, sazonalidade); fallback mock quando volume insuficiente. Inclui benchmarking Cliente × Setor, Heatmap de Sazonalidade e exportação de Dossiê PDF (5 páginas).
type: feature
---

# Business Intelligence (Ferramentas → BI)

**Rota:** `/ferramentas/bi` · **Sidebar:** Ferramentas → "Business Intelligence" (ícone Sparkles)

## Arquitetura
- Página: `src/pages/BusinessIntelligencePage.tsx` (header inclui `<ExportDossierButton>` quando cliente selecionado)
- Componentes: `src/components/bi/{ClientSelector, ClientOverview360, ClientVsIndustryComparison, ClientAffinityProducts, IndustryTrendingProducts, ClientSeasonalityHeatmap, EmpiricalRecommendations, BIProductCard, ExportDossierButton}.tsx`
- Hooks: `src/hooks/bi/{useClientBI, useClientVsIndustry, useClientAffinity, useIndustryTrends, useClientSeasonality, useBIDossierExport}.ts`
- Curadoria: `src/lib/bi/industryRecommendations.ts`
- Mocks: `src/lib/bi/mockData.ts` (`MOCK_CLIENT_STATS`, `getMockIndustryTrends`, `getMockSeasonality`)
- Gerador PDF: `src/lib/bi/dossierPdfGenerator.ts` (5 páginas: Capa · 360° · Cliente×Setor · Recomendações · Sazonalidade)

## 6 Zonas de Inteligência
1. **Visão 360°** — LTV, ticket médio, recência + timeline 5 últimos pedidos
2. **Cliente × Setor** — benchmark de 4 métricas vs média do ramo (±15%), barras + insight
3. **Afinidade** — top categorias do cliente + produtos reais sugeridos
4. **Tendência do setor** — top produtos vendidos para empresas do mesmo ramo (90 dias)
5. **Sazonalidade Cliente × Setor** *(Fase 4)* — heatmap 12 meses × 2 linhas; tooltip por mês; cards "Próximo pico" + "Insight"; top 3 picos cliente/setor; janela 24 meses
6. **Sugestão do especialista** — curadoria fixa por ramo

## RPCs ativas (SECURITY DEFINER, search_path=public)
- `get_client_top_products(_client_id, _limit)` — vendedor dono / admin / manager
- `get_industry_top_products(_company_ids, _days, _limit)` — qualquer autenticado
- `get_industry_benchmark_stats(_company_ids, _days)` — Zona 2
- **`get_client_seasonality(_client_id, _months DEFAULT 24)`** — Zona 5; vendedor dono / admin / manager. Retorna (year, month, quotes_count, total_revenue, avg_ticket).
- **`get_industry_seasonality(_company_ids, _months DEFAULT 24)`** — Zona 5; qualquer autenticado. Retorna (year, month, avg_quotes_per_company, avg_revenue_per_company, companies_active).

## Estratégia híbrida real + mock
- `useClientAffinity` / `useIndustryTrends` / `useClientSeasonality`: chamam RPC; vazio → fallback mock determinístico.
- `useClientVsIndustry`: resolve `selectCrm({ ramo_atividade })` (exclui o próprio); MIN_SAMPLE=3, THRESHOLD=15%, DAYS_WINDOW=180.
- `useClientSeasonality`: hasEnoughData = ≥ 3 meses distintos com dados. Calcula sharePercent + intensity normalizada por mês, top 3 picos cliente e setor, próximo pico (busca nos próximos 12 meses), insight textual por regras.

## Heatmap (Zona 5) — visual
- Grid `[80px_repeat(12,1fr)]` × 2 linhas. Intensidade mapeada para `bg-violet-{50→600}` (escala de 7 níveis). Mês atual ganha `ring-2 ring-violet-600`. Tooltip Radix por célula. Cards inferiores: "Próximo pico" (violet-50/950) + "Insight". Badge real/simulado no header.

## Dossiê PDF (5 páginas)
`useBIDossierExport(clientId)` aguarda **todos** os hooks (incluindo `useClientSeasonality`) resolverem antes de gerar. Estrutura:
1. Capa violeta (logo + cliente + vendedor + data)
2. Visão 360° (4 KPI boxes + tabela pedidos)
3. Cliente × Setor (tabela métricas + insight destacado)
4. Recomendações (afinidade + tendência setor + especialista)
5. **Sazonalidade** *(Fase 4)* — tabela 12 meses Cliente vs Setor (pedidos + % do ano), top 3 picos, próximo pico, insight de timing

Rodapé fixo "Confidencial · uso interno comercial". File: `dossie-bi-{slug-cliente}-{YYYY-MM-DD}.pdf`.

## Invariantes
- Match de ramo: case-insensitive contra `ramo` + `aliases`.
- Cliente sem ramo: Zonas 2, 4 e setor da Zona 5 mostram fallback genérico.
- Sazonalidade: se cliente tem dados mas setor não, mantém heatmap do cliente real e usa mock só para a linha do setor.
- BIProductCard: imagem real quando `imageUrl` presente; CTA "Ver produto" só com `productId`.

## Categorização (limitação atual)
`quote_items` não tem `category` — derivação heurística por regex no nome. Substituir quando catálogo expor mapeamento direto.

## Como evoluir para `orders` (Fase futura)
1. Criar RPCs paralelas para `order_items` + `orders` (incluindo seasonality).
2. `Promise.all([rpcOrders, rpcQuotes])` e mesclar (orders prioritário).

## Fora de escopo (próximos sprints)
- Editor admin para `INDUSTRY_RECOMMENDATIONS`
- Compartilhar dossiê via link público assinado
- Notificações automáticas em pico sazonal
- Coluna `category_id` em `quote_items`
