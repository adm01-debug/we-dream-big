---
name: Kit Library System
description: Arquitetura dos 2 bancos do Kit Maker (Meus Kits + Sugeridos), identidade visual, RLS e fluxo de clonagem
type: feature
---

# Kit Library — Banco duplo (Meus Kits + Sugeridos)

## Tabelas

- **`custom_kits`** — kits do vendedor. RLS: usuário só vê os próprios; admin vê todos. Campos de identidade: `color`, `icon` (lucide), `tag`, `description`, `is_favorite`.
- **`kit_templates`** — banco curado pelo sistema. RLS: leitura para qualquer autenticado quando `is_active=true`; CRUD apenas admin (`has_role(uid, 'admin')`). Campos: `category`, `cover_image_url`, `usage_count` (incrementado via RPC `increment_kit_template_usage`).

## Frontend

- **Página unificada**: `/meus-kits` → `KitLibraryPage.tsx` com 3 abas (Meus / Sugeridos / Favoritos), busca, filtros visuais (chips por tag e cor) e ordenação (recentes, valor, nome, popularidade).
- **Identidade visual**: editada via `KitIdentityPicker` no header do Kit Builder; reflete-se como stripe colorida + ícone no próprio header.
- **Persistência**: `useCustomKitPersistence` envia identidade no payload de save; `loadKit()` em `useKitBuilder` aceita `identity` e popula o estado ao reabrir.
- **Templates**: `useKitTemplates` lista (ordenado por `usage_count`) e clona para `custom_kits`; `KitTemplatePreviewDialog` mostra caixa+itens+preço antes da clonagem; badge "Popular" em `usage_count >= 5`.
- **Admin**: `/admin/kit-templates` (`KitTemplatesAdminPage`) faz CRUD via `useAdminKitTemplates` (somente admins). Para popular box/items reais, o fluxo recomendado é: criar template → clonar como kit próprio → preencher na UI normal → admin pode atualizar template depois.

## Skeletons & UX

- `KitCardSkeleton` / `KitCardSkeletonGrid` no padrão `loading-and-skeleton-standard` (sem stagger artificial).
- Empty states ilustrados com CTA secundário levando à aba de templates.
- Animação `animate-fade-in` no container; sem stagger por item para evitar jank em listas grandes.

## Pontos de atenção

- O Kit Library reusa a key `['custom-kits']` que `useCustomKitPersistence` invalida — qualquer mudança de payload deve manter compatibilidade.
- `getItemsCount` soma `quantity` mas tolera items sem `quantity` (defaulta a 1) para suportar templates antigos.
- `KitTemplateRow.items_data` é `Record<string, unknown>[]` — o preview não renderiza imagens, apenas nome/sku/qtd/preço.

## Fluxo completo (Onda Pós-10/10)

- **Atalho global `G K`**: abre `/meus-kits` de qualquer lugar (chord vim-style, 800ms window). Documentado em `keyboard-shortcuts-registry`.
- **Spotlight (Ctrl+K)**: entradas estáticas "Biblioteca de Kits" e "Montar novo kit" em Navegação.
- **Identidade no PDF**: `kitPdfGenerator.drawHeader` pinta uma stripe de 2mm com `identity.color` e renderiza `identity.tag` como pill no canto superior direito.
- **Identidade no orçamento**: `useKitBuilderQuote` injeta `[tag] kitName` em `notes` e dump `cor=… | ícone=… | tag=…` em `internal_notes`.
- **Admin: snapshot do kit como template**: botão "Salvar como template" no `KitBuilderHeader` (visível só para `useRBAC().isAdmin`) chama `useTemplateSnapshot.saveAsTemplate({ kitState })`. Em modo template (`?template=ID`), o botão vira "Atualizar template" e o `handleSaveKit` salva de volta em `kit_templates`.
- **Modo template**: `KitBuilderPage` aceita `?template=ID`, mostra badge "Editando template do sistema" no header, carrega `kit_templates` row e redireciona o save padrão para `useTemplateSnapshot`.
- **`bumpLastUsed`**: `KitBuilderPage` chama `bumpLastUsed(kitId)` ao abrir um kit existente — alimenta a ordenação "Usados recentemente" em `KitLibraryPage`.
- **Realtime cross-tab**: `useCustomKitsRealtime` subscreve `user:<uid>:custom-kits` e invalida a query `['custom-kits']` em qualquer INSERT/UPDATE/DELETE. Polling de 30s permanece como fallback.

## Onda Inteligência & Colaboração

- **Sugestão IA de identidade**: edge `kit-identity-suggest` (Gemini Flash Lite + tool-call) devolve `{tag, color, icon, rationale}` a partir de `name+items`; UI via `IdentitySuggestionButton` no sidebar do Builder, exibido só quando identity está vazia.
- **Kits semelhantes**: `useSimilarKits` busca em `kit_templates` (top 50 por `usage_count`) e ranqueia por overlap de SKU ≥30%. Widget `SimilarKitsWidget` mostra top 3 com link `?template=ID`.
- **Detector de duplicatas**: `useDuplicateKitDetector` aplica Jaccard nos SKUs vs últimos 50 kits do usuário; threshold 0.8. `handleSaveKit` só dispara em kit novo (sem `currentKitId`/`autoSavedKitId`) e ≥2 itens, abrindo toast com ação "Abrir existente".
- **Métricas admin**: `/admin/kit-templates/metricas` (`KitTemplatesMetricsPage`) mostra KPIs (templates ativos, clonagens totais, populares ≥5), tabela ranqueada por `usage_count` e heatmap dos top 20 SKUs presentes em `custom_kits`.
- **Compartilhamento público**: `kit_share_tokens` + `useKitShare` + `KitShareLinkDialog` (no header do Builder, ao lado do `KitIdentityPicker`) + rota `/kit/:token` (`PublicKitViewPage`) com edge `kit-public-view` (Zod + bot protection 30 req/min, masking de custos via service role). Token expira em 30 dias e pode ser revogado.
- **Colaboração interna**: `kit_collaborators` + `kit_comments` (Realtime) já em produção via `KitCollaborationPanel` no sidebar do Builder.
- **Hardening edges IA**: `kit-identity-suggest` agora usa Zod + `runBotProtection` (10 req/min, block 1h) — mesma pipeline de `kit-public-view`.

## Onda Cliente-Facing & Operacional

- **Página pública premium**: `PublicKitViewPage` consome edge `kit-public-view`, gera **OG image dinâmica** via `src/lib/kit-og-image.ts` (canvas 1200x630 com cor da identidade + nome do kit), título SEO `Kit {nome} – {organização}`, hero com logo da organização, lista limpa de items e CTA WhatsApp/email no card do vendedor.
- **Aba "Links" no `KitShareLinkDialog`**: usa `useKitShareTokens(kitId)` para listar tokens com status (Ativo/Revogado/Expirado), badge "Visualizado" quando `viewed_at` existe, e botão de revogação inline.
- **Badge "Visto" no `KitCard`**: `useKitShareSummary()` agrega tokens do usuário em `Record<kitId, { generated, viewed, lastViewedAt }>`; `KitLibraryPage.toCard` injeta `viewedByClient` + `lastViewedAt` (tooltip mostra timestamp).
- **Conversão admin**: `KitTemplatesMetricsPage` ganhou bloco "Conversão de compartilhamentos" com gerados/visualizados/taxa global + recorte últimos 30 dias.
- **Hooks novos em `useKitShare.ts`**: `useKitShareTokens(kitId)` e `useKitShareSummary()` — invalidação automática a cada generate/revoke via `kit-share-tokens` e `kit-share-summary`.
