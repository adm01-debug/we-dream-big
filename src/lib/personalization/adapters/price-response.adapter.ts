/**
 * Price response adapter — Tradutor unificado de payloads do RPC
 * `fn_get_customization_price` para o tipo canônico `CustomizationPriceFlat`.
 *
 * Suporta 3 formatos:
 *   1. v5.9-nested  — `{ area: {...}, tabela: {...}, faixa: {...}, custos: {...}, precos: {...} }`
 *   2. v6.x-flat    — payload achatado em PT (`preco_unitario`, `valor_gravacao`, ...)
 *   3. v7-new       — payload hipotético em EN (`unit_price`, `subtotal_pieces`, ...)
 *
 * O front continua falando o "idioma canônico". Quando o back mudar nomes
 * de colunas, basta atualizar o `RENAME_MAP_V7` aqui — nenhum consumidor
 * precisa ser tocado.
 */

import type { CustomizationPriceFlat } from '@/hooks/simulation';
import {
  detectPriceSchema,
  warnUnknownSchemaOnce,
  type PriceSchemaVersion,
} from './schema-detection';
import { validateRpcPayload } from '@/lib/personalization/rpc-validator';
import { PRICE_CONTRACT } from '@/lib/personalization/rpc-contracts';

// ============================================
// MAPA DE RENOMEAÇÃO v7 (futuro)
// ============================================

/**
 * Mapeamento de nomes futuros (EN) → nomes atuais (PT).
 * Aplicado ANTES do parser flat para que o mesmo código atenda ambos.
 * Evolui conforme o back migra colunas.
 */
const RENAME_MAP_V7: Record<string, string> = {
  unit_price: 'preco_unitario',
  unit_price_per_piece: 'preco_por_unidade',
  subtotal_pieces: 'valor_gravacao',
  total_charged: 'total_cobrado',
  setup_total_value: 'setup_total',
  table_code: 'tabela',
  table_name: 'nome_tabela',
  technique_group: 'grupo_tecnica',
  quantity: 'quantidade',
  num_colors: 'num_cores',
  production_days: 'prazo_dias',
};

function normalizeV7Aliases(resp: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...resp };
  for (const [alias, canonical] of Object.entries(RENAME_MAP_V7)) {
    if (alias in out && !(canonical in out)) {
      out[canonical] = out[alias];
    }
  }
  // Markup nested object — também aceita renomeação
  const markup = out.markup as Record<string, unknown> | undefined;
  if (markup && typeof markup === 'object') {
    if ('unit_cost' in markup && !('custo_unitario' in markup))
      markup.custo_unitario = markup.unit_cost;
    if ('setup_cost_table' in markup && !('custo_setup_tabela' in markup))
      markup.custo_setup_tabela = markup.setup_cost_table;
    if ('markup_percent' in markup && !('markup_pct' in markup))
      markup.markup_pct = markup.markup_percent;
  }
  // Detalhes nested
  const detalhes = out.detalhes as Record<string, unknown> | undefined;
  if (detalhes && typeof detalhes === 'object') {
    if ('charges_per_color' in detalhes && !('cobra_por_cor' in detalhes))
      detalhes.cobra_por_cor = detalhes.charges_per_color;
    if ('max_colors' in detalhes && !('max_cores' in detalhes))
      detalhes.max_cores = detalhes.max_colors;
  }
  // Faixa nested
  const faixa = out.faixa as Record<string, unknown> | undefined;
  if (faixa && typeof faixa === 'object') {
    if ('min_qty' in faixa && !('qtd_min' in faixa)) faixa.qtd_min = faixa.min_qty;
    if ('max_qty' in faixa && !('qtd_max' in faixa)) faixa.qtd_max = faixa.max_qty;
    if ('production_days' in faixa && !('prazo_dias' in faixa))
      faixa.prazo_dias = faixa.production_days;
  }
  return out;
}

// ============================================
// PARSERS POR FORMATO
// ============================================

type AnyRec = Record<string, unknown>;

function parseNested(resp: AnyRec): CustomizationPriceFlat {
  const area = (resp.area ?? {}) as AnyRec;
  const tabela = (resp.tabela ?? {}) as AnyRec;
  const parametros = (resp.parametros ?? {}) as AnyRec;
  const precos = (resp.precos ?? {}) as AnyRec;
  const custos = (resp.custos ?? {}) as AnyRec;
  const faixa = (resp.faixa ?? {}) as AnyRec;
  const tabelaCodigo = (tabela.codigo_tabela as string | undefined) ?? '';
  return {
    success: !!resp.success,
    area_id: (area.id as string | undefined) ?? '',
    area_code: (area.code as string | undefined) ?? '',
    area_name: (area.name as string | undefined) ?? '',
    tabela_id: (tabela.id as string | undefined) ?? '',
    tabela_codigo: tabelaCodigo,
    tabela_codigo_curto: tabelaCodigo.split('-')[0] || tabelaCodigo,
    technique: (tabela.nome as string | undefined) ?? '',
    grupo_tecnica: (tabela.grupo_tecnica as string | undefined) ?? '',
    codigo_orcamento: (resp.codigo_orcamento as string | undefined) ?? '',
    quantity: (parametros.quantidade as number | undefined) ?? 0,
    num_cores: (parametros.num_cores as number | undefined) ?? 1,
    unit_price: (precos.preco_unitario_final as number | undefined) ?? 0,
    subtotal_pecas: (precos.subtotal_pecas as number | undefined) ?? 0,
    faturamento_minimo_gravacao: (precos.faturamento_minimo_gravacao as number | undefined) ?? 0,
    minimum_applied: (precos.aplica_minimo as boolean | undefined) ?? false,
    total_price: (precos.total_final as number | undefined) ?? 0,
    cost_base_unit: (custos.custo_base_unitario as number | undefined) ?? 0,
    cost_unit_total: (custos.custo_unitario_total as number | undefined) ?? 0,
    cost_setup: (custos.custo_setup_base as number | undefined) ?? 0,
    markup_percent: (precos.markup_percent as number | undefined) ?? 0,
    margin_percent: (precos.markup_percent as number | undefined) ?? 0,
    price_by_color: (tabela.cobra_por_cor as boolean | undefined) ?? false,
    max_cores: (tabela.max_cores as number | undefined) ?? 1,
    production_days: (faixa.prazo_dias as number | null | undefined) ?? null,
    tier_used: (faixa.ordem as number | undefined) ?? 0,
    tier_min_qty: (faixa.quantidade_minima as number | undefined) ?? 0,
    tier_max_qty: (faixa.quantidade_maxima as number | undefined) ?? 0,
    redirected_from: resp.redirected_from as string | undefined,
    redirected_to: resp.redirected_to as string | undefined,
  };
}

