// Hook CRUD para Tecnicas de Gravacao (via Supabase PostgREST)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, resolveTable, handleQueryError } from '@/lib/supabase-direct';
import type {
  TecnicaGravacao,
  TecnicaGravacaoVariante,
  TecnicaGravacaoFormData,
  TecnicaGravacaoWithVariantes,
} from '@/types/gravacao-database';
import { toast } from 'sonner';
import { sanitizeError } from '@/lib/security/sanitize-error';

const QUERY_KEY = 'tecnicas-gravacao';

const generateSlug = (nome: string): string => {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

export function useTecnicasGravacao() {
  const queryClient = useQueryClient();

  const tecnicasQuery = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async (): Promise<TecnicaGravacaoWithVariantes[]> => {
      const [tecnicasRes, variantesRes] = await Promise.all([
        supabase
          .from(resolveTable('tecnica_gravacao'))
          .select('*')
          .order('nome', { ascending: true }),
        supabase.from(resolveTable('tecnica_gravacao_variante')).select('tecnica_gravacao_id'),
      ]);

      if (tecnicasRes.error)
        return handleQueryError('useTecnicasGravacao', 'tecnica_gravacao', tecnicasRes.error);
      if (variantesRes.error)
        return handleQueryError(
          'useTecnicasGravacao',
          'tecnica_gravacao_variante',
          variantesRes.error,
        );

      const tecnicas = (tecnicasRes.data ?? []) as TecnicaGravacao[];
      const variantes = (variantesRes.data ?? []) as { tecnica_gravacao_id: string }[];

      const variantesCount: Record<string, number> = {};
      variantes.forEach((v) => {
        variantesCount[v.tecnica_gravacao_id] = (variantesCount[v.tecnica_gravacao_id] || 0) + 1;
      });

      return tecnicas.map((t) => ({
        ...t,
        variantes: [],
        variantes_count: variantesCount[t.id] || 0,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: async (formData: TecnicaGravacaoFormData): Promise<TecnicaGravacao> => {
      const slug = generateSlug(formData.nome);
      const { data, error } = await supabase
        .from(resolveTable('tecnica_gravacao'))
        .insert({ ...formData, slug })
        .select()
        .single();
      if (error) throw new Error(`[useTecnicasGravacao] Insert error: ${error.message}`);
      return data as TecnicaGravacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Tecnica criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<TecnicaGravacaoFormData> & { id: string }): Promise<TecnicaGravacao> => {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.nome) {
        updateData.slug = generateSlug(updates.nome);
      }
      const { data, error } = await supabase
        .from(resolveTable('tecnica_gravacao'))
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(`[useTecnicasGravacao] Update error: ${error.message}`);
      return data as TecnicaGravacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Tecnica atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // Verificar variantes vinculadas
      const { data, error: selectError } = await supabase
        .from(resolveTable('tecnica_gravacao_variante'))
        .select('id')
        .eq('tecnica_gravacao_id', id)
        .limit(1);

      if (selectError)
        throw new Error(`[useTecnicasGravacao] Select error: ${selectError.message}`);

      if ((data ?? []).length > 0) {
        // BUG-GRAVACAO-01 FIX: variantesResult.count pode ser null quando a query
        // nao suporta countMode. Usar nullish coalescing evita "existem null variante(s)".
        throw new Error(`Nao e possivel excluir: existem variante(s) vinculada(s)`);
      }

      const { error } = await supabase.from(resolveTable('tecnica_gravacao')).delete().eq('id', id);
      if (error) throw new Error(`[useTecnicasGravacao] Delete error: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success('Tecnica excluida com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }): Promise<void> => {
      const { error } = await supabase
        .from(resolveTable('tecnica_gravacao'))
        .update({ ativo })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(`[useTecnicasGravacao] Update error: ${error.message}`);
    },
    onSuccess: (_, { ativo }) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success(ativo ? 'Tecnica ativada!' : 'Tecnica desativada!');
    },
    onError: (error: Error) => {
      toast.error(sanitizeError(error));
    },
  });

  return {
    tecnicas: tecnicasQuery.data ?? [],
    isLoading: tecnicasQuery.isLoading,
    isError: tecnicasQuery.isError,
    error: tecnicasQuery.error,
    refetch: tecnicasQuery.refetch,
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
    // BUG-GRAVACAO-02 FIX: era toggleStatusMutation.mutate (fire-and-forget).
    // Callers nao conseguiam await o resultado. Alinhado com create/update/delete.
    toggleStatus: toggleStatusMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useTecnicaGravacao(id: string | undefined) {
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async (): Promise<TecnicaGravacaoWithVariantes | null> => {
      if (!id) return null;

      const [tecnicaRes, variantesRes] = await Promise.all([
        supabase.from(resolveTable('tecnica_gravacao')).select('*').eq('id', id).limit(1),
        supabase
          .from(resolveTable('tecnica_gravacao_variante'))
          .select('*')
          .eq('tecnica_gravacao_id', id)
          .order('ordem_exibicao', { ascending: true }),
      ]);

      if (tecnicaRes.error)
        return handleQueryError(
          'useTecnicaGravacao',
          'tecnica_gravacao',
          tecnicaRes.error,
        ) as unknown as null;
      if (variantesRes.error)
        return handleQueryError(
          'useTecnicaGravacao',
          'tecnica_gravacao_variante',
          variantesRes.error,
        ) as unknown as null;

      const tecnica = (tecnicaRes.data ?? [])[0] as TecnicaGravacao | undefined;
      if (!tecnica) return null;

      const variantes = (variantesRes.data ?? []) as TecnicaGravacaoVariante[];

      return {
        ...tecnica,
        variantes,
        variantes_count: variantes.length,
      };
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}
