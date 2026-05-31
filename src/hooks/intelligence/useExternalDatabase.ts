/**
 * External Database Hook - Ponto de entrada principal.
 *
 * MIGRADO (2026-05-31): Usa PostgREST direto via supabase.from() em vez do
 * bridge legado (invokeExternalDb). Aliases de tabela resolvidos via resolveTable().
 *
 * Mantém todas interfaces, tipos e assinaturas do hook inalterados para
 * compatibilidade com consumidores existentes.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

// Re-exportar tudo dos módulos para manter compatibilidade de imports
export * from '@/lib/external-db/types';
export * from '@/lib/external-db/tables';
export { extractFunctionErrorMessage } from '@/lib/external-db/invoke';

import type { ExternalTable } from '@/lib/external-db/tables';
import { extractFunctionErrorMessage } from '@/lib/external-db/invoke';
import { supabase, resolveTable, handleQueryError } from '@/lib/supabase-direct';
import { logger } from '@/lib/logger';
import type {
  ExternalProduct,
  ExternalProductImage,
  ExternalProductVariant,
  ExternalCategory,
  ExternalSupplier,
  ExternalSupplierColor,
  ExternalSupplierMaterial,
  ExternalSupplierAttributeDefinition,
  ExternalSupplierProductAttribute,
  ExternalProductSupplier,
  ExternalTechnique,
  ExternalPriceTable,
  ExternalCollection,
  ExternalTag,
  ExternalCompany,
  ExternalClientContact,
  ExternalOrganization,
  ExternalRamoAtividade,
  ExternalRamoAtividadeFilho,
  ExternalBusinessSector,
  ExternalMaterialGroup,
  ExternalMaterialType,
  ExternalColorGroup,
  ExternalColorVariation,
} from '@/lib/external-db/types';

// ============================================
// TIPOS INTERNOS DO HOOK
// ============================================

type Operation = 'select' | 'insert' | 'update' | 'delete';

interface QueryOptions {
  filters?: Record<string, unknown>;
  id?: string;
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

interface QueryResult<T> {
  records: T[];
  count: number | null;
}

interface ExternalDatabaseState<T> {
  data: T[];
  count: number | null;
  isLoading: boolean;
  error: string | null;
}

// ============================================
// HELPERS — PostgREST filter application
// ============================================

/**
 * Aplica filtros ao query builder do Supabase PostgREST.
 * Suporta:
 *  - Valores simples → .eq()
 *  - Strings PostgREST: 'ilike.%X%' → .ilike(), 'gte.X' → .gte(), 'lte.X' → .lte(),
 *    'gt.X' → .gt(), 'lt.X' → .lt(), 'neq.X' → .neq(), 'in.(a,b)' → .in()
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, filters: Record<string, unknown>): any {
  let q = query;
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;

    if (typeof value === 'string') {
      // PostgREST operator strings
      const ilMatch = value.match(/^ilike\.(.+)$/i);
      if (ilMatch) {
        q = q.ilike(key, ilMatch[1]);
        continue;
      }

      const gteMatch = value.match(/^gte\.(.+)$/);
      if (gteMatch) {
        q = q.gte(key, gteMatch[1]);
        continue;
      }

      const lteMatch = value.match(/^lte\.(.+)$/);
      if (lteMatch) {
        q = q.lte(key, lteMatch[1]);
        continue;
      }

      const gtMatch = value.match(/^gt\.(.+)$/);
      if (gtMatch) {
        q = q.gt(key, gtMatch[1]);
        continue;
      }

      const ltMatch = value.match(/^lt\.(.+)$/);
      if (ltMatch) {
        q = q.lt(key, ltMatch[1]);
        continue;
      }

      const neqMatch = value.match(/^neq\.(.+)$/);
      if (neqMatch) {
        q = q.neq(key, neqMatch[1]);
        continue;
      }

      const inMatch = value.match(/^in\.\((.+)\)$/);
      if (inMatch) {
        q = q.in(key, inMatch[1].split(','));
        continue;
      }
    }

    // Valor simples (string sem operador, number, boolean, etc.)
    q = q.eq(key, value);
  }
  return q;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useExternalDatabase<T = Record<string, unknown>>(tableName: ExternalTable) {
  if (!tableName || typeof tableName !== 'string') {
    console.error(`[useExternalDatabase] Invalid tableName: ${JSON.stringify(tableName)}`);
  }

  const resolved = resolveTable(tableName);

  const [state, setState] = useState<ExternalDatabaseState<T>>({
    data: [],
    count: null,
    isLoading: false,
    error: null,
  });
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const invoke = useCallback(
    async (
      operation: Operation,
      options?: QueryOptions & { data?: Partial<T> },
    ): Promise<T | QueryResult<T> | null> => {
      if (isMountedRef.current) {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));
      }

      try {
        // ------ SELECT ------
        if (operation === 'select') {
          let query = supabase.from(resolved).select(options?.select || '*', { count: 'exact' });

          // Filtro por id
          if (options?.id) {
            query = query.eq('id', options.id);
          }

          // Filtros adicionais
          if (options?.filters) {
            query = applyFilters(query, options.filters);
          }

          // Ordenação
          if (options?.orderBy) {
            query = query.order(options.orderBy.column, {
              ascending: options.orderBy.ascending ?? true,
            });
          }

          // Paginação
          if (options?.limit !== undefined) {
            const from = options?.offset ?? 0;
            query = query.range(from, from + options.limit - 1);
          }

          const { data, error, count } = await query;

          if (error) {
            const fallback = handleQueryError('useExternalDatabase', resolved, error);
            if (isMountedRef.current) {
              setState((prev) => ({
                ...prev,
                data: fallback as T[],
                count: 0,
                isLoading: false,
              }));
            }
            return { records: fallback as T[], count: 0 };
          }

          const records = (data ?? []) as T[];
          if (isMountedRef.current) {
            setState((prev) => ({
              ...prev,
              data: records,
              count: count,
              isLoading: false,
            }));
          }
          return { records, count } as QueryResult<T>;
        }

        // ------ INSERT ------
        if (operation === 'insert') {
          const { data, error } = await supabase
            .from(resolved)
            .insert(options?.data as Record<string, unknown>)
            .select()
            .single();

          if (error) {
            throw new Error(error.message);
          }

          if (isMountedRef.current) {
            setState((prev) => ({ ...prev, isLoading: false }));
          }
          return (data ?? null) as T;
        }

        // ------ UPDATE ------
        if (operation === 'update') {
          if (!options?.id) throw new Error('Update requires an id');

          const { data, error } = await supabase
            .from(resolved)
            .update(options.data as Record<string, unknown>)
            .eq('id', options.id)
            .select()
            .single();

          if (error) {
            throw new Error(error.message);
          }

          if (isMountedRef.current) {
            setState((prev) => ({ ...prev, isLoading: false }));
          }
          return (data ?? null) as T;
        }

        // ------ DELETE ------
        if (operation === 'delete') {
          if (!options?.id) throw new Error('Delete requires an id');

          const { error } = await supabase.from(resolved).delete().eq('id', options.id);

          if (error) {
            throw new Error(error.message);
          }

          if (isMountedRef.current) {
            setState((prev) => ({ ...prev, isLoading: false }));
          }
          return {} as T;
        }

        return null;
      } catch (err) {
        const errorMessage = await extractFunctionErrorMessage(err);
        if (isMountedRef.current) {
          setState((prev) => ({ ...prev, error: errorMessage, isLoading: false }));
          toast.error(errorMessage);
        }
        return null;
      }
    },
    [resolved],
  );

  const fetchAll = useCallback(
    async (options?: Omit<QueryOptions, 'id'>) => {
      return invoke('select', options) as Promise<QueryResult<T> | null>;
    },
    [invoke],
  );

  const fetchOne = useCallback(
    async (id: string, select?: string) => {
      const result = await invoke('select', { id, select, limit: 1 });
      if (result && typeof result === 'object' && 'records' in result) {
        return (result as QueryResult<T>).records[0] || null;
      }
      return null;
    },
    [invoke],
  );

  const create = useCallback(
    async (data: Partial<T>) => {
      const result = await invoke('insert', { data });
      if (!result) return null;

      toast.success('Registro criado com sucesso!');
      return result as T;
    },
    [invoke],
  );

  const update = useCallback(
    async (id: string, data: Partial<T>) => {
      const result = await invoke('update', { id, data });
      if (!result) return null;

      toast.success('Registro atualizado com sucesso!');
      return result as T;
    },
    [invoke],
  );

  const remove = useCallback(
    async (id: string) => {
      const result = await invoke('delete', { id });
      if (result) {
        toast.success('Registro excluído com sucesso!');
        return true;
      }
      return false;
    },
    [invoke],
  );

  const refetch = useCallback(
    async (options?: Omit<QueryOptions, 'id'>) => {
      return fetchAll(options);
    },
    [fetchAll],
  );

  return {
    ...state,
    fetchAll,
    fetchOne,
    create,
    update,
    remove,
    refetch,
    invoke,
  };
}

// ============================================
// HOOKS ESPECÍFICOS POR RECURSO
// ============================================

export function useExternalProducts() {
  return useExternalDatabase<ExternalProduct>('products');
}

/** @deprecated Dead code — 0 consumers. Tabela real: product_images (acessível via supabase.from) */
export function useExternalProductImages() {
  return useExternalDatabase<ExternalProductImage>('product_images');
}