function parseFlat(resp: AnyRec): CustomizationPriceFlat {
  const markup = (resp.markup ?? {}) as AnyRec;
  const detalhes = (resp.detalhes ?? {}) as AnyRec;
  const faixa = (resp.faixa ?? {}) as AnyRec;
  const tabelaCode = (resp.tabela as string | undefined) ?? '';
  const unitPrice =
    (resp.preco_unitario as number | undefined) ??
    (resp.preco_por_unidade as number | undefined) ??
    0;
  const quantidade = (resp.quantidade as number | undefined) ?? 0;
  const valorGravacao = (resp.valor_gravacao as number | undefined) ?? unitPrice * quantidade;
  return {
    success: (resp.success as boolean | undefined) ?? true,
    area_id: (resp.area_id as string | undefined) ?? '',
    area_code: (resp.area_code as string | undefined) ?? tabelaCode,
    area_name: (resp.nome_tabela as string | undefined) ?? '',
    tabela_id: (resp.tabela_id as string | undefined) ?? '',
    tabela_codigo: tabelaCode,
    tabela_codigo_curto: tabelaCode.split('-')[0] || tabelaCode,
    technique: (resp.nome_tabela as string | undefined) ?? '',
    grupo_tecnica: (resp.grupo_tecnica as string | undefined) ?? '',
    codigo_orcamento:
      (resp.codigo_orcamento as string | undefined) ?? `${tabelaCode}-${quantidade}`,
    quantity: quantidade,
    num_cores: (resp.num_cores as number | undefined) ?? 1,
    unit_price: unitPrice,
    subtotal_pecas: valorGravacao,
    faturamento_minimo_gravacao:
      (resp.setup_total as number | undefined) ??
      (markup.custo_setup_tabela as number | undefined) ??
      0,
    minimum_applied:
      ((resp.setup_total as number | undefined) ?? 0) >
      ((resp.valor_gravacao as number | undefined) ?? 0),
    total_price:
      (resp.total_cobrado as number | undefined) ??
      (resp.valor_gravacao as number | undefined) ??
      0,
    cost_base_unit: (markup.custo_unitario as number | undefined) ?? 0,
    cost_unit_total: (markup.custo_unitario as number | undefined) ?? 0,
    cost_setup: (markup.custo_setup_tabela as number | undefined) ?? 0,
    markup_percent: (markup.markup_pct as number | undefined) ?? 0,
    margin_percent: (markup.markup_pct as number | undefined) ?? 0,
    price_by_color: (detalhes.cobra_por_cor as boolean | undefined) ?? false,
    max_cores: (detalhes.max_cores as number | undefined) ?? 1,
    production_days:
      (faixa.prazo_dias as number | null | undefined) ??
      (resp.prazo_dias as number | null | undefined) ??
      null,
    tier_used: faixa.faixa_id ? 1 : 0,
    tier_min_qty: (faixa.qtd_min as number | undefined) ?? 0,
    tier_max_qty: (faixa.qtd_max as number | undefined) ?? 0,
    redirected_from: resp.redirected_from as string | undefined,
    redirected_to: resp.redirected_to as string | undefined,
  };
}

// ============================================
// API PÚBLICA
// ============================================

export interface AdaptResult {
  flat: CustomizationPriceFlat;
  schemaVersion: PriceSchemaVersion;
}

/**
 * Adapta qualquer payload conhecido para o tipo canônico.
 * Retorna também a versão detectada (útil para debug/telemetria).
 */
export function adaptPriceResponseWithMeta(
  resp: Record<string, unknown> | null | undefined,
): AdaptResult {
  if (!resp) {
    return { flat: parseFlat({}), schemaVersion: 'unknown' };
  }
  // Validação observacional do payload bruto (apenas formatos não-nested)
  if (!('area' in resp)) {
    validateRpcPayload(PRICE_CONTRACT, resp);
  }
  const version = detectPriceSchema(resp);
  switch (version) {
    case 'v5.9-nested':
      return { flat: parseNested(resp as AnyRec), schemaVersion: version };
    case 'v6.x-flat':
      return { flat: parseFlat(resp as AnyRec), schemaVersion: version };
    case 'v7-new':
      return { flat: parseFlat(normalizeV7Aliases(resp) as AnyRec), schemaVersion: version };
    default: {
      warnUnknownSchemaOnce('price-response', resp);
      return { flat: parseFlat(resp as AnyRec), schemaVersion: 'unknown' };
    }
  }
}

/**
 * Versão simplificada — devolve apenas o flat canônico.
 * É a função que os consumidores devem importar.
 */
export function adaptPriceResponse(
  resp: Record<string, unknown> | null | undefined,
): CustomizationPriceFlat {
  return adaptPriceResponseWithMeta(resp).flat;
}
