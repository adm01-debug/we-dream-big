/**
 * RPC Contracts — Contratos esperados dos RPCs de personalização.
 *
 * Cada contrato declara:
 *  - `requiredFields`: campos que o parse depende (canônico). Suporta dot-paths
 *    (`faixa.qtd_min`) e wildcards de array (`locations[].location_code`,
 *    `locations[].options[].technique_id`).
 *  - `optionalFields`: bônus que se vierem o front consome.
 *  - `aliasMap`: nome canônico → lista de nomes aceitos no payload.
 *
 * O validador (`rpc-validator.ts`) usa esses contratos para detectar drift
 * proativamente, sem alterar o parse real (que vive nos adapters).
 */

export interface RpcContract {
  name: string;
  requiredFields: string[];
  optionalFields: string[];
  /** Mapa canônico → aliases aceitos. Usado para resolver nomes EN/legados. */
  aliasMap: Record<string, string[]>;
}

export const PRICE_CONTRACT: RpcContract = {
  name: 'fn_get_customization_price',
  requiredFields: [
    'tabela',
    'nome_tabela',
    'grupo_tecnica',
    'quantidade',
    'num_cores',
    'preco_unitario',
    'valor_gravacao',
    'setup_total',
    'total_cobrado',
    'faixa.qtd_min',
    'faixa.qtd_max',
    'detalhes.cobra_por_cor',
    'detalhes.max_cores',
  ],
  optionalFields: [
    'success',
    'error',
    'preco_por_unidade',
    'faixa.faixa_id',
    'faixa.preco',
    'faixa.prazo_dias',
    'detalhes.is_curved',
    'detalhes.desconto_2cor',
    'detalhes.desconto_3cor',
    'markup',
    'markup.markup_pct',
    'markup.preco_min_unit',
    'markup.custo_unitario',
    'markup.custo_setup_tabela',
    'markup.setup_proprio',
    'codigo_orcamento',
    'redirected_from',
    'redirected_to',
  ],
  aliasMap: {
    tabela: ['table_code', 'tabela_codigo'],
    nome_tabela: ['table_name'],
    grupo_tecnica: ['technique_group'],
    quantidade: ['quantity'],
    num_cores: ['num_colors'],
    preco_unitario: ['unit_price'],
    preco_por_unidade: ['unit_price_per_piece'],
    valor_gravacao: ['subtotal_pieces'],
    setup_total: ['setup_total_value'],
    total_cobrado: ['total_charged'],
    'faixa.qtd_min': ['faixa.min_qty'],
    'faixa.qtd_max': ['faixa.max_qty'],
    'faixa.prazo_dias': ['faixa.production_days'],
    'detalhes.cobra_por_cor': ['detalhes.charges_per_color'],
    'detalhes.max_cores': ['detalhes.max_colors'],
    'markup.markup_pct': ['markup.markup_percent'],
    'markup.custo_unitario': ['markup.unit_cost'],
    'markup.custo_setup_tabela': ['markup.setup_cost_table'],
  },
};

export const OPTIONS_CONTRACT: RpcContract = {
  name: 'fn_get_product_customization_options',
  requiredFields: [
    'product_id',
    'locations[].location_code',
    'locations[].location_name',
    'locations[].options[].technique_id',
    'locations[].options[].codigo_tabela',
    'locations[].options[].tecnica_nome',
    'locations[].options[].grupo_tecnica',
    'locations[].options[].max_width',
    'locations[].options[].max_height',
    'locations[].options[].usa_dimensao',
    'locations[].options[].cobra_por_cor',
    'locations[].options[].max_cores',
  ],
  optionalFields: [
    'locations[].location_order',
    'locations[].options[].variacao_label',
    'locations[].options[].efetiva_largura_max',
    'locations[].options[].efetiva_altura_max',
    'locations[].options[].gravacao_largura_max',
    'locations[].options[].gravacao_altura_max',
    'locations[].options[].shape',
    'locations[].options[].is_curved',
  ],
  aliasMap: {
    product_id: ['produto_id', 'id'],
    'locations[].location_code': ['locations[].code'],
    'locations[].location_name': ['locations[].name'],
    'locations[].location_order': ['locations[].order'],
    'locations[].options[].technique_id': [
      'locations[].options[].tecnica_id',
      'locations[].options[].id',
    ],
    'locations[].options[].codigo_tabela': [
      'locations[].options[].table_code',
      'locations[].options[].code',
    ],
    'locations[].options[].tecnica_nome': [
      'locations[].options[].technique_name',
      'locations[].options[].name',
      'locations[].options[].nome',
    ],
    'locations[].options[].grupo_tecnica': [
      'locations[].options[].technique_group',
      'locations[].options[].group_code',
    ],
    'locations[].options[].usa_dimensao': [
      'locations[].options[].uses_dimension',
      'locations[].options[].price_by_area',
    ],
    'locations[].options[].cobra_por_cor': [
      'locations[].options[].charges_per_color',
      'locations[].options[].price_by_color',
    ],
    'locations[].options[].max_cores': ['locations[].options[].max_colors'],
    'locations[].options[].efetiva_largura_max': [
      'locations[].options[].effective_max_width',
      'locations[].options[].max_width_effective',
    ],
    'locations[].options[].efetiva_altura_max': [
      'locations[].options[].effective_max_height',
      'locations[].options[].max_height_effective',
    ],
    'locations[].options[].is_curved': [
      'locations[].options[].curved',
      'locations[].options[].curved_surface',
    ],
  },
};

export const ALL_CONTRACTS: RpcContract[] = [PRICE_CONTRACT, OPTIONS_CONTRACT];
