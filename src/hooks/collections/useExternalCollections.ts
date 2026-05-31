/**
 * Hook para sincronizar coleções com o BD externo (Promobrind)
 * Tabelas: collections, collection_products
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, resolveTable, handleQueryError } from '@/lib/supabase-direct';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/security/sanitize-error';

// Interface que reflete a estrutura do BD externo
export interface ExternalCollection {
  id: string;
  name: string;
  slug?: string;
  description?: string | null;
  image_url?: string | null;
  banner_url?: string | null;
  color?: string | null;
  icon?: string | null;
  is_active?: boolean;
  is_featured?: boolean;
  display_order?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ExternalCollectionProduct {
  id: string;
  collection_id: string;
  product_id: string;
  display_order?: number;
  created_at?: string;
}

const QUERY_KEY = 'external-collections';

/**
 * Busca coleções do BD externo
 */
export function useExternalCollections() {
  return useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(resolveTable('collections'))
        .select('*')
        .limit(100);
      if (error) return handleQueryError('useExternalCollections', 'collections', error);
      const records = (data ?? []) as ExternalCollection[];
      // Filtrar no cliente se o campo existir
      return records.filter((c) => c.is_active !== false);
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

/**
 * Busca produtos de uma coleção específica
 */
export function useExternalCollectionProducts(collectionId: string | null) {
  return useQuery({
    queryKey: [QUERY_KEY, 'products', collectionId],
    queryFn: async () => {
      if (!collectionId) return [];

      const { data, error } = await supabase
        .from(resolveTable('collection_products'))
        .select('*')
        .eq('collection_id', collectionId)
        .order('display_order', { ascending: true })
        .limit(500);
      if (error) return handleQueryError('useExternalCollections', 'collection_products', error);
      return (data ?? []) as ExternalCollectionProduct[];
    },
    enabled: !!collectionId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Busca contagem de produtos para todas as coleções externas
 */
export function useExternalCollectionProductCounts(collectionIds: string[]) {
  return useQuery({
    queryKey: [QUERY_KEY, 'product-counts', collectionIds],
    queryFn: async () => {
      if (collectionIds.length === 0) return new Map<string, number>();

      const { data, error } = await supabase
        .from(resolveTable('collection_products'))
        .select('collection_id,product_id')
        .in('collection_id', collectionIds)
        .limit(5000);
      if (error) return handleQueryError('useExternalCollections', 'collection_products', error);
      const records = (data ?? []) as Pick<
        ExternalCollectionProduct,
        'collection_id' | 'product_id'
      >[];

      const counts = new Map<string, number>();
      for (const r of records) {
        counts.set(r.collection_id, (counts.get(r.collection_id) || 0) + 1);
      }
      return counts;
    },
    enabled: collectionIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Mutations para gerenciar coleções
 */
export function useExternalCollectionMutations() {
  const queryClient = useQueryClient();

  const createCollection = useMutation({
    mutationFn: async (payload: Partial<ExternalCollection>) => {
      const slug =
        payload.name
          ?.toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '') || `col-${Date.now()}`;
      const { data, error } = await supabase
        .from(resolveTable('collections'))
        .insert({ ...payload, slug, is_active: true })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as ExternalCollection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Coleção criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar coleção', { description: sanitizeError(error) });
    },
  });

  const updateCollection = useMutation({
    mutationFn: async ({
      id,
      data: payload,
    }: {
      id: string;
      data: Partial<ExternalCollection>;
    }) => {
      const { data, error } = await supabase
        .from(resolveTable('collections'))
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as ExternalCollection;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Coleção atualizada!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar', { description: sanitizeError(error) });
    },
  });

  const deleteCollection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(resolveTable('collections')).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Coleção excluída!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir', { description: sanitizeError(error) });
    },
  });

  const addProductToCollection = useMutation({
    mutationFn: async ({
      collectionId,
      productId,
    }: {
      collectionId: string;
      productId: string;
    }) => {
      const { data, error } = await supabase
        .from(resolveTable('collection_products'))
        .insert({ collection_id: collectionId, product_id: productId })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as ExternalCollectionProduct;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'products', variables.collectionId] });
      toast.success('Produto adicionado à coleção!');
    },
    onError: (error) => {
      toast.error('Operação não pôde ser concluída', { description: sanitizeError(error) });
    },
  });

  const removeProductFromCollection = useMutation({
    mutationFn: async (relationId: string) => {
      const { error } = await supabase
        .from(resolveTable('collection_products'))
        .delete()
        .eq('id', relationId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Produto removido da coleção!');
    },
    onError: (error) => {
      toast.error('Operação não pôde ser concluída', { description: sanitizeError(error) });
    },
  });

  return {
    createCollection,
    updateCollection,
    deleteCollection,
    addProductToCollection,
    removeProductFromCollection,
  };
}

/**
 * Hook combinado para usar coleções do BD externo
 */
export function useExternalCollectionsManager() {
  const { data: collections = [], isLoading, error, refetch } = useExternalCollections();
  const mutations = useExternalCollectionMutations();

  return {
    collections,
    isLoading,
    error,
    refetch,
    ...mutations,
  };
}
