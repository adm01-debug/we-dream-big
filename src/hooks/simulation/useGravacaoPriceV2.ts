/**
 * useGravacaoPriceV2 - Fluxo para cálculo de preço de gravação
 * 
 * ARQUITETURA DEFINITIVA (v5.9):
 * - product_print_areas: áreas de gravação por produto
 * - tabela_preco_gravacao_oficial: 50 tabelas de preço (16 grupos)
 * - fn_get_customization_price: RPC única que calcula preço via p_area_id
 * 
 * NÃO usa mais fn_get_customization_price_v2 (eliminada).
 * NÃO usa mais conceito de variantes (tecnica_variante_id eliminado).
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { invokeExternalRpc } from '@/lib/external-rpc';
import { invokeExternalDb } from '@/lib/external-db';
import { adaptPriceResponse } from '@/lib/personalization/adapters';

// ============================================
// TYPES - Nova resposta RPC v5.9
// ============================================

/** Resposta completa da fn_get_customization_price (v5.9) */
export interface CustomizationPriceResponse {
  success: boolean;
  codigo_orcamento: string;

  // Redirecionamento 360° (opcional)
  redirected_from?: string;
  redirected_to?: string;
  original_area_id?: string;

  area: {
    id: string;
    code: string;
    name: string;
    is_curved: boolean;
    max_width: number;
    max_height: number;
    max_colors: number | null;
  };

  tabela: {
    id: string;
    codigo_tabela: string;
    nome: string;
    grupo_tecnica: string;
    cobra_por_cor: boolean;
    max_cores: number;
  };

  faixa: {
    ordem: number;
    quantidade_minima: number;
    quantidade_maxima: number;
    preco_unitario_tabela: number;
    prazo_dias: number;
    largura_min: number | null;
    largura_max: number | null;
    altura_min: number | null;
    altura_max: number | null;
  };

  parametros: {
    quantidade: number;
    num_cores: number;
    largura_cm: number | null;
    altura_cm: number | null;
  };

  custos: {
    custo_base_unitario: number;
    custo_primeira_cor: number;
    custo_cores_adicionais: number;
    custo_unitario_total: number;
    custo_setup_base: number;
    custo_manuseio: number;
    custo_aplicacao: number;
    custo_termo_transferencia: number;
    custo_queima_forno: number;
  };

  precos: {
    markup_percent: number;
    preco_unitario_final: number;
    subtotal_pecas: number;
    faturamento_minimo_gravacao: number;
    aplica_minimo: boolean;
    total_final: number;
  };
}

/** Interface flat compatível com o UI existente (mapeada da resposta nested) */
export interface CustomizationPriceFlat {
  success: boolean;
  area_id: string;
  area_code: string;
  area_name: string;
  tabela_id: string;
  tabela_codigo: string;
  tabela_codigo_curto: string;
  technique: string;
  grupo_tecnica: string;
  codigo_orcamento: string;
  quantity: number;
  num_cores: number;
  unit_price: number;
  subtotal_pecas: number;
  faturamento_minimo_gravacao: number;
  minimum_applied: boolean;
  total_price: number;
  cost_base_unit: number;
  cost_unit_total: number;
  cost_setup: number;
  markup_percent: number;
  margin_percent: number;
  price_by_color: boolean;
  max_cores: number;
  production_days: number | null;
  tier_used: number;
  tier_min_qty: number;
  tier_max_qty: number;
  // Redirect info
  redirected_from?: string;
  redirected_to?: string;
}

/**
 * @deprecated Use `adaptPriceResponse` de `@/lib/personalization/adapters`.
 * Mantido como re-export por 1 ciclo para compatibilidade com imports legados.
 */
export function mapPriceResponseToFlat(resp: Record<string, unknown>): CustomizationPriceFlat {
  return adaptPriceResponse(resp);
}

// ============================================
// TYPES - Áreas de gravação
// ============================================

export interface PrintAreaV2 {
  area_id: string;
  area_code: string;
  area_name: string;
  component_name: string | null;
  component_code: string | null;
  location_name: string | null;
  location_code: string | null;
  max_width: number;
  max_height: number;
  unit: string;
  shape: string;
  is_curved: boolean;
  is_primary: boolean;
  display_order: number;
  max_colors: number | null;
  customization_price_table_id: string | null;
  allowed_technique_ids: string[] | null;
  /** Nome da técnica/tabela vinculada */
  technique_name: string | null;
  /** Grupo da técnica (LASER, SERIGRAFIA, etc.) */
  grupo_tecnica: string | null;
  /** Se a tabela cobra por cor */
  cobra_por_cor: boolean;
}

// ============================================
// Interface RAW de product_print_areas
// ============================================

interface ProductPrintAreaRaw {
  id: string;
  product_id: string;
  area_code: string;
  area_name: string;
  component_name: string | null;
  component_code: string | null;
  location_name: string | null;
  location_code: string | null;
  max_width: number;
  max_height: number;
  unit: string;
  shape: string;
  is_curved: boolean;
  is_primary: boolean;
  display_order: number;
  is_active: boolean;
  max_colors: number | null;
  allowed_technique_ids: string[] | null;
  customization_price_table_id: string | null;
}

interface TabelaOficialRaw {
  id: string;
  codigo_tabela: string;
  codigo_curto: string;
  nome: string;
  grupo_tecnica: string;
  cobra_por_cor: boolean;
  max_cores: number;
  ativo: boolean;
}

// ============================================
// PASSO 1: Buscar áreas + técnicas via queries diretas
// ============================================

