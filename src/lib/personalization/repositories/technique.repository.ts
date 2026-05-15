/**
 * Repository: Técnicas de Personalização
 * 
 * ============================================
 * IMPORTANTE: USA SOMENTE O BD EXTERNO PROMOBRIND!
 * Tabelas: tecnica_gravacao, tecnica_gravacao_variante
 * NÃO existe BD local para técnicas.
 * ============================================
 */

import { supabase } from '@/integrations/supabase/client';
import type { TecnicaUnificada } from '@/types/tecnica-unificada';

// ============================================
// TYPES
// ============================================

export interface TechniqueFilters {
  isActive?: boolean;
  category?: string;
  requiresColors?: boolean;
  priceByArea?: boolean;
  priceByStitches?: boolean;
  appliesToCurved?: boolean;
  search?: string;
}

export interface TechniqueOrderBy {
  column: 'name' | 'code' | 'display_order' | 'created_at';
  ascending?: boolean;
}

export interface TechniqueQueryOptions {
  filters?: TechniqueFilters;
  orderBy?: TechniqueOrderBy;
  limit?: number;
  offset?: number;
}

// Tipo do BD externo: tecnica_gravacao
interface TecnicaGravacaoExterno {
  id: string;
  codigo: string;
  codigo_interno?: string;
  nome: string;
  slug?: string;
  descricao?: string;
  permite_cores: boolean;
  max_cores?: string;
  cobra_por_cor: boolean;
  cobra_por_area: boolean;
  cobra_por_pontos: boolean;
  requer_setup: boolean;
  tipo_setup?: string;
  tempo_producao_dias?: number;
  ordem_exibicao?: number;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// TRANSFORMER
// ============================================

function externalToTecnicaUnificada(row: TecnicaGravacaoExterno): TecnicaUnificada {
  return {
    id: row.id,
    codigo: row.codigo || '',
    codigoFornecedor: row.codigo_interno || null,
    codigoStricker: null,
    nome: row.nome,
    descricao: row.descricao || null,
    categoria: 'geral',
    icone: null,
    permiteCores: row.permite_cores ?? true,
    minCores: 1,
    maxCores: parseInt(row.max_cores || '12', 10),
    precoPorCor: row.cobra_por_cor ?? false,
    precoCorExtra: 0,
    precoPorArea: row.cobra_por_area ?? false,
    precoPorPontos: row.cobra_por_pontos ?? false,
    areaMinimaCm2: null,
    areaMaximaCm2: null,
    pontosMaximos: null,
    custoSetup: 0,
    custoManuseio: 0,
    multiplicadorCusto: 1,
    quantidadeMinima: null,
    prazoEstimado: row.tempo_producao_dias || null,
    aplicaSuperficieCurva: false,
    promptSuffix: null,
    ativo: row.ativo ?? true,
    ordemExibicao: row.ordem_exibicao || 0,
    fonte: 'externo',
    criadoEm: row.created_at || '',
    atualizadoEm: row.updated_at || '',
  };
}

// ============================================
// REPOSITORY - BD EXTERNO VIA EDGE FUNCTION
// ============================================

/**
 * Busca todas as técnicas do BD EXTERNO com filtros opcionais
 */
export async function findAll(options: TechniqueQueryOptions = {}): Promise<TecnicaUnificada[]> {
  const { filters, orderBy, limit = 100 } = options;

  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table: 'tecnica_gravacao',
      operation: 'select',
      filters: filters?.isActive !== undefined ? { ativo: filters.isActive } : undefined,
      orderBy: orderBy 
        ? { column: orderBy.column === 'name' ? 'nome' : orderBy.column === 'code' ? 'codigo' : 'ordem_exibicao', ascending: orderBy.ascending }
        : { column: 'ordem_exibicao', ascending: true },
      limit,
    },
  });

  if (error) {
    console.error('Repository findAll error:', error);
    throw error;
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Erro ao buscar técnicas');
  }

  let tecnicas = (data.data?.records || []).map(externalToTecnicaUnificada);

  // Filtros pós-query
  if (filters?.search) {
    const search = filters.search.toLowerCase();
    tecnicas = tecnicas.filter(t =>
      t.nome.toLowerCase().includes(search) ||
      t.codigo.toLowerCase().includes(search) ||
      t.descricao?.toLowerCase().includes(search)
    );
  }

  return tecnicas;
}

