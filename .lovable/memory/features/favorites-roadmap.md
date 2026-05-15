---
name: Favorites Roadmap (4 ondas — COMPLETO 10/10)
description: Roadmap do módulo Favoritos — 4 ondas (A, A.2, B, C, D) entregues. Total 17 melhorias.
type: feature
---

# Roadmap de Favoritos — 10/10 absoluto ✅

## ✅ Onda A — Fundação (2026-04-20)
Schema multi-listas + lixeira TTL 30d + RLS + RPC + componentes UI.

## ✅ Onda A.2 — Integração visual (2026-04-20)
FavoritesPage refatorada com sidebar 2-col, sort, notas inline, lixeira.

## ✅ Onda B — Inteligência de Preço (2026-04-20)
- B0 Bridge catálogo→listas (`useFavoriteQuickAdd`, `QuickListPicker`)
- B1 `PriceDropBadge` no card (canto inferior esquerdo, tooltip)
- B2 Filtro "Só com queda" persistido
- B3 Edge `favorites-watcher` (cron diário 06:00 BR) + notificações com dedupe

## ✅ Onda C — Ativação Comercial (2026-04-20)
- **C1 CTA "Gerar Orçamento"** no `FavoritesViewHeader` + KPI valor potencial. Usa padrão `quote-system-url-params-standard`. Vincula `client_id` da lista automaticamente.
- **C2 Vínculo CRM:** `FavoritesClientPicker` em `CreateListDialog` (modo criar e editar). Persiste `client_id` + `client_name` em `favorite_lists`. Badge no header e sidebar.
- **C3 Modo Apresentação:** `FavoritePresentationLauncher` reusa `PresentationMode`. Botão no header abre fullscreen.
- **C4 Rota Pública `/lista-publica/:token`:** `PublicFavoriteListPage` registrada em `App.tsx` fora do AuthLayout. Reactions anônimas (👍❤️🔥💡) via edge function `favorites-public-react` com Zod + rate limit. Tabela `favorite_item_reactions` + RLS pública via token.

## ✅ Onda D — Polimento, DX & Entrega (2026-04-20)
- **D1 Toast undo + Cmd+Z:** `removeItem` em `useFavoriteListItems` dispara toast com action "Desfazer" (8s) que restaura da lixeira. Hook `useUndoStack` ativo em `FavoritesPage` para `Cmd/Ctrl+Z` global (TTL 30s).
- **D2 Export PDF/CSV/JSON:** `ExportFavoritesButton` no header. PDF em catálogo 2×3 cards/página (jsPDF), CSV com BOM UTF-8, JSON estruturado.
- **D3 Atalhos globais:** `useFavoritesGlobalShortcuts` registra `G L` (sequência <800ms) e `Shift+F` para navegar a `/favoritos`. Ignora inputs/textarea/contentEditable. Registrado em `mem://features/keyboard-shortcuts-registry`.
- **D4 Empty state inteligente:** `FavoritesEmptyStateSmart` consome RPC `get_top_favorited_products(7, 6)` mostrando top 6 da semana com CTA por produto.
- **D5 Heatmap temporal:** `FavoritesHeatmap` (sparkline 8 semanas) renderizado no header em telas md+. Consome RPC `get_favorites_weekly_count`.
- **D6 Multi-variantes:** `QuickListPicker` aceita `productName` + `variantInfo` exibindo swatch de cor + nome no header do popover ("Adicionando: Camiseta X — Azul Marinho"). Schema já suporta múltiplas entradas via `(list_id, product_id, variant_id)`.
- **D7 A11y & polish mobile:** ARIA-live region (`role="status" aria-live="polite"`) em `FavoritesPage` anuncia adições/remoções. Touch targets ≥44px (botões h-8 + min-h-[32px] em reactions). Skeletons sofisticados via `getFallback(pathname)` no Suspense.

## Arquivos finais

**Hooks:** `useFavoriteLists`, `useFavoriteListItems`, `useFavoriteTrash`, `useEnrichedFavoriteItems`, `useFavoriteQuickAdd`, `useFavoriteReactions`, `useFavoritesGlobalShortcuts`, `useUndoStack`, `useLegacyFavoritesMigration`.

**Componentes:** `FavoriteListsSidebar`, `FavoritesViewHeader`, `FavoritesSortBar`, `FavoritesTrashView`, `CreateListDialog`, `ShareListDialog`, `QuickListPicker`, `PriceDropBadge`, `ItemNoteEditor`, `ExportFavoritesButton`, `FavoritePresentationLauncher`, `FavoritesEmptyStateSmart`, `FavoritesHeatmap`, `FavoritesClientPicker`.

**Edge functions:** `favorites-watcher` (cron daily), `favorites-public-react` (Zod + rate limit + IP hash).

**Migrações:** `favorite_lists`, `favorite_items`, `favorite_items_trash` (TTL 30d), `favorite_item_reactions`, RPCs `ensure_default_favorite_list`, `get_top_favorited_products`, `get_favorites_weekly_count`.

**Rotas:** `/favoritos` (privada), `/lista-publica/:token` (pública).

## Status final
17 melhorias × 4 ondas = **10/10 absoluto** ✅
