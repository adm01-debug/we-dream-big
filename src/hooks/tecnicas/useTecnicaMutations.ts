/**
 * Hook: Mutations de Técnicas
 *
 * Responsável por: CRUD operations (create, update, delete, toggle)
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, resolveTable } from '@/lib/supabase-direct';
import { TECNICAS_QUERY_KEYS } from '@/hooks/tecnicas/keys';
import type { PersonalizationTechniqueRaw } from '@/types/tecnica-unificada';
import { toast } from 'sonner';

const TABLE = 'personalization_techniques';

/**
 * Todas as mutations para técnicas em um único hook
 */
export function useTecnicaMutations() {
  const queryClient = useQueryClient();

  // Toggle status
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from(resolveTable(TABLE))
        .update({ ativo })
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { ativo }) => {
      queryClient.invalidateQueries({ queryKey: TECNICAS_QUERY_KEYS.all });
      toast.success(ativo ? 'Técnica ativada!' : 'Técnica desativada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  // Create
  const createMutation = useMutation({
    mutationFn: async (data: Partial<PersonalizationTechniqueRaw>) => {
      const { error } = await supabase.from(resolveTable(TABLE)).insert(data).select().single();
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TECNICAS_QUERY_KEYS.all });
      toast.success('Técnica criada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar: ${error.message}`);
    },
  });

  // Update
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<PersonalizationTechniqueRaw>) => {
      const { error } = await supabase
        .from(resolveTable(TABLE))
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TECNICAS_QUERY_KEYS.all });
      toast.success('Técnica atualizada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Delete
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(resolveTable(TABLE)).delete().eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TECNICAS_QUERY_KEYS.all });
      toast.success('Técnica removida!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });

  return {
    // Toggle
    toggleStatus: toggleStatusMutation.mutate,
    toggleStatusAsync: toggleStatusMutation.mutateAsync,
    isToggling: toggleStatusMutation.isPending,

    // Create
    create: createMutation.mutate,
    createAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,

    // Update
    update: updateMutation.mutate,
    updateAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    // Delete
    remove: deleteMutation.mutate,
    removeAsync: deleteMutation.mutateAsync,
    isRemoving: deleteMutation.isPending,

    // Combined loading state
    isMutating:
      toggleStatusMutation.isPending ||
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending,
  };
}