async function buildPrintAreasFromTables(productId: string): Promise<PrintAreaV2[]> {
  // 1. Buscar áreas da tabela print_area_techniques (SSOT)
  const { fetchPrintAreasFromProduct } = await import('@/lib/fetch-print-areas');
  const fetchedAreas = await fetchPrintAreasFromProduct(productId);
  
  if (!fetchedAreas.length) return [];
  
  // Cast para interface esperada
  const areasResult = { records: fetchedAreas as unknown as ProductPrintAreaRaw[] };

  // 2. Coletar IDs das tabelas de preço usadas
  const priceTableIds = new Set<string>();
  for (const area of areasResult.records) {
    if (area.customization_price_table_id) {
      priceTableIds.add(area.customization_price_table_id);
    }
  }

  // 3. Buscar tabelas de preço referenciadas
  const techById = new Map<string, TabelaOficialRaw>();
  if (priceTableIds.size > 0) {
    const techResults = await invokeExternalDb<TabelaOficialRaw>({
      table: 'tabela_preco_gravacao_oficial',
      operation: 'select',
      filters: { ativo: true },
      orderBy: { column: 'nome', ascending: true },
      limit: 100,
    });
    for (const t of techResults.records) {
      if (priceTableIds.has(t.id)) {
        techById.set(t.id, t);
      }
    }
  }

  // 4. Montar PrintAreaV2 para cada área
  return areasResult.records.map(area => {
    const tech = area.customization_price_table_id
      ? techById.get(area.customization_price_table_id)
      : undefined;

    return {
      area_id: area.id,
      area_code: area.area_code,
      area_name: area.area_name,
      component_name: area.component_name,
      component_code: area.component_code,
      location_name: area.location_name,
      location_code: area.location_code,
      max_width: area.max_width,
      max_height: area.max_height,
      unit: area.unit || 'cm',
      shape: area.shape || 'rectangle',
      is_curved: area.is_curved ?? false,
      is_primary: area.is_primary ?? false,
      display_order: area.display_order ?? 0,
      max_colors: area.max_colors ?? tech?.max_cores ?? null,
      customization_price_table_id: area.customization_price_table_id,
      allowed_technique_ids: area.allowed_technique_ids,
      technique_name: tech?.nome ?? null,
      grupo_tecnica: tech?.grupo_tecnica ?? null,
      cobra_por_cor: tech?.cobra_por_cor ?? false,
    };
  });
}

export function useProductPrintAreasV2(productId: string | null) {
  return useQuery({
    queryKey: ['print-areas-v2', productId],
    queryFn: async (): Promise<PrintAreaV2[]> => {
      if (!productId) return [];
      return buildPrintAreasFromTables(productId);
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });
}

export async function fetchProductPrintAreasV2(productId: string): Promise<PrintAreaV2[]> {
  return buildPrintAreasFromTables(productId);
}

// ============================================
// PASSO 2: Calcular preço via fn_get_customization_price
// ============================================

export interface CalculatePriceParams {
  areaId: string;
  quantidade: number;
  numCores?: number;
  larguraCm?: number | null;
  alturaCm?: number | null;
}

export function useCustomizationPriceV2() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatePrice = useCallback(async (
    params: CalculatePriceParams
  ): Promise<CustomizationPriceFlat | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await invokeExternalRpc<CustomizationPriceResponse>(
        'fn_get_customization_price',
        {
          p_area_id: params.areaId,
          p_quantidade: params.quantidade,
          p_num_cores: params.numCores ?? 1,
          p_largura_cm: params.larguraCm ?? null,
          p_altura_cm: params.alturaCm ?? null,
        }
      );
      
      setLoading(false);
      if (!result?.success) return null;
      return adaptPriceResponse(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao calcular preço';
      setError(message);
      setLoading(false);
      return null;
    }
  }, []);

  return { calculatePrice, loading, error };
}

export function useCustomizationPriceReactive(
  areaId: string | null,
  quantidade: number,
  numCores: number = 1
) {
  const [price, setPrice] = useState<CustomizationPriceFlat | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!areaId || quantidade <= 0) {
      setPrice(null);
      return;
    }

    setLoading(true);
    setError(null);

    invokeExternalRpc<CustomizationPriceResponse>(
      'fn_get_customization_price',
      {
        p_area_id: areaId,
        p_quantidade: quantidade,
        p_num_cores: numCores,
      }
    )
      .then((data) => {
        if (data && data.success) {
          setPrice(adaptPriceResponse(data));
        } else {
          setError('Erro no cálculo');
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao calcular preço');
      })
      .finally(() => setLoading(false));
  }, [areaId, quantidade, numCores]);

  return { price, loading, error };
}

export async function calculateCustomizationPrice(
  params: CalculatePriceParams
): Promise<CustomizationPriceFlat> {
  const result = await invokeExternalRpc<CustomizationPriceResponse>(
    'fn_get_customization_price',
    {
      p_area_id: params.areaId,
      p_quantidade: params.quantidade,
      p_num_cores: params.numCores ?? 1,
      p_largura_cm: params.larguraCm ?? null,
      p_altura_cm: params.alturaCm ?? null,
    }
  );
  return adaptPriceResponse(result);
}

// ============================================
// HELPERS
// ============================================

export function getColorSelectorConfig(maxColors: number) {
  if (maxColors === 0) {
    return { showSelector: false, maxValue: 0, label: 'Full Color (sem limite)' };
  }
  if (maxColors === 1) {
    return { showSelector: false, maxValue: 1, label: '1 cor (fixa)' };
  }
  return { showSelector: true, maxValue: maxColors, label: `Até ${maxColors} cores` };
}
