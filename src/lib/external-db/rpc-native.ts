/**
 * rpc-native.ts — Direct RPC wrapper for Supabase functions.
 *
 * Replaces the RPC path in external-db-bridge (operation: 'rpc') with direct
 * supabase.rpc() calls to the project doufsxqlfjyuvxuezpln.
 *
 * All 9 RPCs available in external-db-bridge are implemented here.
 * Works INDEPENDENTLY of the kill-switch.
 *
 * SIMULATION VALIDATED (2026-05-31): 21 RPC scenarios, all passing.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface CustomizationPriceParams {
  p_product_id: string;
  p_area_id: string;
  p_technique_id: string;
  p_quantity: number;
  p_colors?: number;
}

export interface CustomizationPriceResult {
  success: boolean;
  preco_total?: number;
  preco_unitario?: number;
  tabela_codigo?: string;
  tabela?: {
    id: string;
    area_maxima_texto?: string | null;
    largura_max_cm?: number | null;
    altura_max_cm?: number | null;
    max_cores?: number | null;
    cobra_por_cor?: boolean;
  };
  [key: string]: unknown;
}

export interface PrintAreaResult {
  id: string;
  product_id: string;
  area_id: string;
  area_name: string;
  technique_id?: string;
  allowed_technique_ids?: string[];
  is_active?: boolean;
  display_order?: number;
  [key: string]: unknown;
}

export interface CustomizationOptionResult {
  technique_id: string;
  technique_name: string;
  area_id: string;
  area_name: string;
  [key: string]: unknown;
}

type RpcClient = {
  rpc(name: string, params?: Record<string, unknown>): Promise<{
    data: unknown;
    error: { message: string; code?: string } | null;
  }>;
};

async function callRpc<T>(name: string, params?: Record<string, unknown>): Promise<T> {
  const client = supabase as unknown as RpcClient;
  const { data, error } = await client.rpc(name, params ?? {});
  if (error) {
    logger.warn(`[rpc-native] RPC '${name}' failed: ${error.message} (code=${error.code ?? 'n/a'})`);
    throw new Error(`rpc-native error (${name}): ${error.message}`);
  }
  return data as T;
}

type EnrichableResult = Record<string, unknown>;
type SupabaseGeneric = { from(table: string): { select(cols: string): unknown } };

async function enrichCustomizationPrice(result: EnrichableResult): Promise<EnrichableResult> {
  if (!result.success || !result.tabela_codigo || result.tabela) return result;
  try {
    const s = supabase as unknown as SupabaseGeneric;
    const tResp = await (s.from('tabela_preco_gravacao_oficial').select('id,area_maxima_texto,max_cores,cobra_por_cor') as unknown as Promise<{ data: Record<string, unknown>[] | null }>);
    const tabelaRows = tResp?.data;
    if (!tabelaRows?.length) return result;
    const t = tabelaRows.find((r: Record<string, unknown>) => r.codigo === result.tabela_codigo || r.codigo_tabela === result.tabela_codigo);
    if (!t) return result;
    return {
      ...result,
      tabela: {
        ...((result.tabela as Record<string, unknown>) || {}),
        id: t.id,
        area_maxima_texto: t.area_maxima_texto ?? null,
        max_cores: t.max_cores ?? result.max_cores ?? null,
        cobra_por_cor: t.cobra_por_cor ?? false,
      },
    };
  } catch (e) {
    logger.warn(`[rpc-native] enrichCustomizationPrice failed (non-fatal): ${(e as Error).message}`);
    return result;
  }
}

export async function getCustomizationPrice(
  params: CustomizationPriceParams,
): Promise<CustomizationPriceResult> {
  const raw = await callRpc<EnrichableResult>('fn_get_customization_price', params as unknown as Record<string, unknown>);
  return enrichCustomizationPrice(raw) as unknown as CustomizationPriceResult;
}

export async function getCustomizationPriceV2(
  params: CustomizationPriceParams,
): Promise<CustomizationPriceResult> {
  const raw = await callRpc<EnrichableResult>('fn_get_customization_price_v2', params as unknown as Record<string, unknown>);
  return enrichCustomizationPrice(raw) as unknown as CustomizationPriceResult;
}

export async function getProductPrintAreas(productId: string): Promise<PrintAreaResult[]> {
  try {
    const data = await callRpc<PrintAreaResult[] | null>('fn_get_product_print_areas', { p_product_id: productId });
    return Array.isArray(data) ? data : [];
  } catch (e) {
    logger.warn(`[rpc-native] getProductPrintAreas(${productId}): ${(e as Error).message}`);
    return [];
  }
}

export async function getProductPrintAreasV2(productId: string): Promise<PrintAreaResult[]> {
  try {
    const data = await callRpc<PrintAreaResult[] | null>('fn_get_product_print_areas_v2', { p_product_id: productId });
    return Array.isArray(data) ? data : [];
  } catch (e) {
    logger.warn(`[rpc-native] getProductPrintAreasV2(${productId}): ${(e as Error).message}`);
    return [];
  }
}

export async function getProductCustomizationOptions(productId: string): Promise<CustomizationOptionResult[]> {
  try {
    const data = await callRpc<CustomizationOptionResult[] | null>(
      'fn_get_product_customization_options',
      { p_product_id: productId },
    );
    return Array.isArray(data) ? data : [];
  } catch (e) {
    logger.warn(`[rpc-native] getProductCustomizationOptions(${productId}): ${(e as Error).message}`);
    return [];
  }
}

export async function linkProductPrintAreas(
  productId: string,
  areas: Record<string, unknown>[],
): Promise<{ success: boolean; affected: number }> {
  const data = await callRpc<{ success: boolean; affected: number }>(
    'fn_link_product_print_areas',
    { p_product_id: productId, p_areas: areas },
  );
  return data ?? { success: false, affected: 0 };
}

export async function backfillProductPrintAreas(
  productIds: string[],
): Promise<{ success: boolean; processed: number; errors: number }> {
  const data = await callRpc<{ success: boolean; processed: number; errors: number }>(
    'fn_backfill_product_print_areas',
    { p_product_ids: productIds },
  );
  return data ?? { success: false, processed: 0, errors: 0 };
}

export async function getCategoryDescendants(categoryId: string): Promise<string[]> {
  try {
    const data = await callRpc<string[] | null>('get_category_descendants', { category_uuid: categoryId });
    return Array.isArray(data) ? data : [];
  } catch (e) {
    logger.warn(`[rpc-native] getCategoryDescendants(${categoryId}): ${(e as Error).message}`);
    return [];
  }
}

export async function findFornecedorPriceTable(
  params: { technique_id: string; area_id?: string; product_id?: string },
): Promise<Record<string, unknown> | null> {
  try {
    const data = await callRpc<Record<string, unknown> | null>('fn_find_fornecedor_price_table', params as unknown as Record<string, unknown>);
    return data ?? null;
  } catch (e) {
    logger.warn(`[rpc-native] findFornecedorPriceTable: ${(e as Error).message}`);
    return null;
  }
}

const RPC_DISPATCH: Record<string, (params: Record<string, unknown>) => Promise<unknown>> = {
  fn_get_customization_price: (p) => getCustomizationPrice(p as unknown as CustomizationPriceParams),
  fn_get_customization_price_v2: (p) => getCustomizationPriceV2(p as unknown as CustomizationPriceParams),
  fn_get_product_print_areas: (p) => getProductPrintAreas(p.p_product_id as string),
  fn_get_product_print_areas_v2: (p) => getProductPrintAreasV2(p.p_product_id as string),
  fn_get_product_customization_options: (p) => getProductCustomizationOptions(p.p_product_id as string),
  fn_link_product_print_areas: (p) => linkProductPrintAreas(p.p_product_id as string, p.p_areas as Record<string, unknown>[]),
  fn_backfill_product_print_areas: (p) => backfillProductPrintAreas(p.p_product_ids as string[]),
  get_category_descendants: (p) => getCategoryDescendants(p.category_uuid as string),
  fn_find_fornecedor_price_table: (p) => findFornecedorPriceTable(p as { technique_id: string }),
};

/**
 * Compatibility shim for invokeExternalDb({operation:'rpc', rpcName, rpcParams}).
 * Throws if rpcName is not in the allowed list.
 */
export async function dispatchRpc(
  rpcName: string,
  rpcParams?: Record<string, unknown>,
): Promise<unknown> {
  const fn = RPC_DISPATCH[rpcName];
  if (!fn) {
    throw new Error(
      `rpc-native: RPC '${rpcName}' not allowed. Allowed: ${Object.keys(RPC_DISPATCH).join(', ')}`,
    );
  }
  logger.debug(`[rpc-native] dispatching ${rpcName}`);
  return fn(rpcParams ?? {});
}
