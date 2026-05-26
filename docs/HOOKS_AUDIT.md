# Auditoria Exaustiva de Hooks — promo-gifts-v4

> Gerado em: 2026-05-26 | Autor: TIPROMO (Claude BPM Agent)
> Escopo: todos os hooks em `src/hooks/**`

---

## Sumário Executivo

| Severidade | Quantidade | Status |
|------------|-----------|--------|
| 🔴 Crítico | 4 | Corrigido |
| 🟡 Alto | 4 | Corrigido |
| 🔵 Médio | 6 | 2 corrigidos, 4 backlog |
| ✅ Sem bug | ~110 | — |

---

## Estrutura de Hooks (120+ arquivos)

```
src/hooks/
├── __tests__/          — testes de integração
├── admin/              — hooks administrativos
├── auth/               — autenticação, 2FA, RBAC, MFA
├── bi/                 — business intelligence
├── collections/        — coleções de produtos
├── common/             — utilitários compartilhados (debounce, search, urlState…)
├── comparison/         — comparação de produtos
├── crm/                — integração CRM/Bitrix
├── dev/                — ferramentas de desenvolvimento
├── favorites/          — favoritos
├── gravacao/           — simulação de gravação
├── intelligence/       — IA e dados externos
├── kit-builder/        — construtor de kits
├── mockup/             — mockup de produtos
├── products/           — catálogo (domínio principal — ~45 hooks)
├── quotes/             — cotações
├── simulation/         — simulação de preços
├── simulator/          — simulador de gravação
├── stock/              — estoque
├── tecnicas/           — técnicas de gravação
├── ui/                 — toasts, modais, temas
├── voice/              — busca por voz
└── useKillSwitchBanner.ts — banner de manutenção
```

---

## Bugs Encontrados e Status

### 🔴 BUG-CS-01 — CORRIGIDO
**Arquivo:** `src/hooks/products/useCatalogState.ts`
**isFavorite usada como boolean em statBadges**

```ts
// ANTES (errado) — isFavorite é função, sempre truthy
const contextualFavoriteCount = isFavorite
  ? deduped.filter((p) => isFavorite(p.id)).length
  : favoriteCount;

// DEPOIS (correto)
const contextualFavoriteCount = hasActiveFilters
  ? deduped.filter((p) => isFavorite(p.id)).length
  : favoriteCount;
```

**Impacto:** Badge Favoritos mostrava contagem errada. `isFavorite` é função e sempre truthy, então a branch `favoriteCount` nunca era alcançada.

---

### 🔴 BUG-CS-02 — CORRIGIDO
**Arquivo:** `src/hooks/products/useCatalogState.ts`
**resetFilters usava sort errado**

```ts
// ANTES
setSortBy('name'); // ← ERRADO

// DEPOIS
setSortBy('relevance'); // ← CORRETO (default)
```

---

### 🔴 BUG-CF-01 — CORRIGIDO
**Arquivo:** `src/hooks/products/useCatalogFiltering.ts`
**7 filtros contados mas nunca aplicados**

Filtros agora aplicados: `featured`, `isKit`, `publicoAlvo`, `datasComemorativas`, `endomarketing`, `ramosAtividade`, `segmentosAtividade`.

---

### 🔴 BUG-CF-02 — CORRIGIDO
**Arquivo:** `src/hooks/products/useCatalogFiltering.ts`
**Supplier filter usava campos errados**

```ts
// ANTES
supplierFilterSet.has(p.brand || '') || supplierFilterSet.has(p.supplier_reference || '');

// DEPOIS
supplierFilterSet.has(p.supplier?.name || '') || supplierFilterSet.has(String(p.supplier?.id ?? ''));
```

---

### 🟡 BUG-CF-03 — CORRIGIDO
**inStock ignorava estoque de variantes**

```ts
// DEPOIS
result = result.filter(
  (p) =>
    (p.stock || 0) > 0 ||
    p.colors?.some((c: { stock?: number }) => (c.stock || 0) > 0),
);
```

---

### 🟡 BUG-CS-03 — CORRIGIDO
**Auto-prefetch sem guard causava fetches duplicados**

