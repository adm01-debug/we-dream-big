/**
 * ProductTagsSection — Seletor de tags do produto (padrão Super Filtro)
 * Gradientes, badges removíveis, color dots, contadores
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { X, Search, Tag, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProductTagsSectionProps {
  productId: string;
}

interface ExternalTag {
  id: string;
  name: string;
  slug?: string;
  color?: string;
}

interface ProductTag {
  id: string;
  product_id: string;
  tag_id: string;
}

async function fetchTags(): Promise<ExternalTag[]> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'tags', operation: 'select', limit: 500, orderBy: { column: 'name', ascending: true }, countMode: 'none' },
  });
  if (error) throw new Error(error.message);
  return data?.data?.records || [];
}

async function fetchProductTags(productId: string): Promise<ProductTag[]> {
  const { data, error } = await supabase.functions.invoke('external-db-bridge', {
    body: { table: 'product_tags', operation: 'select', filters: { product_id: productId }, limit: 500 },
  });
  if (error) throw new Error(error.message);
  return data?.data?.records || [];
}

export function ProductTagsSection({ productId }: ProductTagsSectionProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const { data: tags = [], isLoading: loadingTags } = useQuery({
    queryKey: ['external-tags-admin'],
    queryFn: fetchTags,
    staleTime: 5 * 60 * 1000,
  });

  const { data: productTags = [], isLoading: loadingLinks } = useQuery({
    queryKey: ['product-tags', productId],
    queryFn: () => fetchProductTags(productId),
    enabled: !!productId,
  });

  const linkedTagIds = new Set(productTags.map(pt => pt.tag_id));

  const toggleTag = useCallback(async (tagId: string, isLinked: boolean) => {
    if (togglingIds.has(tagId)) return;
    setTogglingIds(prev => new Set(prev).add(tagId));
    try {
      if (isLinked) {
        const record = productTags.find(pt => pt.tag_id === tagId);
        if (!record?.id) {
          const { data: findData } = await supabase.functions.invoke('external-db-bridge', {
            body: { table: 'product_tags', operation: 'select', filters: { product_id: productId, tag_id: tagId }, limit: 1 },
          });
          const found = findData?.data?.records?.[0];
          if (!found?.id) { toast.error('Registro não encontrado'); return; }
          await supabase.functions.invoke('external-db-bridge', {
            body: { table: 'product_tags', operation: 'delete', id: found.id },
          });
        } else {
          await supabase.functions.invoke('external-db-bridge', {
            body: { table: 'product_tags', operation: 'delete', id: record.id },
          });
        }
        toast.success('Tag removida');
      } else {
        await supabase.functions.invoke('external-db-bridge', {
          body: { table: 'product_tags', operation: 'insert', data: { product_id: productId, tag_id: tagId } },
        });
        toast.success('Tag adicionada');
      }
      queryClient.invalidateQueries({ queryKey: ['product-tags', productId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar tag');
    } finally {
      setTogglingIds(prev => { const next = new Set(prev); next.delete(tagId); return next; });
    }
  }, [productId, productTags, queryClient, togglingIds]);

  const clearAll = useCallback(async () => {
    const linked = tags.filter(t => linkedTagIds.has(t.id));
    for (const t of linked) {
      await toggleTag(t.id, true);
    }
  }, [tags, linkedTagIds, toggleTag]);

  const isLoading = loadingTags || loadingLinks;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <div className="text-center py-8">
        <Tag className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhuma tag disponível</p>
      </div>
    );
  }

  const linkedCount = linkedTagIds.size;
  const searchLower = search.toLowerCase();

  const filtered = tags
    .filter(t => !search || t.name.toLowerCase().includes(searchLower))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return (
    <div className="space-y-3">
      {/* Badges dos selecionados */}
      {linkedCount > 0 && (
        <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-primary flex items-center gap-1.5">
              <Tag className="h-3 w-3" />
              Selecionadas
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
            >
              Limpar todas
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tags
              .filter(t => linkedTagIds.has(t.id))
              .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
              .map(t => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border border-border bg-background text-foreground hover:bg-muted/50 cursor-pointer transition-all duration-200"
                  onClick={() => toggleTag(t.id, true)}
                >
                  {t.color && (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: t.color }}
                    />
                  )}
                  <span className="truncate max-w-[100px]">{t.name}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleTag(t.id, true); }}
                    className="rounded-full p-0.5 ml-0.5 hover:bg-destructive/20 hover:text-destructive transition-all duration-150"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar tags..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-8 text-sm pl-8 pr-8"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Estatísticas */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
        <span>{tags.length} tags</span>
        <span>•</span>
        <span className={cn("font-medium", linkedCount > 0 && "text-primary")}>
          {linkedCount} selecionadas
        </span>
      </div>

      {/* Lista */}
      <ScrollArea className="h-56">
        <div className="space-y-0.5 pr-3">
          {filtered.length === 0 && search ? (
            <div className="text-center py-6">
              <Search className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma tag encontrada para "<span className="font-medium">{search}</span>"
              </p>
            </div>
          ) : (
            filtered.map(tag => {
              const isLinked = linkedTagIds.has(tag.id);
              return (
                <label
                  key={tag.id}
                  className={cn(
                    "flex items-center gap-2.5 py-1.5 px-2.5 rounded-md cursor-pointer text-sm transition-all duration-150",
                    isLinked
                      ? "bg-primary/15 text-foreground font-medium shadow-sm"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {togglingIds.has(tag.id) ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                  ) : (
                    <Checkbox
                      checked={isLinked}
                      onCheckedChange={() => toggleTag(tag.id, isLinked)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  )}
                  {tag.color && (
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                  )}
                  <span className="truncate flex-1">{tag.name}</span>
                  {isLinked && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                </label>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
