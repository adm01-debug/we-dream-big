/**
 * Tests for adaptCustomizationOptions — garante que payloads com nomes
 * antigos (PT) e novos (EN/aliased) produzem a mesma struct canônica.
 */
import { describe, expect, it } from 'vitest';
import { adaptCustomizationOptions } from '@/lib/personalization/adapters';

const PT_PAYLOAD = {
  product_id: 'prod-1',
  locations: [
    {
      location_code: 'LADO-A',
      location_name: 'Lado A',
      location_order: 1,
      options: [
        {
          technique_id: 'tec-1',
          codigo_tabela: 'FIBER-PL-01',
          tecnica_nome: 'Fiber Laser | Plana',
          grupo_tecnica: 'LASER',
          variacao_label: 'Plana',
          max_width: 10,
          max_height: 5,
          gravacao_largura_max: 8,
          gravacao_altura_max: 4,
          efetiva_largura_max: 8,
          efetiva_altura_max: 4,
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

const EN_PAYLOAD = {
  product_id: 'prod-1',
  locations: [
    {
      code: 'LADO-A',
      name: 'Lado A',
      order: 1,
      options: [
        {
          technique_id: 'tec-1',
          table_code: 'FIBER-PL-01',
          technique_name: 'Fiber Laser | Plana',
          technique_group: 'LASER',
          variation_label: 'Plana',
          max_width: 10,
          max_height: 5,
          print_max_width: 8,
          print_max_height: 4,
          effective_max_width: 8,
          effective_max_height: 4,
          shape: 'rectangle',
          curved_surface: false,
          uses_dimension: true,
          charges_per_color: false,
          max_colors: 1,
        },
      ],
    },
  ],
};

describe('adaptCustomizationOptions', () => {
  it('mapeia payload PT canônico', () => {
    const out = adaptCustomizationOptions(PT_PAYLOAD);
    expect(out).not.toBeNull();
    expect(out!.product_id).toBe('prod-1');
    expect(out!.locations).toHaveLength(1);
    const loc = out!.locations[0];
    expect(loc.location_code).toBe('LADO-A');
    expect(loc.location_name).toBe('Lado A');
    expect(loc.options).toHaveLength(1);
    const opt = loc.options[0];
    expect(opt.tecnica_nome).toBe('Fiber Laser | Plana');
    expect(opt.usa_dimensao).toBe(true);
    expect(opt.cobra_por_cor).toBe(false);
    expect(opt.max_cores).toBe(1);
    expect(opt.efetiva_largura_max).toBe(8);
  });

  it('mapeia aliases EN para mesma struct canônica', () => {
    const ptOut = adaptCustomizationOptions(PT_PAYLOAD);
    const enOut = adaptCustomizationOptions(EN_PAYLOAD);
    expect(enOut).toEqual(ptOut);
  });

  it('retorna null para payload inválido', () => {
    expect(adaptCustomizationOptions(null)).toBeNull();
    expect(adaptCustomizationOptions(undefined)).toBeNull();
  });

  it('lida com locations vazias', () => {
    const out = adaptCustomizationOptions({ product_id: 'prod-2', locations: [] });
    expect(out).not.toBeNull();
    expect(out!.locations).toEqual([]);
  });
});
