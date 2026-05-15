/**
 * Tests for raw-row adapters — garantem que payloads em PT legado, EN
 * canônico ou misto produzem objetos com **ambos** os nomes preenchidos.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  adaptTecnicaRow,
  adaptTecnicaRows,
  adaptTabelaPrecoRow,
  adaptFaixaPrecoRow,
  adaptPrintAreaTechniqueRow,
  buildTecnicaUpdatePayload,
  __resetSchemaStatsForTests,
  getLegacyFieldsSeen,
} from '@/lib/personalization/adapters';

beforeEach(() => {
  __resetSchemaStatsForTests();
});

describe('adaptTecnicaRow', () => {
  it('espelha PT → EN quando só PT está presente', () => {
    const row = adaptTecnicaRow({
      id: 't-1',
      codigo: 'LASER',
      nome: 'Fiber Laser',
      custo_setup: 50,
      custo_manuseio: 1.5,
      cobra_por_cor: false,
      max_cores: 1,
      ativo: true,
      ordem_exibicao: 3,
    });

    expect(row.codigo).toBe('LASER');
    expect(row.code).toBe('LASER');
    expect(row.nome).toBe('Fiber Laser');
    expect(row.name).toBe('Fiber Laser');
    expect(row.custo_setup).toBe(50);
    expect(row.setup_price).toBe(50);
    expect(row.custo_manuseio).toBe(1.5);
    expect(row.handling_price).toBe(1.5);
    expect(row.charges_per_color).toBe(false);
    expect(row.max_colors).toBe(1);
    expect(row.active).toBe(true);
    expect(row.display_order).toBe(3);
  });

  it('espelha EN → PT quando só EN está presente', () => {
    const row = adaptTecnicaRow({
      id: 't-2',
      code: 'SERIG',
      name: 'Serigrafia',
      setup_price: 80,
      handling_price: 2,
      charges_per_color: true,
      max_colors: 4,
      active: true,
      display_order: 1,
    });

    expect(row.code).toBe('SERIG');
    expect(row.codigo).toBe('SERIG');
    expect(row.name).toBe('Serigrafia');
    expect(row.nome).toBe('Serigrafia');
    expect(row.setup_price).toBe(80);
    expect(row.custo_setup).toBe(80);
    expect(row.cobra_por_cor).toBe(true);
    expect(row.max_cores).toBe(4);
    expect(row.ativo).toBe(true);
    expect(row.ordem_exibicao).toBe(1);
  });

  it('preserva ambos quando payload é híbrido', () => {
    const row = adaptTecnicaRow({
      id: 't-3',
      codigo: 'LEGACY',
      code: 'NEW',
      nome: 'Test',
    });
    expect(row.codigo).toBe('LEGACY');
    expect(row.code).toBe('NEW');
  });

  it('registra telemetria de campos legados detectados', () => {
    adaptTecnicaRow({
      id: 't-4',
      codigo: 'X',
      custo_setup: 10,
      cobra_por_cor: true,
    });
    const seen = getLegacyFieldsSeen();
    expect(seen['tecnica.codigo']).toBeGreaterThan(0);
    expect(seen['tecnica.custo_setup']).toBeGreaterThan(0);
    expect(seen['tecnica.cobra_por_cor']).toBeGreaterThan(0);
  });

  it('coage strings numéricas em max_cores', () => {
    const row = adaptTecnicaRow({ id: 't-5', max_cores: '4' });
    expect(row.max_cores).toBe(4);
    expect(row.max_colors).toBe(4);
  });

  it('lida com input vazio sem quebrar', () => {
    expect(adaptTecnicaRow({} as Record<string, unknown>).id).toBe('');
    expect(adaptTecnicaRows(null)).toEqual([]);
    expect(adaptTecnicaRows(undefined)).toEqual([]);
    expect(adaptTecnicaRows([])).toEqual([]);
  });
});

describe('adaptTabelaPrecoRow', () => {
  it('espelha aliases de descontos por cor', () => {
    const row = adaptTabelaPrecoRow({
      id: 'tp-1',
      codigo: 'LASER-3x12',
      desconto_segunda_cor: 0.5,
      desconto_terceira_cor: 0.3,
      tecnica_variante_id: 'var-1',
    });
    expect(row.discount_2nd_color).toBe(0.5);
    expect(row.discount_3rd_color).toBe(0.3);
    expect(row.variant_id).toBe('var-1');
    // E ainda herda os pares de tecnica
    expect(row.code).toBe('LASER-3x12');
  });

  it('aceita colunas EN puras', () => {
    const row = adaptTabelaPrecoRow({
      id: 'tp-en-1',
      code: 'SERI-5x5',
      name: 'Serigrafia',
      setup_price: 80,
      handling_price: 2,
      max_colors: 4,
      active: true,
      display_order: 2,
    });
    expect(row.code).toBe('SERI-5x5');
    expect(row.codigo).toBe('SERI-5x5');
    expect(row.name).toBe('Serigrafia');
    expect(row.setup_price).toBe(80);
    expect(row.custo_setup).toBe(80);
    expect(row.max_colors).toBe(4);
    expect(row.max_cores).toBe(4);
  });
});

describe('adaptFaixaPrecoRow', () => {
  it('espelha PT ↔ EN nas faixas', () => {
    const f = adaptFaixaPrecoRow({
      id: 'f-1',
      tabela_preco_gravacao_id: 'tp-1',
      quantidade_minima: 100,
      quantidade_maxima: 499,
      preco_unitario: 3.5,
      prazo_dias: 7,
      ordem: 2,
    });
    expect(f.min_quantity).toBe(100);
    expect(f.max_quantity).toBe(499);
    expect(f.unit_price).toBe(3.5);
    expect(f.production_days).toBe(7);
    expect(f.display_order).toBe(2);
    expect(f.price_table_id).toBe('tp-1');
  });

  it('aceita formato EN puro', () => {
    const f = adaptFaixaPrecoRow({
      id: 'f-2',
      price_table_id: 'tp-2',
      min_quantity: 50,
      unit_price: 4.2,
    });
    expect(f.tabela_preco_gravacao_id).toBe('tp-2');
    expect(f.quantidade_minima).toBe(50);
    expect(f.preco_unitario).toBe(4.2);
  });

  it('lida com payload híbrido (EN + PT)', () => {
    const f = adaptFaixaPrecoRow({
      id: 'f-hyb',
      price_table_id: 'tp-h',
      min_quantity: 50,
      preco_unitario: 4.2,
    });
    expect(f.tabela_preco_gravacao_id).toBe('tp-h');
    expect(f.price_table_id).toBe('tp-h');
    expect(f.quantidade_minima).toBe(50);
    expect(f.min_quantity).toBe(50);
    expect(f.preco_unitario).toBe(4.2);
    expect(f.unit_price).toBe(4.2);
  });
});

describe('adaptPrintAreaTechniqueRow', () => {
  it('espelha aliases de área', () => {
    const a = adaptPrintAreaTechniqueRow({
      id: 'a-1',
      area_code: 'FRENTE',
      area_name: 'Frente',
      max_width: 5,
      max_height: 8,
      tabela_preco_id: 'tp-1',
      ativo: true,
    });
    expect(a.location_code).toBe('FRENTE');
    expect(a.location_name).toBe('Frente');
    expect(a.largura_max).toBe(5);
    expect(a.altura_max).toBe(8);
    expect(a.price_table_id).toBe('tp-1');
    expect(a.is_active).toBe(true);
  });
});

describe('buildTecnicaUpdatePayload', () => {
  it('devolve payload contendo ambos os nomes', () => {
    const p = buildTecnicaUpdatePayload({ id: 't-1', code: 'X', setup_price: 10 });
    expect(p.id).toBe('t-1');
    expect(p.code).toBe('X');
    expect(p.codigo).toBe('X');
    expect(p.setup_price).toBe(10);
    expect(p.custo_setup).toBe(10);
  });

  it('omite id quando partial não tinha id', () => {
    const p = buildTecnicaUpdatePayload({ code: 'X' });
    expect(p.id).toBeUndefined();
  });
});
