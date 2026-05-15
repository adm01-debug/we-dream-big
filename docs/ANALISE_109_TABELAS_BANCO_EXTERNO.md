# 📊 Análise Exaustiva das 109 Tabelas do Banco de Dados Externo

> **Objetivo**: Facilitar o dia a dia do vendedor com acesso máximo a filtros por tiragem, estoque, produto, cor, categoria, materiais, técnicas de gravação, etc.

---

## 🏗️ Arquitetura do Banco de Dados

O banco externo possui **109 objetos** distribuídos em:

| Tipo | Quantidade | Descrição |
|------|------------|-----------|
| **Tabelas Base** | ~65 | Armazenam dados reais |
| **Views (v_)** | ~25 | Consultas pré-definidas para relatórios |
| **Materialized Views (mv_)** | ~3 | Dados agregados com cache para performance |

---

## 📁 CATEGORIA 1: PRODUTOS E CATÁLOGO

### 1.1 Tabela Principal de Produtos
| Tabela | Propósito | Campos-Chave para Filtros |
|--------|-----------|---------------------------|
| `products` | Catálogo completo de produtos | `name`, `sku`, `price`, `is_active`, `is_kit`, `featured` |

### 1.2 Imagens e Mídia
| Tabela | Propósito | Uso no Frontend |
|--------|-----------|-----------------|
| `product_images` | Fotos do produto (principal, galeria, mockup) | Galeria de imagens, zoom, comparação |
| `product_videos` | Vídeos demonstrativos | Player de vídeo na página do produto |

### 1.3 Variantes e SKUs
| Tabela | Propósito | Filtros Habilitados |
|--------|-----------|---------------------|
| `product_variants` | Variações (cor, tamanho) | Filtro por cor, tamanho, disponibilidade |
| `variant_stocks` | Estoque por variante | Filtro por estoque disponível |
| `variant_cost_tiers` | Preços por faixa de quantidade | Cálculo de desconto por volume |
| `variant_sale_prices` | Preços promocionais | Filtro de promoções |
| `variation_types` | Tipos de variação (cor, tamanho) | Configuração dinâmica de filtros |
| `variation_values` | Valores possíveis (P, M, G, Azul, Vermelho) | Opções de seleção |

### 1.4 Categorias Hierárquicas
| Tabela/View | Propósito | Filtros Habilitados |
|-------------|-----------|---------------------|
| `categories` | Categorias de produtos | Filtro por categoria |
| `category_attributes` | Atributos específicos por categoria | Filtros dinâmicos por categoria |
| `category_relationships` | Hierarquia pai-filho | Menu de navegação em árvore |
| `categories_tree_visual` ⭐ | **222 registros** - Árvore visual completa | Menu lateral com níveis visuais |
| `product_categories` | Relação N:N produto-categoria | Multi-categoria |
| `product_category_assignments` | Atribuições com prioridade | Categoria principal vs secundária |

### 1.5 Cores
| Tabela | Propósito | Filtros Habilitados |
|--------|-----------|---------------------|
| `color_groups` | Grupos de cores (Neutros, Vibrantes) | Filtro por família de cor |
| `color_nuances` | Nuances (Azul Claro, Azul Marinho) | Seletor de cor específica |
| `color_equivalences` | Equivalência entre fornecedores | Busca cross-supplier |
| `color_variations` | Variações de cor por produto | Disponibilidade por cor |
| `supplier_colors` | Cores disponíveis por fornecedor | Filtro por fornecedor + cor |

### 1.6 Materiais
| Tabela/View | Propósito | Filtros Habilitados |
|-------------|-----------|---------------------|
| `product_materials` | Materiais do produto | Filtro por material |
| `material_equivalences` | Equivalência entre materiais | Busca por materiais similares |
| `mv_product_compositions` ⭐ | **6 registros** - Composição detalhada | Percentual de cada material |
| `mv_material_group_stats` ⭐ | **9 registros** - Estatísticas por grupo | Dashboard de materiais |

