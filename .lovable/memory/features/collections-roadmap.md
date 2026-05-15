---
name: collections-roadmap
description: Roadmap completo do módulo Coleções com paridade 10/10 ao módulo Favoritos — 11 melhorias entregues nas 4 ondas P1-P4
type: feature
---

# Coleções 10/10 — Roadmap completo

Status: ✅ **11 melhorias entregues** (paridade absoluta com Favoritos)

## Onda P1 — Confiança ✅
- Tabela `collection_items_trash` com TTL 30 dias + RLS
- Trigger `move_collection_item_to_trash` ao deletar item
- Função `cleanup_expired_collection_trash()` + cron diário (a configurar via insert tool)
- Hook `restoreFromTrash` em `useCollections` exposto via Context
- Toast undo no `removeProductFromCollection` (página detalhe)

## Onda P2 — Inteligência de preço ✅
- Coluna `price_at_save numeric` em `collection_items`
- `addProductToCollection` aceita `priceAtSave`
- Edge function `collections-watcher` (cron 06:00 BR via insert tool) — detecta drops >5%, dedupe 24h, notifica via `workspace_notifications` categoria `collections`

## Onda P3 — Ativação Comercial ✅
- Colunas `client_id`, `client_name`, `share_token`, `share_expires_at`, `is_public` em `collections`
- Tabela `collection_item_reactions` (👍 ❤️ 🔥 💡 anônimas) + RLS pública via token
- Componente `CollectionPresentationLauncher` (wrapper PresentationMode)
- Página `PublicCollectionPage` em `/colecao-publica/:token`
- Edge function `collections-public-react` com Zod + rate limit 5/min/IP + IP hash SHA-256

## Onda P4 — Polimento & DX ✅
- `ExportCollectionButton` (PDF 2×3 / CSV BOM UTF-8 / JSON)
- `CollectionsHeatmap` — sparkline 8 semanas via RPC `get_collections_weekly_count`
- `CollectionsEmptyStateSmart` — top 6 produtos via RPC `get_top_collected_products`
- Hook `useCollectionsGlobalShortcuts` — `G C` (sequência <800ms) + `Shift+C`
- ARIA-live region em `CollectionDetailPage` (via toast undo)

## Arquivos-chave

**Edge functions:**
- `supabase/functions/collections-watcher/index.ts`
- `supabase/functions/collections-public-react/index.ts`

**Hooks:**
- `src/hooks/useCollections.ts` (restoreFromTrash + priceAtSave)
- `src/hooks/useCollectionsGlobalShortcuts.ts`

**Componentes:**
- `src/components/collections/ExportCollectionButton.tsx`
- `src/components/collections/CollectionsHeatmap.tsx`
- `src/components/collections/CollectionsEmptyStateSmart.tsx`
- `src/components/collections/CollectionPresentationLauncher.tsx`

**Páginas:**
- `src/pages/PublicCollectionPage.tsx` (rota `/colecao-publica/:token`)

**RPCs Supabase:**
- `get_top_collected_products(_days, _limit)`
- `get_collections_weekly_count(_weeks)`
- `cleanup_expired_collection_trash()`