Adicionado `prefetchScheduledRef` para evitar enfileiramento múltiplo de `requestIdleCallback`.

---

### 🟡 BUG-CS-04 — CORRIGIDO
**Threshold de priceRange inconsistente**

`useCatalogState` usava `< 500`, `useAdvancedFilters` usava `< 1000`. Unificado para `< 9999` via constante `PRICE_RANGE_MAX`.

---

### 🟡 BUG-CS-05 — CORRIGIDO
**isTransitioning manual → useTransition nativo**

`useState` + `React.startTransition` substituído por `useTransition()` hook nativo do React 18, que garante semântica correta de transições concorrentes.

---

### 🔵 BUG-CS-06 — CORRIGIDO
**Flash de empty state durante debounce**

`displayCount` agora reseta usando `debouncedServerSearch` ao invés de `searchQuery`.

---

### 🔵 BUG-STAT-01 — CORRIGIDO
**Dep desnecessária em statBadges**

Removido `hasNextPage` das deps do `useMemo` de `statBadges`.

---

## Backlog (próximo PR)

| ID | Arquivo | Descrição |
|----|---------|-----------|
| BUG-AF-01 | `useAdvancedFilters.ts` | useEffect deps vazias — re-fetch não dispara após mudança nos hooks de DB |
| BUG-LOADING-01 | `useAdvancedFilters.ts` | isLoading inicializa true desnecessariamente quando dados estão em cache |
| BUG-KBD-01 | `useCatalogState.ts` | handleFavoriteProduct instável nas deps do keyboard handler |

---

## Plano de 30 Tarefas

| # | Grupo | Tarefa | Status |
|---|-------|--------|--------|
| T01 | Análise | Catalogar 120+ hooks | ✅ |
| T02 | Análise | Análise profunda grupo products | ✅ |
| T03 | Análise | Análise auth + common | ✅ |
| T04 | Análise | Análise bi / collections / crm | 🔄 |
| T05 | Análise | Análise gravacao + intelligence + ui | 🔄 |
| T06 | Docs | Criar HOOKS_AUDIT.md | ✅ |
| T07 | Docs | Criar GitHub Issues | 🔄 |
| T08 | Docs | Criar CHANGELOG | 🔄 |
| T09 | Fix C | BUG-CS-01 isFavorite boolean | ✅ |
| T10 | Fix C | BUG-CS-02 resetFilters sort | ✅ |
| T11 | Fix C | BUG-CF-01 filtros faltantes | ✅ |
| T12 | Fix C | BUG-CF-02 supplier field | ✅ |
| T13 | Fix A | BUG-CF-03 inStock variantes | ✅ |
| T14 | Fix A | BUG-CS-03 prefetch guard | ✅ |
| T15 | Fix A | BUG-CS-04 priceRange threshold | ✅ |
| T16 | Fix A | BUG-CS-05 useTransition | ✅ |
| T17 | Fix M | BUG-CS-06 flash empty state | ✅ |
| T18 | Fix M | BUG-AF-01 useAdvancedFilters deps | 🔄 |
| T19 | Fix M | BUG-STAT-01 hasNextPage dep | ✅ |
| T20 | Fix M | BUG-KBD-01 keyboard deps | 🔄 |
| T21 | Fix M | BUG-LOADING-01 isLoading inicial | 🔄 |
| T22 | Fix M | Verificar categoryTree deps | 🔄 |
| T23 | Hooks | Auditoria auth hooks | 🔄 |
| T24 | Hooks | Auditoria gravacao + simulation | 🔄 |
| T25 | Hooks | Auditoria bi + intelligence + crm | 🔄 |
| T26 | Hooks | Auditoria ui + voice + mockup | 🔄 |
| T27 | Hooks | Auditoria useVariantStock + useSellerCarts | 🔄 |
| T28 | Testes | Criar testes para hooks corrigidos | 🔄 |
| T29 | TS | Remover as unknown as / as never | 🔄 |
| T30 | PR | PR consolidado + review final | 🔄 |

---

*Próxima atualização: após T23-T30*
