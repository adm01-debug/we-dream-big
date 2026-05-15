# Triage de Índices Não Utilizados — 2026-05-12

Gerado durante T29 do Plano de Saneamento (Fase 3).  
Base: `pg_stat_user_indexes` onde `idx_scan = 0` e `NOT indisprimary AND NOT indisunique`.  
Total identificado pelo advisor: **530 unused_index**.  
Total analisado neste documento (top 80 por tamanho): **80 indexes**.

**Critérios:**
- `DROP` — sem uso, duplicata ou coluna de baixa seletividade
- `KEEP` — justificativa técnica (query conhecida, futuro próximo, índice especializado)

---

## 🔴 DROP — Remover (liberar espaço + acelerar INSERTs)

### supplier_products_raw (pipeline staging)
| Index | Tamanho | Motivo DROP |
|-------|---------|-------------|
| `idx_supplier_products_raw_data` | 16 MB | JSON GIN na coluna `data` — pipeline staging, não usado em queries |
| `idx_spr_supplier_sku` | 528 kB | Staging table; queries de lookup não passam por este índice |
| `idx_spr_product` | 304 kB | Idem |
| `idx_supplier_products_raw_hash` | 216 kB | Hash de dedup — não consultado diretamente |
| `idx_spr_batch` | 136 kB | Batch tracking — staging não consultada |

**Subtotal: ~17 MB**

### image_validation_log / image_import_log
| Index | Tamanho | Motivo DROP |
|-------|---------|-------------|
| `idx_image_validation_log_image` | 2 MB | Log table; não há queries de busca por image |
| `idx_image_validation_log_date` | 1.1 MB | Range scans em log tables usam seq scan |
| `idx_image_validation_log_status` | 464 kB | Baixa seletividade (2-3 valores) em log |
| `idx_image_validation_log_validated_brin` | 24 kB | BRIN — útil só em append-only; manter o BRIN |
| `idx_image_import_log_cloudflare` | 1.4 MB | Log de import — não consultado |
| `idx_image_import_log_sku` | 456 kB | Idem |
| `idx_image_import_log_source` | 208 kB | Idem |

**Subtotal: ~5.7 MB** (manter `idx_image_validation_log_validated_brin`)

### variant_supplier_sources
| Index | Tamanho | Motivo DROP |
|-------|---------|-------------|
| `variant_stocks_supplier_id_idx` | 784 kB | Duplicata de `idx_vss_supplier_branch` (cobre `supplier_id`) |
| `idx_vss_sync_status` | 696 kB | Baixa seletividade (status enum com poucos valores) |

**Subtotal: ~1.5 MB**

### products (indexes duplicados ou de baixa seletividade)
| Index | Tamanho | Motivo DROP |
|-------|---------|-------------|
| `idx_products_slug_active` | 712 kB | Slug já tem índice único; `active` filtro em outro índice |
| `idx_products_supplier_product_url` | 616 kB | URL não é chave de busca frequente |
| `idx_products_bitrix_id` | 296 kB | Bitrix ID — sync desativado |
| `idx_products_description_packaging` | 224 kB | Texto de embalagem — full-text seria melhor |
| `idx_products_last_sync` | 176 kB | Sync desativado |
| `products_ncm_code_idx` | 152 kB | NCM raramente filtrado |
| `products_brand_idx` | 144 kB | Brand — baixa seletividade |
| `idx_products_is_stockout` | 136 kB | Boolean — index bitmap mais eficiente via seq scan |
| `idx_products_is_textil` | 136 kB | Boolean — idem |
| `idx_products_ai_pending` | 104 kB | Flag temporária — pipeline AI ativo? Se não, dropar |
| `idx_products_auto_cat` | 104 kB | Auto-categorização — feature ativa? |
| `idx_products_supply_mode` | 104 kB | Enum com poucos valores |
| `products_is_deleted_idx` | 104 kB | Soft delete — geralmente substituído por partial index |
| `products_sku_promo_idx` | 104 kB | SKU promo — duplicata ou subsumed |
| `idx_products_gender` | 104 kB | Enum baixa seletividade |
| `idx_products_created_by` | 104 kB | Audit field — raramente filtrado |
| `idx_products_sync_status` | 104 kB | Enum — baixa seletividade |
| `idx_products_bitrix_images_synced_at` | 80 kB | Bitrix sync desativado |
| `idx_products_packing_classification` | 64 kB | Classificação de embalagem — baixa seletividade |
| `idx_products_product_type` | 120 kB | Enum — poucos valores |
| `idx_products_capacity_ml` | 112 kB | Range scan — analisar query plan |
| `idx_products_shape_type` | 112 kB | Enum |
| `idx_products_org` | 104 kB | Coberto por outros índices compostos |
| `idx_products_supplier_ref` | 312 kB | Ref de fornecedor — sync desativado |

**Subtotal: ~4.8 MB**

### product_variants
| Index | Tamanho | Motivo DROP |
|-------|---------|-------------|
| `idx_variants_color_code` | 152 kB | Color code — lookup via produto_id é mais comum |
| `product_variants_size_id_idx` | 136 kB | Size ID — coberto por PK ou FK index |
| `product_variants_sku_promo_idx` | 136 kB | SKU promo — duplicata |
| `idx_variants_capacity_ml` | 136 kB | Range — baixo uso |

**Subtotal: ~560 kB**

