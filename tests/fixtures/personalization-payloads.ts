/**
 * Fixtures compartilhadas para testes de personalização.
 *
 * Cobrem PT (canônico atual), EN (futuro hipotético) e híbrido — usadas
 * pelos smoke/functional tests dos hooks e pelos testes dos adapters.
 */

// ============================================
// fn_get_customization_price — payloads
// ============================================

export const PRICE_PAYLOAD_PT_V6 = {
  success: true,
  tabela: 'LASER-3x12',
  nome_tabela: 'Fiber Laser',
  grupo_tecnica: 'LASER',
  quantidade: 100,
  num_cores: 1,
  preco_unitario: 3.5,
  valor_gravacao: 350,
  setup_total: 50,
  total_cobrado: 400,
  prazo_dias: 7,
  faixa: { faixa_id: 'f1', qtd_min: 100, qtd_max: 499, prazo_dias: 7, preco: 3.5 },
  detalhes: { cobra_por_cor: false, max_cores: 1, is_curved: false },
  markup: { markup_pct: 120, custo_unitario: 1.2, custo_setup_tabela: 50, preco_min_unit: 3.5 },
  codigo_orcamento: 'LASER-3x12-100',
};

export const PRICE_PAYLOAD_EN_FUTURE = {
  success: true,
  table_code: 'LASER-3x12',
  table_name: 'Fiber Laser',
  technique_group: 'LASER',
  quantity: 100,
  num_colors: 1,
  unit_price: 3.5,
  subtotal_pieces: 350,
  setup_total_value: 50,
  total_charged: 400,
  faixa: { faixa_id: 'f1', min_qty: 100, max_qty: 499, production_days: 7 },
  detalhes: { charges_per_color: false, max_colors: 1 },
  markup: { markup_percent: 120, unit_cost: 1.2, setup_cost_table: 50 },
};

export const PRICE_PAYLOAD_HYBRID = {
  success: true,
  tabela: 'SERI-5x5',
  table_name: 'Serigrafia',
  grupo_tecnica: 'SERIGRAFIA',
  quantity: 200,
  num_cores: 2,
  unit_price: 2,
  valor_gravacao: 400,
  setup_total: 80,
  total_cobrado: 480,
  faixa: { qtd_min: 100, max_qty: 499 },
  detalhes: { cobra_por_cor: true, max_colors: 4 },
};

// ============================================
// fn_get_product_customization_options
// ============================================

export const OPTIONS_PAYLOAD_PT = {
  product_id: 'prod-1',
  locations: [
    {
      location_code: 'FRENTE',
      location_name: 'Frente',
      location_order: 1,
      options: [
        {
          technique_id: 'tech-1',
          codigo_tabela: 'LASER-3x12',
          tecnica_nome: 'Fiber Laser',
          grupo_tecnica: 'LASER',
          max_width: 5,
          max_height: 8,
          efetiva_largura_max: 5,
          efetiva_altura_max: 8,
          shape: 'rectangle',
          is_curved: false,
          usa_dimensao: false,
          cobra_por_cor: false,
          max_cores: 1,
        },
        {
          technique_id: 'tech-2',
          codigo_tabela: 'SERI-5x5',
          tecnica_nome: 'Serigrafia',
          grupo_tecnica: 'SERIGRAFIA',
          max_width: 10,
          max_height: 10,
          efetiva_largura_max: 10,
          efetiva_altura_max: 10,
          shape: 'rectangle',
          is_curved: false,
          usa_dimensao: true,
          cobra_por_cor: true,
          max_cores: 4,
        },
      ],
    },
    {
      location_code: 'COSTAS',
      location_name: 'Costas',
      location_order: 2,
      options: [
        {
          technique_id: 'tech-3',
          codigo_tabela: 'UV-7x7',
          tecnica_nome: 'UV Digital',
          grupo_tecnica: 'UV',
          max_width: 7,
          max_height: 7,
          efetiva_largura_max: 7,
          efetiva_altura_max: 7,
          shape: 'rectangle',
          is_curved: false,
          usa_dimensao: true,
          cobra_por_cor: false,
          max_cores: 1,
        },
      ],
    },
  ],
};

// ============================================
// Rows de tabelas (BD externo) — tecnica_gravacao
// ============================================

export const TECNICA_ROW_PT = {
  id: 't-pt-1',
  codigo: 'LASER',
  nome: 'Fiber Laser',
  custo_setup: 50,
  custo_manuseio: 1.5,
  cobra_por_cor: false,
  max_cores: 1,
  ativo: true,
  ordem_exibicao: 1,
  grupo_tecnica: 'LASER',
};

export const TECNICA_ROW_EN = {
  id: 't-en-1',
  code: 'SERIG',
  name: 'Serigrafia',
  setup_price: 80,
  handling_price: 2,
  charges_per_color: true,
  max_colors: 4,
  active: true,
  display_order: 2,
  group: 'SERIGRAFIA',
};

export const TECNICA_ROW_HYBRID = {
  id: 't-hyb-1',
  codigo: 'UV',
  name: 'UV Digital',
  setup_price: 90,
  custo_manuseio: 1,
  max_cores: 4,
  active: true,
};

// ============================================
// tabela_preco_gravacao_oficial
// ============================================

export const TABELA_PRECO_ROW_PT = {
  id: 'tp-pt-1',
  codigo: 'LASER-3x12',
  codigo_tabela: 'LASER-3x12',
  nome: 'Fiber Laser',
  grupo_tecnica: 'LASER',
  desconto_segunda_cor: 0.5,
  desconto_terceira_cor: 0.3,
  ativo: true,
};

export const TABELA_PRECO_ROW_EN = {
  id: 'tp-en-1',
  code: 'SERI-5x5',
  name: 'Serigrafia',
  setup_price: 80,
  handling_price: 2,
  max_colors: 4,
  active: true,
  display_order: 2,
};

// ============================================
// faixa_preco
// ============================================

export const FAIXA_PRECO_ROW_PT = {
  id: 'f-pt-1',
  tabela_preco_gravacao_id: 'tp-pt-1',
  quantidade_minima: 100,
  quantidade_maxima: 499,
  preco_unitario: 3.5,
  prazo_dias: 7,
  ordem: 1,
};

export const FAIXA_PRECO_ROW_HYBRID = {
  id: 'f-hyb-1',
  price_table_id: 'tp-pt-1',
  min_quantity: 50,
  preco_unitario: 4.2,
};

// ============================================
// print_area_techniques
// ============================================

export const PRINT_AREA_ROW_PT = {
  id: 'pa-pt-1',
  product_id: 'prod-1',
  area_code: 'FRENTE',
  area_name: 'Frente',
  max_width: 5,
  max_height: 8,
  tabela_preco_id: 'tp-pt-1',
  ativo: true,
  technique_order: 1,
  shape: 'rectangle',
  is_curved: false,
};
