/**
 * raw-row.types — Tipos canônicos "espelhados" para linhas brutas vindas
 * de `external-db-bridge` / RPCs de preço.
 *
 * Cada interface inclui **ambos** os nomes (PT legado e EN canônico novo)
 * como campos opcionais. Os adapters em `raw-row.adapter.ts` preenchem os
 * dois lados, então consumidores podem ler qualquer um durante a transição
 * de schema sem quebrar.
 */

export interface TecnicaGravacaoCanonical {
  id: string;

  // Identificação — PT legado + EN canônico
  /** @deprecated use `code` */
  codigo?: string | null;
  code?: string | null;
  /** @deprecated use `internal_code` */
  codigo_interno?: string | null;
  internal_code?: string | null;
  codigo_curto?: string | null;
  codigo_tabela?: string | null;

  // Nome / descrição
  nome?: string | null;
  name?: string | null;
  descricao?: string | null;
  description?: string | null;
  slug?: string | null;

  // Agrupamento
  grupo_tecnica?: string | null;
  group?: string | null;
  nome_grupo?: string | null;
  group_name?: string | null;
  slug_grupo?: string | null;
  ordem_grupo?: number | null;

  // Cores
  permite_cores?: boolean | null;
  allows_colors?: boolean | null;
  max_cores?: number | string | null;
  max_colors?: number | null;
  cobra_por_cor?: boolean | null;
  charges_per_color?: boolean | null;

  // Área / pontos
  cobra_por_area?: boolean | null;
  price_by_area?: boolean | null;
  cobra_por_pontos?: boolean | null;
  price_by_points?: boolean | null;
  area_maxima_cm2?: number | null;
  max_area_cm2?: number | null;
  area_maxima_texto?: string | null;

  // Setup
  requer_setup?: boolean | null;
  requires_setup?: boolean | null;
  tipo_setup?: string | null;
  setup_type?: string | null;
  custo_setup?: number | null;
  setup_price?: number | null;
  setup_cost?: number | null;
  custo_setup_por_cor?: boolean | null;
  setup_by_color?: boolean | null;

  // Manuseio
  custo_manuseio?: number | null;
  handling_price?: number | null;
  custo_manuseio_por_peca?: boolean | null;

  // Aplicação
  custo_aplicacao?: number | null;
  cobra_aplicacao?: boolean | null;

  // Prazo / quantidade
  tempo_producao_dias?: number | null;
  estimated_days?: number | null;
  production_days?: number | null;
  quantidade_corte?: number | null;
  min_quantity?: number | null;

  // Superfície
  is_curved?: boolean | null;
  aplica_superficie_curva?: boolean | null;
  applies_to_curved?: boolean | null;

  // Visibilidade / ordem
  ativo?: boolean | null;
  active?: boolean | null;
  ordem_exibicao?: number | null;
  display_order?: number | null;

  // Validade
  validade_inicio?: string | null;
  validade_fim?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;

  // Faturamento mínimo
  faturamento_minimo?: number | null;
  minimum_revenue?: number | null;

  created_at?: string | null;
  updated_at?: string | null;

  // Permite que adapters preservem campos não mapeados.
  [extra: string]: unknown;
}

export interface TabelaPrecoCanonical extends TecnicaGravacaoCanonical {
  // Aliases adicionais específicos da tabela_preco_gravacao_oficial
  tecnica_variante_id?: string | null;
  variant_id?: string | null;
  desconto_segunda_cor?: number | null;
  desconto_terceira_cor?: number | null;
  desconto_quarta_cor_mais?: number | null;
  discount_2nd_color?: number | null;
  discount_3rd_color?: number | null;
  discount_4th_color_plus?: number | null;
}

export interface FaixaPrecoCanonical {
  id: string;
  tabela_preco_gravacao_id?: string | null;
  price_table_id?: string | null;

  /** @deprecated use `min_quantity` */
  quantidade_minima?: number | null;
  min_quantity?: number | null;

  /** @deprecated use `max_quantity` */
  quantidade_maxima?: number | null;
  max_quantity?: number | null;

  /** @deprecated use `unit_price` */
  preco_unitario?: number | null;
  unit_price?: number | null;

  prazo_dias?: number | null;
  production_days?: number | null;

  ordem?: number | null;
  display_order?: number | null;

  created_at?: string | null;
  updated_at?: string | null;

  [extra: string]: unknown;
}

export interface PrintAreaTechniqueCanonical {
  id: string;
  product_id?: string | null;

  // Posição
  /** @deprecated use `location_code` */
  area_code?: string | null;
  location_code?: string | null;
  /** @deprecated use `location_name` */
  area_name?: string | null;
  location_name?: string | null;
  location_order?: number | null;

  // Dimensões
  max_width?: number | null;
  largura_max?: number | null;
  max_height?: number | null;
  altura_max?: number | null;

  // Geometria
  shape?: string | null;
  is_curved?: boolean | null;

  // Técnica
  /** @deprecated use `price_table_id` */
  tabela_preco_id?: string | null;
  price_table_id?: string | null;

  technique_order?: number | null;
  is_active?: boolean | null;
  ativo?: boolean | null;

  unit_cost?: number | null;
  notes?: string | null;

  created_at?: string | null;
  updated_at?: string | null;

  [extra: string]: unknown;
}