/**
 * Busca técnica por ID do BD EXTERNO
 */
export async function findById(id: string): Promise<TecnicaUnificada | null> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table: 'tecnica_gravacao',
      operation: 'select',
      id,
      limit: 1,
    },
  });

  if (error) {
    console.error('Repository findById error:', error);
    throw error;
  }

  const records = data?.data?.records || [];
  return records.length > 0 ? externalToTecnicaUnificada(records[0]) : null;
}

/**
 * Busca técnica por código do BD EXTERNO
 */
export async function findByCode(code: string): Promise<TecnicaUnificada | null> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table: 'tecnica_gravacao',
      operation: 'select',
      filters: { codigo: code },
      limit: 1,
    },
  });

  if (error) {
    console.error('Repository findByCode error:', error);
    throw error;
  }

  const records = data?.data?.records || [];
  return records.length > 0 ? externalToTecnicaUnificada(records[0]) : null;
}

/**
 * Busca técnicas ativas do BD EXTERNO (resumo para dropdowns)
 */
export async function findActiveForDropdown(): Promise<Pick<TecnicaUnificada, 'id' | 'codigo' | 'nome' | 'categoria'>[]> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table: 'tecnica_gravacao',
      operation: 'select',
      filters: { ativo: true },
      orderBy: { column: 'nome', ascending: true },
      limit: 100,
    },
  });

  if (error) {
    console.error('Repository findActiveForDropdown error:', error);
    throw error;
  }

  return (data?.data?.records || []).map((row: TecnicaGravacaoExterno) => ({
    id: row.id,
    codigo: row.codigo || '',
    nome: row.nome,
    categoria: 'geral',
  }));
}

/**
 * Lista categorias únicas (BD externo não tem categorias separadas)
 */
export async function findCategories(): Promise<string[]> {
  return ['geral'];
}

/**
 * Cria nova técnica no BD EXTERNO
 */
export async function create(data: { 
  nome: string; 
  codigo?: string; 
  descricao?: string;
  permite_cores?: boolean;
  max_cores?: string;
  cobra_por_cor?: boolean;
  cobra_por_area?: boolean;
  cobra_por_pontos?: boolean;
  tempo_producao_dias?: number;
  ativo?: boolean;
}): Promise<void> {
  const { error } = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table: 'tecnica_gravacao',
      operation: 'insert',
      data: {
        ...data,
        ativo: data.ativo ?? true,
      },
    },
  });

  if (error) {
    console.error('Repository create error:', error);
    throw error;
  }
}

/**
 * Atualiza técnica existente no BD EXTERNO
 */
export async function update(id: string, data: Partial<{
  nome: string;
  codigo: string;
  descricao: string;
  permite_cores: boolean;
  max_cores: string;
  cobra_por_cor: boolean;
  cobra_por_area: boolean;
  cobra_por_pontos: boolean;
  tempo_producao_dias: number;
  ativo: boolean;
}>): Promise<void> {
  const { error } = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table: 'tecnica_gravacao',
      operation: 'update',
      id,
      data,
    },
  });

  if (error) {
    console.error('Repository update error:', error);
    throw error;
  }
}

/**
 * Alterna status ativo/inativo no BD EXTERNO
 */
export async function toggleActive(id: string, isActive: boolean): Promise<void> {
  await update(id, { ativo: isActive });
}

/**
 * Remove técnica do BD EXTERNO
 */
export async function remove(id: string): Promise<void> {
  const { error } = await supabase.functions.invoke('external-db-bridge', {
    body: {
      table: 'tecnica_gravacao',
      operation: 'delete',
      id,
    },
  });

  if (error) {
    console.error('Repository remove error:', error);
    throw error;
  }
}

// ============================================
// EXPORTS
// ============================================

export const TechniqueRepository = {
  findAll,
  findById,
  findByCode,
  findActiveForDropdown,
  findCategories,
  create,
  update,
  toggleActive,
  remove,
};

export default TechniqueRepository;