/** @deprecated Dead code — 0 consumers. Tabela real: product_variants (acessível via supabase.from) */
export function useExternalProductVariants() {
  return useExternalDatabase<ExternalProductVariant>('product_variants');
}

export function useExternalCategories() {
  return useExternalDatabase<ExternalCategory>('categories');
}

export function useExternalSuppliers() {
  return useExternalDatabase<ExternalSupplier>('suppliers');
}

/** @deprecated Dead code — 0 consumers. Tabela real: supplier_colors (acessível via supabase.from) */
export function useExternalSupplierColors() {
  return useExternalDatabase<ExternalSupplierColor>('supplier_colors');
}

/** @deprecated Dead code — 0 consumers. Tabela real: supplier_materials (acessível via supabase.from) */
export function useExternalSupplierMaterials() {
  return useExternalDatabase<ExternalSupplierMaterial>('supplier_materials');
}

/** @deprecated Dead code — 0 consumers. Tabela real: supplier_attribute_definitions (acessível via supabase.from) */
export function useExternalSupplierAttributeDefinitions() {
  return useExternalDatabase<ExternalSupplierAttributeDefinition>('supplier_attribute_definitions');
}

/** @deprecated Dead code — 0 consumers. Tabela `supplier_product_attributes` NÃO EXISTE no DB. */
export function useExternalSupplierProductAttributes() {
  return useExternalDatabase<ExternalSupplierProductAttribute>('supplier_product_attributes');
}

