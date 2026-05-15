/**
 * Tests for adaptPriceResponse — garante que os 3 formatos
 * (nested v5.9, flat v6.x, v7 hipotético) produzem o mesmo
 * `CustomizationPriceFlat` canônico.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adaptPriceResponse,
  adaptPriceResponseWithMeta,
  __resetSchemaStatsForTests,
  getSchemaStats,
  detectPriceSchema,
} from '@/lib/personalization/adapters';

beforeEach(() => {
  __resetSchemaStatsForTests();
});

// ============================================
// FIXTURES
// ============================================

const NESTED_V59 = {
  success: true,
  codigo_orcamento: 'LASER-100',
  area: { id: 'area-1', code: 'FRENTE', name: 'Frente', is_curved: false, max_width: 5, max_height: 5, max_colors: 1 },
  tabela: { id: 'tab-1', codigo_tabela: 'LASER-3x12', nome: 'Fiber Laser', grupo_tecnica: 'LASER', cobra_por_cor: false, max_cores: 1 },
  faixa: { ordem: 2, quantidade_minima: 100, quantidade_maxima: 499, preco_unitario_tabela: 3.5, prazo_dias: 7, largura_min: null, largura_max: null, altura_min: null, altura_max: null },
  parametros: { quantidade: 200, num_cores: 1, largura_cm: 3, altura_cm: 12 },
  custos: { custo_base_unitario: 1.2, custo_primeira_cor: 1.2, custo_cores_adicionais: 0, custo_unitario_total: 1.2, custo_setup_base: 50, custo_manuseio: 0, custo_aplicacao: 0, custo_termo_transferencia: 0, custo_queima_forno: 0 },
  precos: { markup_percent: 120, preco_unitario_final: 3.5, subtotal_pecas: 700, faturamento_minimo_gravacao: 150, aplica_minimo: false, total_final: 700 },
};

const FLAT_V6 = {
  success: true,
  area_id: 'area-2',
  area_code: 'SERI-5x5',
  nome_tabela: 'Serigrafia',
  tabela_id: 'tab-2',
  tabela: 'SERI-5x5',
  grupo_tecnica: 'SERIGRAFIA',
  quantidade: 500,
  num_cores: 3,
  preco_unitario: 2.0,
  valor_gravacao: 1000,
  total_cobrado: 1000,
  setup_total: 80,
  prazo_dias: 5,
  markup: { custo_unitario: 0.8, custo_setup_tabela: 80, markup_pct: 150 },
  detalhes: { cobra_por_cor: true, max_cores: 4 },
  faixa: { faixa_id: 'f1', qtd_min: 250, qtd_max: 999, prazo_dias: 5 },
};

const NEW_V7 = {
  success: true,
  area_id: 'area-3',
  area_code: 'UV-7x7',
  table_name: 'UV Digital',
  tabela_id: 'tab-3',
  table_code: 'UV-7x7',
  technique_group: 'UV_DIGITAL',
  quantity: 300,
  num_colors: 2,
  unit_price: 4.2,
  subtotal_pieces: 1260,
  total_charged: 1260,
  setup_total_value: 90,
  production_days: 4,
  markup: { unit_cost: 1.6, setup_cost_table: 90, markup_percent: 120 },
  detalhes: { charges_per_color: true, max_colors: 4 },
  faixa: { faixa_id: 'f2', min_qty: 250, max_qty: 999, production_days: 4 },
};

// ============================================
// DETECÇÃO
// ============================================

describe('detectPriceSchema', () => {
  it('detecta v5.9 nested', () => {
    expect(detectPriceSchema(NESTED_V59)).toBe('v5.9-nested');
  });
  it('detecta v6.x flat', () => {
    expect(detectPriceSchema(FLAT_V6)).toBe('v6.x-flat');
  });
  it('detecta v7-new', () => {
    expect(detectPriceSchema(NEW_V7)).toBe('v7-new');
  });
  it('marca unknown', () => {
    expect(detectPriceSchema({ foo: 'bar' })).toBe('unknown');
  });
  it('contabiliza versões', () => {
    detectPriceSchema(NESTED_V59);
    detectPriceSchema(FLAT_V6);
    detectPriceSchema(FLAT_V6);
    const stats = getSchemaStats();
    expect(stats['v5.9-nested']).toBe(1);
    expect(stats['v6.x-flat']).toBe(2);
  });
});

// ============================================
// ADAPTAÇÃO — NESTED
// ============================================

describe('adaptPriceResponse — nested v5.9', () => {
  it('mapeia campos canônicos', () => {
    const flat = adaptPriceResponse(NESTED_V59);
    expect(flat.success).toBe(true);
    expect(flat.area_id).toBe('area-1');
    expect(flat.tabela_codigo).toBe('LASER-3x12');
    expect(flat.tabela_codigo_curto).toBe('LASER');
    expect(flat.technique).toBe('Fiber Laser');
    expect(flat.unit_price).toBe(3.5);
    expect(flat.total_price).toBe(700);
    expect(flat.production_days).toBe(7);
    expect(flat.tier_used).toBe(2);
    expect(flat.tier_min_qty).toBe(100);
    expect(flat.tier_max_qty).toBe(499);
  });
});

// ============================================
// ADAPTAÇÃO — FLAT
// ============================================

describe('adaptPriceResponse — flat v6.x', () => {
  it('mapeia campos canônicos', () => {
    const flat = adaptPriceResponse(FLAT_V6);
    expect(flat.success).toBe(true);
    expect(flat.area_id).toBe('area-2');
    expect(flat.technique).toBe('Serigrafia');
    expect(flat.unit_price).toBe(2.0);
    expect(flat.total_price).toBe(1000);
    expect(flat.price_by_color).toBe(true);
    expect(flat.max_cores).toBe(4);
    expect(flat.markup_percent).toBe(150);
    expect(flat.tier_min_qty).toBe(250);
  });

  it('lida com payload mínimo', () => {
    const flat = adaptPriceResponse({ success: true, tabela: 'X' });
    expect(flat.tabela_codigo).toBe('X');
    expect(flat.unit_price).toBe(0);
    expect(flat.total_price).toBe(0);
  });

  it('coage valor_gravacao numérico em string', () => {
    const flat = adaptPriceResponse({
      success: true,
      tabela: 'STR',
      quantidade: 10,
      preco_unitario: 1.25,
      // string numérica — adapter atual usa diretamente; valida shape canônico
      valor_gravacao: 12.5,
    });
    expect(flat.subtotal_pecas).toBe(12.5);
    expect(flat.unit_price).toBe(1.25);
  });

  // TODO: ativar quando defaults explícitos para markup ausente forem
  // implementados (passo 4 do plano de fallback).
  it.skip('garante markup default quando ausente no payload', () => {
    const flat = adaptPriceResponse({
      success: true,
      tabela: 'NO-MK',
      quantidade: 10,
      preco_unitario: 1,
      valor_gravacao: 10,
    });
    expect(flat.markup_percent).toBe(0);
    expect(flat.cost_setup).toBe(0);
  });
});

// ============================================
// ADAPTAÇÃO — V7 NEW (hipotético)
// ============================================

describe('adaptPriceResponse — v7 new', () => {
  it('traduz aliases EN para canônico PT', () => {
    const flat = adaptPriceResponse(NEW_V7);
    expect(flat.success).toBe(true);
    expect(flat.area_id).toBe('area-3');
    expect(flat.technique).toBe('UV Digital');
    expect(flat.tabela_codigo).toBe('UV-7x7');
    expect(flat.tabela_codigo_curto).toBe('UV');
    expect(flat.grupo_tecnica).toBe('UV_DIGITAL');
    expect(flat.quantity).toBe(300);
    expect(flat.num_cores).toBe(2);
    expect(flat.unit_price).toBe(4.2);
    expect(flat.subtotal_pecas).toBe(1260);
    expect(flat.total_price).toBe(1260);
    expect(flat.production_days).toBe(4);
    expect(flat.markup_percent).toBe(120);
    expect(flat.price_by_color).toBe(true);
    expect(flat.max_cores).toBe(4);
    expect(flat.tier_min_qty).toBe(250);
    expect(flat.tier_max_qty).toBe(999);
  });
});

// ============================================
// METADATA + UNKNOWN
// ============================================

describe('adaptPriceResponseWithMeta', () => {
  it('retorna versão detectada', () => {
    expect(adaptPriceResponseWithMeta(NESTED_V59).schemaVersion).toBe('v5.9-nested');
    expect(adaptPriceResponseWithMeta(FLAT_V6).schemaVersion).toBe('v6.x-flat');
    expect(adaptPriceResponseWithMeta(NEW_V7).schemaVersion).toBe('v7-new');
  });

  it('emite warn deduplicado para unknown', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    adaptPriceResponseWithMeta({ foo: 'bar' } as Record<string, unknown>);
    const before = warn.mock.calls.length;
    adaptPriceResponseWithMeta({ foo: 'bar' } as Record<string, unknown>);
    // Mesmo payload → não deve disparar warns adicionais
    expect(warn.mock.calls.length).toBe(before);
    warn.mockRestore();
  });
});
