/**
 * Hook: Tabelas de Preço
 *
 * Responsável por: Busca e filtragem de tabelas de preço
 */
import { useQuery } from '@tanstack/react-query';
import { TABELAS_PRECO_QUERY_OPTIONS } from '@/lib/query-config';
import { supabase, resolveTable, handleQueryError } from '@/lib/supabase-direct';
import { rawToTabelaPrecoTecnica, transformRawToTabelas } from '@/lib/personalization';
import { TECNICAS_QUERY_KEYS } from '@/hooks/tecnicas/keys';
import type {
  TabelaPrecoTecnica,
  TabelaPrecoFiltros,
  CustomizationPriceTableRaw,
} from '@/types/tecnica-unificada';
import { logger } from '@/lib/logger';

/**
 * Lista de tabelas de preço com filtros
 */
export function useTabelasPreco(filtros?: TabelaPrecoFiltros) {
  return useQuery({
    queryKey: [...TECNICAS_QUERY_KEYS.tabelasPreco(), filtros],
    queryFn: async (): Promise<TabelaPrecoTecnica[]> => {
      let query = supabase
        .from(resolveTable('customization_price_tables'))
        .select('*')
        .order('table_code', { ascending: true })
        .limit(500);

      if (filtros?.apenasAtivas) {
        query = query.eq('is_active', true);
      }
      if (filtros?.tecnicaId) {
        query = query.eq('technique_id', filtros.tecnicaId);
      }
      if (filtros?.codigoTabela) {
        query = query.eq('table_code', filtros.codigoTabela);
      }
      if (filtros?.nomeTecnica) {
        query = query.eq('customization_type_name', filtros.nomeTecnica);
      }

      const { data, error } = await query;
      if (error) return handleQueryError('useTabelasPreco', 'customization_price_tables', error);
      const records = (data ?? []) as CustomizationPriceTableRaw[];

      let tabelas = transformRawToTabelas(records);

      // Filtro de max_colors pós-query
      if (filtros?.maxCores !== undefined) {
        tabelas = tabelas.filter((t) => t.maxCores === filtros.maxCores);
      }

      return tabelas;
    },
    ...TABELAS_PRECO_QUERY_OPTIONS,
  });
}

/**
 * Tabelas por nome da técnica
 */
export function useTabelasPorTecnica(nomeTecnica: string | undefined) {
  return useQuery({
    queryKey: TECNICAS_QUERY_KEYS.tabelasPorTecnica(nomeTecnica ?? ''),
    queryFn: async (): Promise<TabelaPrecoTecnica[]> => {
      if (!nomeTecnica) return [];

      const { data, error } = await supabase
        .from(resolveTable('customization_price_tables'))
        .select('*')
        .eq('customization_type_name', nomeTecnica)
        .eq('is_active', true)
        .order('max_colors', { ascending: true });
      if (error) return handleQueryError('useTabelasPreco', 'customization_price_tables', error);
      const records = (data ?? []) as CustomizationPriceTableRaw[];

      return transformRawToTabelas(records);
    },
    enabled: !!nomeTecnica,
    ...TABELAS_PRECO_QUERY_OPTIONS,
  });
}

/**
 * Tabela por código de opção
 */
export function useTabelaPorCodigo(codigoOpcao: string | undefined) {
  return useQuery({
    queryKey: TECNICAS_QUERY_KEYS.tabelaPorCodigo(codigoOpcao ?? ''),
    queryFn: async (): Promise<TabelaPrecoTecnica | null> => {
      if (!codigoOpcao) return null;

      const { data, error } = await supabase
        .from(resolveTable('customization_price_tables'))
        .select('*')
        .eq('table_code_option', codigoOpcao)
        .limit(1);
      if (error)
        return handleQueryError(
          'useTabelasPreco',
          'customization_price_tables',
          error,
        ) as unknown as null;
      const records = (data ?? []) as CustomizationPriceTableRaw[];

      const tabela = records[0];
      return tabela ? rawToTabelaPrecoTecnica(tabela) : null;
    },
    enabled: !!codigoOpcao,
    ...TABELAS_PRECO_QUERY_OPTIONS,
  });
}

/**
 * Lista de nomes de técnicas únicos (para filtros)
 */
export function useNomesTecnicasPreco() {
  return useQuery({
    queryKey: TECNICAS_QUERY_KEYS.nomesTecnicas(),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from(resolveTable('customization_price_tables'))
        .select('customization_type_name')
        .eq('is_active', true);
      if (error)
        return handleQueryError(
          'useTabelasPreco',
          'customization_price_tables',
          error,
        ) as unknown as string[];
      const records = (data ?? []) as { customization_type_name: string }[];

      const nomes = [...new Set(records.map((r) => r.customization_type_name))];
      return nomes.sort();
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Busca tabela adequada para técnica + cores + dimensões
 */
export async function buscarTabelaAdequada(
  nomeTecnica: string,
  cores: number,
  larguraCm?: number,
  alturaCm?: number,
): Promise<TabelaPrecoTecnica | null> {
  const { data, error } = await supabase
    .from(resolveTable('customization_price_tables'))
    .select('*')
    .eq('customization_type_name', nomeTecnica)
    .eq('is_active', true)
    .order('max_colors', { ascending: true });
  if (error) {
    handleQueryError('useTabelasPreco', 'customization_price_tables', error);
    return null;
  }
  const records = (data ?? []) as CustomizationPriceTableRaw[];

  const tabelas = transformRawToTabelas(records);

  // Encontrar tabela que comporta o número de cores
  let tabelaAdequada = tabelas.find((t) => t.maxCores !== null && t.maxCores >= cores);

  // Se não encontrou por cores, pegar a com mais cores disponível
  if (!tabelaAdequada && tabelas.length > 0) {
    tabelaAdequada = tabelas[tabelas.length - 1];
  }

  // Validar dimensões se fornecidas
  if (tabelaAdequada && larguraCm && alturaCm) {
    if (tabelaAdequada.larguraMaxCm && larguraCm > tabelaAdequada.larguraMaxCm) {
      logger.warn(`Largura ${larguraCm}cm excede máximo ${tabelaAdequada.larguraMaxCm}cm`);
    }
    if (tabelaAdequada.alturaMaxCm && alturaCm > tabelaAdequada.alturaMaxCm) {
      logger.warn(`Altura ${alturaCm}cm excede máximo ${tabelaAdequada.alturaMaxCm}cm`);
    }
  }

  return tabelaAdequada ?? null;
}
