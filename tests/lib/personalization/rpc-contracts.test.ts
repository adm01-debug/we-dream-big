import { describe, it, expect, beforeEach } from 'vitest';
import { PRICE_CONTRACT, OPTIONS_CONTRACT } from '@/lib/personalization/rpc-contracts';
import { validateRpcPayload } from '@/lib/personalization/rpc-validator';
import { __resetSchemaStatsForTests } from '@/lib/personalization/adapters/schema-detection';

beforeEach(() => __resetSchemaStatsForTests());

describe('PRICE_CONTRACT', () => {
  const canonical = {
    success: true,
    tabela: 'FIBER-PL-01',
    nome_tabela: 'Fiber Laser | Plana',
    grupo_tecnica: 'LASER',
    quantidade: 100,
    num_cores: 1,
    preco_unitario: 2.5,
    valor_gravacao: 250,
    setup_total: 80,
    total_cobrado: 250,
    faixa: { qtd_min: 50, qtd_max: 199, preco: 2.5 },
    detalhes: { cobra_por_cor: false, max_cores: 1 },
  };

  it('aceita payload PT canônico', () => {
    const r = validateRpcPayload(PRICE_CONTRACT, canonical);
    expect(r.ok).toBe(true);
    expect(r.missing).toEqual([]);
  });

  it('resolve aliases EN', () => {
    const en = {
      table_code: 'FIBER-PL-01',
      table_name: 'Fiber Laser',
      technique_group: 'LASER',
      quantity: 100,
      num_colors: 1,
      unit_price: 2.5,
      subtotal_pieces: 250,
      setup_total_value: 80,
      total_charged: 250,
      faixa: { min_qty: 50, max_qty: 199 },
      detalhes: { charges_per_color: false, max_colors: 1 },
    };
    const r = validateRpcPayload(PRICE_CONTRACT, en);
    expect(r.ok).toBe(true);
    expect(r.resolvedAliases['preco_unitario']).toBe('unit_price');
    expect(r.resolvedAliases['faixa.qtd_min']).toBe('faixa.min_qty');
  });

  it('detecta campo obrigatório faltando', () => {
    const broken = { ...canonical } as Record<string, unknown>;
    delete broken.preco_unitario;
    const r = validateRpcPayload(PRICE_CONTRACT, broken);
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('preco_unitario');
  });

  it('detecta nested incompleto', () => {
    const broken = { ...canonical, faixa: { qtd_max: 199 } };
    const r = validateRpcPayload(PRICE_CONTRACT, broken);
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('faixa.qtd_min');
  });

  it('reporta extras top-level', () => {
    const r = validateRpcPayload(PRICE_CONTRACT, { ...canonical, weirdoField: 1 });
    expect(r.ok).toBe(true);
    expect(r.extras).toContain('weirdoField');
  });
});

describe('OPTIONS_CONTRACT', () => {
  const canonical = {
    product_id: 'p-1',
    locations: [
      {
        location_code: 'LADO-A',
        location_name: 'Lado A',
        location_order: 1,
        options: [
          {
            technique_id: 't-1',
            codigo_tabela: 'FIBER-PL-01',
            tecnica_nome: 'Fiber Laser',
            grupo_tecnica: 'LASER',
            max_width: 10,
            max_height: 5,
            usa_dimensao: true,
            cobra_por_cor: false,
            max_cores: 1,
          },
        ],
      },
    ],
  };

  it('aceita payload PT canônico', () => {
    const r = validateRpcPayload(OPTIONS_CONTRACT, canonical);
    expect(r.ok).toBe(true);
  });

  it('detecta campo obrigatório ausente em options[]', () => {
    const broken = JSON.parse(JSON.stringify(canonical));
    delete broken.locations[0].options[0].technique_id;
    const r = validateRpcPayload(OPTIONS_CONTRACT, broken);
    expect(r.ok).toBe(false);
    expect(r.missing).toContain('locations[].options[].technique_id');
  });

  it('resolve aliases EN em options[]', () => {
    const en = {
      product_id: 'p-1',
      locations: [
        {
          code: 'LADO-A',
          name: 'Lado A',
          options: [
            {
              tecnica_id: 't-1',
              table_code: 'FIBER-PL-01',
              technique_name: 'Fiber Laser',
              technique_group: 'LASER',
              max_width: 10,
              max_height: 5,
              uses_dimension: true,
              charges_per_color: false,
              max_colors: 1,
            },
          ],
        },
      ],
    };
    const r = validateRpcPayload(OPTIONS_CONTRACT, en);
    expect(r.ok).toBe(true);
    expect(r.resolvedAliases['locations[].location_code']).toBe('locations[].code');
  });
});