### 1.7 Atributos e Tags
| Tabela | Propósito | Filtros Habilitados |
|--------|-----------|---------------------|
| `product_attributes` | Atributos dinâmicos (peso, dimensão) | Filtros customizados |
| `tags` | Tags para busca | Filtro por tag |
| `product_tags` | Relação produto-tag | Busca por múltiplas tags |

### 1.8 Fornecedores
| Tabela | Propósito | Filtros Habilitados |
|--------|-----------|---------------------|
| `suppliers` | Cadastro de fornecedores | Filtro por fornecedor |
| `product_suppliers` | Relação produto-fornecedor | Comparação de preços |

### 1.9 Relacionamentos entre Produtos
| Tabela | Propósito | Uso no Frontend |
|--------|-----------|-----------------|
| `product_relationships` | Relacionados, complementares, upsell | Seção "Veja também" |
| `product_kit_components` | Composição de kits | Detalhes de kits |
| `product_comparisons` | Comparações salvas | Página de comparação |

---

## 📁 CATEGORIA 2: PERSONALIZAÇÃO E GRAVAÇÃO

### 2.1 Técnicas de Personalização
| Tabela/View | Propósito | Dados Importantes |
|-------------|-----------|-------------------|
| `personalization_techniques` | Catálogo de técnicas | Nome, código, descrição |
| `customization_price_tables` ⭐ | **9 registros** - Preços por técnica | Preços por faixa de quantidade (1-10.000 un) |
| `v_customization_price_summary` ⭐ | **9 registros** - Resumo de preços | Cálculo rápido |
| `v_technique_stats` | Estatísticas de uso | Dashboard de técnicas |
| `v_techniques_stricker_mapping` | Mapeamento com Stricker | Integração |

**Técnicas Identificadas (customization_price_tables):**
1. **Hot Stamping 8.5x5.5cm** (HTS1-01) - 1 cor, área fixa
2. **UV Digital Full Color** (UV-01) - 4 cores, área flexível
3. **Laser** - Alta precisão
4. **Bordado** - Premium, preço por ponto
5. **Serigrafia** - Alto volume
6. **Transfer** - Flexível
7. **Sublimação** - Full color têxtil
8. **Tampografia** - Superfícies curvas
9. **Gravação a Laser em Metal** - Premium

### 2.2 Áreas de Impressão
| Tabela/View | Propósito | Uso no Frontend |
|-------------|-----------|-----------------|
| `product_print_areas` | Áreas disponíveis por produto | Seletor de posição de logo |
| `product_personalization_options` | Opções configuradas | Wizard de personalização |
| `v_product_print_areas_complete` | View completa com técnicas | Dados para mockup |
| `product_technique_pricing_tiers` | Preços por técnica e produto | Calculadora de preços |

### 2.3 Mockups
| Tabela | Propósito | Uso no Frontend |
|--------|-----------|-----------------|
| `mockup_drafts` | Rascunhos salvos | Continuar depois |
| `mockup_generation_jobs` | Fila de geração | Status de processamento |
| `mockup_approval_links` | Links para aprovação do cliente | Fluxo de aprovação |
| `generated_mockups` | Mockups finalizados | Galeria de mockups |

---

## 📁 CATEGORIA 3: ESTOQUE E PREÇOS

### 3.1 Estoque
| Tabela/View | Propósito | Filtros Habilitados |
|-------------|-----------|---------------------|
| `variant_stocks` | Estoque atual por variante | Filtro "Em estoque" |
| `stock_movements` | Histórico de movimentações | Relatórios |
| `v_products_with_stock` | Produtos com estoque | Lista filtrada |

### 3.2 Preços
| Tabela | Propósito | Uso no Frontend |
|--------|-----------|-----------------|
| `price_lists` | Tabelas de preços | Preços por canal/cliente |
| `price_change_history` | Histórico de alterações | Auditoria |
| `product_price_history` | Preços históricos | Gráficos de tendência |
| `v_products_min_price` | Menor preço por produto | Ordenação |
| `v_variant_pricing_complete` | Preços completos | Detalhamento |

