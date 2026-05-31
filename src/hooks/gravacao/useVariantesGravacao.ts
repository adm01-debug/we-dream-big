// Hook CRUD para Variantes de Técnicas de Gravação (via Supabase PostgREST)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, resolveTable, handleQueryError } from '@/lib/supabase-direct';
import type { TecnicaGravacaoVariante, VarianteFormData } from '@/types/gravacao-database';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/security/sanitize-error';

const QUERY_KEY = 'variantes-gravacao';
const TABLE = 'tecnica_gravacao_variante';

const generateSlug = (nome: string): string => {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export function useVariantesGravacao(tecnicaId?: string) {
  const queryClient = useQueryClient();

  const variantesQuery = useQuery({
    queryKey: [QUERY_KEY, tecnicaId],
    queryFn: async (): Promise<TecnicaGravacaoVariante[]> => {
      let query = supabase
        .from(resolveTable(TABLE))
        .select('*')
        .order('ordem_exibicao', { ascending: true });

      if (tecnicaId) {
        query = query.eq('tecnica_gravacao_id', tecnicaId);
      }

      const { data, error } = await query;
      if (error) return handleQueryError('useVariantesGravacao', TABLE, error);
      return (data ?? []) as TecnicaGravacaoVariante[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (formData: VarianteFormData): Promise<TecnicaGravacaoVariante> => {
      const slug = generateSlug(formData.nome);
      const { data, error } = await supabase
        .from(resolveTable(TABLE))
        .insert({ ...formData, slug })
        .select()
        .single();
      if (error) throw new Error(`[useVariantesGravacao] Insert error: ${error.message}`);
      return data as TecnicaGravacaoVariante;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['tecnicas-gravacao'] });
      toast.success('Variante criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<VarianteFormData> & { id: string }): Promise<TecnicaGravacaoVariante> => {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.nome) {
        updateData.slug = generateSlug(updates.nome);
      }
      const { data, error } = await supabase
        .from(resolveTable(TABLE))
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(`[useVariantesGravacao] Update error: ${error.message}`);
      return data as TecnicaGravacaoVariante;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Variante atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from(resolveTable(TABLE)).delete().eq('id', id);
      if (error) throw new Error(`[useVariantesGravacao] Delete error: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['tecnicas-gravacao'] });
      toast.success('Variante excluída com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }): Promise<void> => {
      const { error } = await supabase
        .from(resolveTable(TABLE))
        .update({ ativo })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(`[useVariantesGravacao] Toggle status error: ${error.message}`);
    },
    onSuccess: (_, { ativo }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(ativo ? 'Variante ativada!' : 'Variante desativada!');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]): Promise<void> => {
      await Promise.all(
        orderedIds.map((id, index) =>
          supabase
            .from(resolveTable(TABLE))
            .update({ ordem_exibicao: index + 1 })
            .eq('id', id)
            .select()
            .single()
            .then(({ error }) => {
              if (error) throw new Error(`[useVariantesGravacao] Reorder error: ${error.message}`);
            }),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Ordem atualizada!');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  return {
    variantes: variantesQuery.data ?? [],
    isLoading: variantesQuery.isLoading,
    isError: variantesQuery.isError,
    error: variantesQuery.error,
    refetch: variantesQuery.refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    toggleStatus: toggleStatusMutation.mutateAsync,
    reorder: reorderMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isReordering: reorderMutation.isPending,
  };
}