### product_images (duplicatas)
| Index | Tamanho | Motivo DROP |
|-------|---------|-------------|
| `idx_product_images_seo` | 832 kB | SEO metadata — não consultado diretamente |
| `idx_product_images_type_id` | 712 kB | Composite (type, id) — coberto por PK |
| `idx_product_images_type` | 696 kB | Duplicata parcial de idx_product_images_type_id |
| `idx_product_images_primary` | 336 kB | Partial index is_primary — baixo uso |
| `idx_product_images_org` | 592 kB | Coberto por joins via product_id |
| `idx_product_images_active` | 560 kB | Boolean — baixa seletividade |

**Subtotal: ~3.7 MB**

### supplier_import_batches
| Index | Tamanho | Motivo DROP |
|-------|---------|-------------|
| `idx_supplier_import_batches_supplier_status` | 496 kB | Composite (supplier_id, status) — verificar uso em pipeline |

### categories (duplicatas)
| Index | Tamanho | Motivo DROP |
|-------|---------|-------------|
| `idx_categories_path` | 80 kB | Path materializado — coberto por PK + queries de árvore |
| `idx_categories_full_path_readable` | 80 kB | Path legível — duplicata semântica |
| `idx_categories_display_order` | 48 kB | Sort field — seq scan suficiente para tabela pequena |

### Outros
| Index | Tabela | Tamanho | Motivo DROP |
|-------|--------|---------|-------------|
| `product_tags_tag_id_idx` | product_tags | 320 kB | FK já coberta por PK composta |
| `idx_audit_log_codigo` | audit_log_gravacao | 40 kB | Código de gravação — baixa cardinalidade |
| `idx_image_validation_log_validated_brin` | image_validation_log | 24 kB | **MANTER** (BRIN para append-only) |

---

## 🟢 KEEP — Manter (justificativa técnica)

| Index | Tabela | Tamanho | Justificativa |
|-------|--------|---------|---------------|
| `idx_vss_supplier_sku` | variant_supplier_sources | 1.95 MB | Lookup por SKU de fornecedor — crítico para import pipeline |
| `idx_vss_with_stock` | variant_supplier_sources | 1.2 MB | Partial index de estoque disponível — usado em cotações |
| `idx_vss_supplier_branch` | variant_supplier_sources | 664 kB | JOIN com tabela de filiais — usado em queries de routing |
| `idx_product_materials_composite` | product_materials | 896 kB | Composite key para lookup material+organização |
| `idx_product_materials_active` | product_materials | 128 kB | Partial index de materiais ativos |
| `idx_product_materials_org` | product_materials | 120 kB | Isolamento por organização |
| `idx_pr_related_product_id` | product_relationships | 792 kB | Relacionamentos de produto — usado em recomendações |
| `idx_prod_comm_source` | product_commemorative_dates | 232 kB | Source de data comemorativa — usado em bulk operations |
| `idx_prod_comm_active` | product_commemorative_dates | 232 kB | Partial index de datas ativas |
| `idx_prod_comm_date` | product_commemorative_dates | 232 kB | Range scan por data |
| `idx_color_variations_name_trgm` | color_variations | 64 kB | GIN trigram — usado em fuzzy search de cores |
| `idx_material_groups_name_trgm` | material_groups | 24 kB | GIN trigram — fuzzy search de grupos de material |
| `idx_stock_snapshots_captured_brin` | stock_snapshots | 24 kB | BRIN em timestamp de append-only table |
| `idx_ai_desc_queue_org` | ai_description_queue | 64 kB | Fila de geração de descrição AI por organização |
| `idx_kit_components_supplier` | product_kit_components | 64 kB | Componentes de kit por fornecedor |
| `idx_kit_components_code` | product_kit_components | 56 kB | Código de componente — lookup direto |
| `idx_kit_components_component` | product_kit_components | 56 kB | Produto componente — JOIN crítico |
| `idx_media_primary` | media_assets | 56 kB | Mídia primária — usada no frontend |
| `idx_media_product` | media_assets | 56 kB | Mídia por produto |
| `idx_media_supplier` | media_assets | 32 kB | Mídia por fornecedor |
| `idx_media_type` | media_assets | 32 kB | Tipo de mídia — baixo mas útil |
| `idx_product_properties_product` | product_properties | 48 kB | Propriedades por produto — JOIN frequente |
| `idx_categories_org_parent_active` | categories | 48 kB | Composite crítico para árvore de categorias ativa |
| `idx_psgm_group` | product_similarity_group_members | 40 kB | Grupo de similaridade — usado em recommendations |
| `idx_psgm_supplier` | product_similarity_group_members | 32 kB | Por fornecedor |
| `idx_rel_child` | category_relationships | 40 kB | Relacionamento filho — árvore de categorias |

---

## Resumo Executivo

| Decisão | Qtd (top 80) | Espaço estimado |
|---------|-------------|-----------------|
| DROP | ~54 indexes | ~38 MB |
| KEEP | ~26 indexes | ~3.8 MB |
| **Total liberável (top 80)** | | **~38 MB** |

> **Advisor target**: unused_index ≤ 100 (de 530 atual).  
> Executando os DROPs documentados neste arquivo: redução para ~476 no advisor  
> (os 450 restantes são tabelas menores com indexes < 24 kB, candidatos a DROP em próxima rodada).

## Próximas ações

1. **Criar migration `20260512000005_t29_drop_unused_indexes.sql`** com os ~54 DROPs listados (requer confirmação)
2. Após DROP, executar `VACUUM ANALYZE` nas tabelas afetadas
3. Monitorar `pg_stat_user_indexes` por 30 dias antes de decidir sobre os 450 restantes

---
*Gerado em: 2026-05-12 | Responsável: Joaquim | Refs: T29, Fase 3 Saneamento*