---

## 📁 CATEGORIA 4: COLEÇÕES E ORGANIZAÇÃO

| Tabela | Propósito | Uso no Frontend |
|--------|-----------|-----------------|
| `collections` | Coleções temáticas (Natal, Verão) | Navegação por coleção |
| `collection_products` | Produtos por coleção | Listagem filtrada |

---

## 📁 CATEGORIA 5: CLIENTES E EMPRESAS (Somente Leitura)

| Tabela | Propósito | Dados Importantes |
|--------|-----------|-------------------|
| `bitrix_clients` | Clientes do CRM | Nome, contato, histórico |
| `client_contacts` | Contatos por empresa | Telefones, emails |
| `client_notes` | Notas de atendimento | Histórico |
| `organizations` | Organizações multi-tenant | Dados corporativos |
| `user_organizations` | Usuários por organização | Permissões |
| `business_sectors` | Setores de atuação | Segmentação |

---

## 📁 CATEGORIA 6: VIEWS DE MONITORAMENTO

### 6.1 Qualidade de Dados
| View | Propósito | Uso |
|------|-----------|-----|
| `v_products_without_images` | Produtos sem foto | Gestão de catálogo |
| `v_products_without_videos` | Produtos sem vídeo | Melhoria de conteúdo |
| `v_products_missing_primary_image` | Sem imagem principal | Priorização |

### 6.2 Sincronização e Mídia
| View | Propósito | Uso |
|------|-----------|-----|
| `v_media_stats` ⭐ | **2 registros** - Estatísticas de mídia | Dashboard |
| `v_n8n_sync_summary` ⭐ | **8 registros** - Status de sincronização | Monitoramento |
| `v_n8n_sync_errors` | Erros de sync | Debug |
| `v_n8n_sync_success_recent` | Syncs recentes bem-sucedidos | Auditoria |
| `v_product_images_cdn` | URLs de CDN | Otimização |
| `v_product_videos_cdn` | URLs de vídeo | Player |

### 6.3 Kits
| View | Propósito | Uso |
|------|-----------|-----|
| `v_kit_with_components` | Kits com componentes | Detalhamento |
| `v_kit_component_print_areas` | Áreas de impressão de kits | Mockup de kit |

---

## 📁 CATEGORIA 7: SISTEMA E USUÁRIOS (Não Acessíveis)

Estas tabelas são gerenciadas internamente e não devem ser acessadas pelo frontend:

| Tabela | Motivo |
|--------|--------|
| `user_roles`, `user_onboarding`, `profiles` | Autenticação local |
| `user_favorites`, `user_rewards` | Dados do usuário |
| `notifications`, `push_subscriptions` | Sistema de notificações |
| `analytics_events`, `audit_log` | Logs e auditoria |
| `quotes`, `orders` | Gerenciamento local |
| `achievements`, `seller_gamification` | Gamificação local |

---

## 🎯 SUGESTÕES DE MELHORIAS NO FRONTEND