/** @deprecated Dead code — 0 consumers. Tabela `product_suppliers` NÃO EXISTE no DB. */
export function useExternalProductSuppliers() {
  return useExternalDatabase<ExternalProductSupplier>('product_suppliers');
}

export function useExternalTechniques() {
  return useExternalDatabase<ExternalTechnique>('personalization_techniques');
}

/** @deprecated Dead code — 0 consumers. Use tabela_preco_gravacao_oficial via invokeExternalDb. */
export function useExternalPriceTables() {
  return useExternalDatabase<ExternalPriceTable>('customization_price_tables');
}

export function useExternalCollections() {
  return useExternalDatabase<ExternalCollection>('collections');
}

/** @deprecated Dead code — 0 consumers. Tabela real: tags (acessível via supabase.from) */
export function useExternalTags() {
  return useExternalDatabase<ExternalTag>('tags');
}

// Empresas/Clientes — MIGRADO para CRM externo
export function useExternalCompanies() {
  logger.warn("[DEPRECATED] useExternalCompanies() → use useCrmCompanies() from '@/hooks/crm'");
  return useExternalDatabase<ExternalCompany>('companies');
}

export function useExternalClientContacts() {
  return useExternalDatabase<ExternalClientContact>('client_contacts');
}

export function useExternalOrganizations() {
  return useExternalDatabase<ExternalOrganization>('organizations');
}

export function useExternalRamosAtividade() {
  return useExternalDatabase<ExternalRamoAtividade>('ramo_atividade');
}

export function useExternalRamosAtividadeFilho() {
  return useExternalDatabase<ExternalRamoAtividadeFilho>('ramo_atividade_filho');
}

/**
 * @deprecated business_sectors não está exposta no PostgREST do BD externo (PGRST205).
 * Use useExternalRamosAtividade() para dados de segmentos/público-alvo.
 * Mantido com fallback vazio para evitar quebras em código futuro.
 */
export function useExternalBusinessSectors() {
  return {
    data: [] as ExternalBusinessSector[],
    isLoading: false,
    error: null,
    refetch: () => Promise.resolve({ data: [] as ExternalBusinessSector[], error: null }),
  };
}

export function useExternalMaterialGroups() {
  return useExternalDatabase<ExternalMaterialGroup>('material_groups');
}

export function useExternalMaterialTypes() {
  return useExternalDatabase<ExternalMaterialType>('material_types');
}

export function useExternalColorGroups() {
  return useExternalDatabase<ExternalColorGroup>('color_groups');
}

export function useExternalColorVariations() {
  return useExternalDatabase<ExternalColorVariation>('color_variations');
}
