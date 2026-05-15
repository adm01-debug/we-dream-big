---
name: Collections public share system
description: Rota pública /colecao-publica/:token + reactions anônimas + edge function com rate limit
type: feature
---

Sistema espelha favorites-public-share-system para o módulo Coleções.

**Rota:** `/colecao-publica/:token` (em `src/App.tsx`, fora do AuthLayout, lazy via `lazyWithRetry`).
**Página:** `src/pages/PublicCollectionPage.tsx` consulta `collections` por `share_token` válido (não expirado, `is_public=true`).

**Reações anônimas:** tabela `collection_item_reactions` (anon_id + ip_hash + emoji) com RLS que permite INSERT público apenas via edge function.

**Edge function:** `supabase/functions/collections-public-react/index.ts`
- Validação Zod do payload
- Rate limit 5 reactions/min por IP (hash SHA-256)
- Toggle: clicar mesmo emoji remove a reação

**Geração de token:** ao clicar em "Compartilhar publicamente" na coleção, hook gera `share_token = gen_random_uuid()` + `share_expires_at = now() + 30 days` + `is_public = true` e copia URL ao clipboard.