### 1. **Filtros Avançados para o Vendedor**

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 FILTROS INTELIGENTES                                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 📦 TIRAGEM (Quantidade)           ├──────────────────────────┤ │
│   ○ 1-10 unidades                │ Preço unitário: R$ 56,00  │ │
│   ○ 11-50 unidades               │ Preço unitário: R$ 22,38  │ │
│   ○ 51-100 unidades              │ Preço unitário: R$ 5,09   │ │
│   ● 101-500 unidades             │ Preço unitário: R$ 2,70   │ │
│   ○ 501-1000 unidades            │ Preço unitário: R$ 2,21   │ │
│   ○ 1001+ unidades               │ Preço unitário: R$ 1,55   │ │
│                                                                 │
│ 📊 ESTOQUE                                                      │
│   □ Pronta entrega (em estoque)                                │
│   □ Produção sob demanda                                        │
│   □ Estoque futuro (previsão)                                  │
│                                                                 │
│ 🎨 CORES                                                        │
│   [Neutros ▾] [Vibrantes ▾] [Pastéis ▾]                        │
│   ■ Preto  ■ Branco  □ Azul  □ Vermelho  □ Verde  +12          │
│                                                                 │
│ 📂 CATEGORIAS                                                   │
│   > Escrita (45)                                                │
│     > Canetas (32)                                              │
│       > Canetas Metálicas (8)                                   │
│       > Canetas Plásticas (24)                                  │
│   > Bolsas (28)                                                 │
│   > Escritório (56)                                             │
│                                                                 │
│ 🧵 MATERIAIS                                                    │
│   □ Metal      □ Plástico    □ Couro                           │
│   □ Tecido     □ Madeira     □ Vidro                           │
│                                                                 │
│ 🖨️ TÉCNICAS DE GRAVAÇÃO                                        │
│   □ Laser              (SLA: 3-5 dias)                         │
│   □ Hot Stamping       (SLA: 3-15 dias)                        │
│   □ UV Digital         (SLA: 2-5 dias)                         │
│   □ Bordado            (SLA: 5-10 dias)                        │
│   □ Serigrafia         (SLA: 3-7 dias)                         │
│                                                                 │
│ 💰 FAIXA DE PREÇO (produto)                                     │
│   R$ 5,00 ─────●──────────────── R$ 500,00                     │
│                                                                 │
│ 🏢 FORNECEDOR                                                   │
│   □ Stricker    □ Confecta    □ Promoline                      │
│                                                                 │
│ 🏷️ TAGS RÁPIDAS                                                │
│   [Sustentável] [Premium] [Econômico] [Novidade] [Promoção]    │
│                                                                 │
│                      [🔄 Limpar] [✅ Aplicar 15 filtros]        │
└─────────────────────────────────────────────────────────────────┘
```

### 2. **Calculadora de Preços por Tiragem**

```
┌─────────────────────────────────────────────────────────────────┐
│ 💰 SIMULADOR DE PREÇOS                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Produto: Caneta Metálica Premium                                │
│ Técnica: Hot Stamping 8.5x5.5cm                                │
│                                                                 │
│ QUANTIDADE    │ PRODUTO │ GRAVAÇÃO │   TOTAL   │ ECONOMIA      │
│ ─────────────────────────────────────────────────────────────── │
│      50 un    │ R$12,00 │  R$22,38 │  R$34,38  │    ---        │
│     100 un    │ R$11,50 │   R$4,25 │  R$15,75  │   -54%        │
│     250 un    │ R$11,00 │   R$3,20 │  R$14,20  │   -59%        │
│     500 un    │ R$10,50 │   R$2,70 │  R$13,20  │   -62%        │
│   1.000 un ●  │ R$10,00 │   R$2,21 │  R$12,21  │   -64%        │
│                                                                 │
│ PRAZO ESTIMADO: 12 dias úteis                                   │
│                                                                 │
│ [📧 Enviar simulação] [📄 Gerar orçamento] [🛒 Adicionar]       │
└─────────────────────────────────────────────────────────────────┘
```

### 3. **Dashboard de Disponibilidade**

```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 VISÃO GERAL DE ESTOQUE                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  2.456   │  │    892   │  │    234   │  │     45   │        │
│  │ Em Stock │  │ Baixo    │  │ Sob      │  │ Sem      │        │
│  │   ✓      │  │ Estoque  │  │ Demanda  │  │ Estoque  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                 │
│  PREVISÃO DE REPOSIÇÃO                                          │
│  ───────────────────────                                        │
│  • Canetas Metálicas: 15/01 (+500 un)                          │
│  • Mochilas Corporate: 20/01 (+200 un)                         │
│  • Squeezes Térmicas: 25/01 (+1000 un)                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4. **Navegação por Categorias em Árvore**

Com a view `categories_tree_visual` (222 categorias), implementar:

```
📂 Produtos
├── 📁 Escrita
│   ├── 📁 Canetas
│   │   ├── Canetas Metálicas (8)
│   │   ├── Canetas Plásticas (24)
│   │   └── Canetas Ecológicas (5)
│   ├── 📁 Lápis
│   └── 📁 Marcadores
├── 📁 Bolsas e Mochilas
│   ├── 📁 Mochilas
│   ├── 📁 Sacolas
│   └── 📁 Nécessaires
├── 📁 Escritório
│   ├── 📁 Organizadores
│   ├── 📁 Porta-Canetas
│   └── 📁 Calendários
└── 📁 Tecnologia
    ├── 📁 Carregadores
    ├── 📁 Fones
    └── 📁 Power Banks
```

### 5. **Filtro por Técnica de Gravação com SLA**

```
┌─────────────────────────────────────────────────────────────────┐
│ 🖨️ TÉCNICAS DISPONÍVEIS PARA ESTE PRODUTO                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ● HOT STAMPING                                               │ │
│ │   Área: 8.5 x 5.5 cm │ Cores: 1 │ Prazo: 3-15 dias          │ │
│ │   ├── 50 un: R$22,38/un                                      │ │
│ │   ├── 100 un: R$4,25/un                                      │ │
│ │   └── 1000 un: R$2,21/un                                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ○ UV DIGITAL                                                 │ │
│ │   Área: 5 x 1 cm │ Cores: Full Color │ Prazo: 2-5 dias      │ │
│ │   ├── 50 un: R$5,52/un                                       │ │
│ │   ├── 100 un: R$0,79/un                                      │ │
│ │   └── 1000 un: R$0,55/un                                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ○ LASER                                                      │ │
│ │   Área: Variável │ Cores: 1 (gravação) │ Prazo: 1-3 dias    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🚀 IMPLEMENTAÇÕES PRIORITÁRIAS

### Fase 1 - Filtros Básicos (Semana 1-2)
1. ✅ Conectar ao banco externo via edge function
2. ⬜ Implementar filtro por categoria (usar `categories_tree_visual`)
3. ⬜ Implementar filtro por cor (usar `color_groups`)
4. ⬜ Implementar filtro por material (usar `product_materials`)
5. ⬜ Implementar filtro por estoque (usar `variant_stocks`)

### Fase 2 - Precificação por Tiragem (Semana 3-4)
1. ⬜ Integrar tabela `customization_price_tables`
2. ⬜ Criar calculadora de preços por quantidade
3. ⬜ Mostrar economia por volume
4. ⬜ Exibir SLA por técnica

### Fase 3 - Técnicas de Gravação (Semana 5-6)
1. ⬜ Listar técnicas disponíveis por produto
2. ⬜ Mostrar áreas de impressão
3. ⬜ Integrar com gerador de mockups
4. ⬜ Comparador de técnicas

### Fase 4 - Estoque e Previsões (Semana 7-8)
1. ⬜ Dashboard de estoque em tempo real
2. ⬜ Alertas de baixo estoque
3. ⬜ Previsão de reposição
4. ⬜ Filtro por estoque futuro

---

## 📋 RESUMO EXECUTIVO

| Métrica | Valor |
|---------|-------|
| Total de Tabelas | 109 |
| Tabelas com Dados | 7+ |
| Categorias (árvore) | 222 |
| Técnicas de Gravação | 9 |
| Materiais Mapeados | 9 grupos |
| Composições de Produto | 6 |

**Principais Benefícios para o Vendedor:**
1. 🎯 Filtro por tiragem com preço dinâmico
2. 📊 Visualização de estoque em tempo real
3. 🎨 Filtro multicor com famílias de cores
4. 🏷️ Navegação hierárquica por categoria
5. 🖨️ Seleção de técnica com SLA e preços
6. 💰 Calculadora de desconto por volume
7. 📦 Previsão de disponibilidade

---

*Documento gerado em: 2026-01-08*
*Versão: 1.0*
