/**
 * ProductRamosSection — Seletor hierárquico de Ramos de Atividade (padrão Super Filtro)
 * Gradientes, color dots, contadores, busca, badges removíveis
 */

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ramoAtividadeService } from '@/services/ramoAtividadeService';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { X, ChevronDown, Building2, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ProductRamosSectionProps {
  productId: string;
}

export function ProductRamosSection({ productId }: ProductRamosSectionProps) {
  const queryClient = useQueryClient();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const { data: ramosData, isLoading: loadingRamos } = useQuery({
    queryKey: ['ramos-atividade-admin'],
    queryFn: () => ramoAtividadeService.getRamos(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: segmentosData, isLoading: loadingSegmentos } = useQuery({
    queryKey: ['segmentos-atividade-admin'],
    queryFn: () => ramoAtividadeService.getSegmentos(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: produtoRamosData, isLoading: loadingLinks } = useQuery({
    queryKey: ['produto-ramos', productId],
    queryFn: () => ramoAtividadeService.getRamosDoProduto(productId),
    enabled: !!productId,
  });

  const linkedSegmentoIds = new Set(
    (produtoRamosData?.associacoes || []).map(a => a.ramo_atividade_filho_id)
  );

  const ramos = ramosData?.ramos || [];
  const segmentos = segmentosData?.segmentos || [];

  const segmentosByRamo = segmentos.reduce<Record<string, typeof segmentos>>((acc, s) => {
    if (!acc[s.ramo_atividade_id]) acc[s.ramo_atividade_id] = [];
    acc[s.ramo_atividade_id].push(s);
    return acc;
  }, {});

  const toggleSegmento = useCallback(async (segmentoId: string, isLinked: boolean) => {
    if (togglingIds.has(segmentoId)) return;
    setTogglingIds(prev => new Set(prev).add(segmentoId));
    try {
      if (isLinked) {
        await ramoAtividadeService.removeRamoDoProduto(productId, segmentoId);
        toast.success('Segmento removido');
      } else {
        await ramoAtividadeService.addRamoAoProduto(productId, segmentoId);
        toast.success('Segmento adicionado');
      }
      queryClient.invalidateQueries({ queryKey: ['produto-ramos', productId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar segmento');
    } finally {
      setTogglingIds(prev => { const next = new Set(prev); next.delete(segmentoId); return next; });
    }
  }, [productId, queryClient, togglingIds]);

  const toggleGroup = (ramoId: string) => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(ramoId)) next.delete(ramoId);
      else next.add(ramoId);
      return next;
    });
  };

  const clearAll = useCallback(async () => {
    const linked = segmentos.filter(s => linkedSegmentoIds.has(s.id));
    for (const s of linked) {
      await toggleSegmento(s.id, true);
    }
  }, [segmentos, linkedSegmentoIds, toggleSegmento]);

  const isLoading = loadingRamos || loadingSegmentos || loadingLinks;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  if (ramos.length === 0) {
    return (
      <div className="text-center py-8">
        <Building2 className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Nenhum ramo de atividade disponível</p>
      </div>
    );
  }

  const linkedCount = linkedSegmentoIds.size;
  const searchLower = search.toLowerCase();

  const filteredSegByRamo = search
    ? Object.fromEntries(
        Object.entries(segmentosByRamo).map(([rid, segs]) => [
          rid,
          segs.filter(s => s.nome.toLowerCase().includes(searchLower)),
        ])
      )
    : segmentosByRamo;

  const visibleRamos = [...ramos]
    .filter(r =>
      !search ||
      r.nome.toLowerCase().includes(searchLower) ||
      (filteredSegByRamo[r.id]?.length || 0) > 0
    )
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  return (
    <div className="space-y-3">
      {/* Badges dos selecionados */}
      {linkedCount > 0 && (
        <div className="p-2.5 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-primary flex items-center gap-1.5">
              <Building2 className="h-3 w-3" />
              Selecionados
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
            >
              Limpar todos
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {segmentos
              .filter(s => linkedSegmentoIds.has(s.id))
              .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
              .map(s => {
                const ramo = ramos.find(r => r.id === s.ramo_atividade_id);
                return (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium border border-border bg-background text-foreground hover:bg-muted/50 cursor-pointer transition-all duration-200"
                    onClick={() => toggleSegmento(s.id, true)}
                  >
                    {ramo?.cor && (
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: ramo.cor }}
                      />
                    )}
                    <span className="truncate max-w-[100px]">{s.nome}</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleSegmento(s.id, true); }}
                      className="rounded-full p-0.5 ml-0.5 hover:bg-destructive/20 hover:text-destructive transition-all duration-150"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                );
              })}
          </div>
        </div>
      )}

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar ramo ou segmento..."
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
        <span>{ramos.length} ramos</span>
        <span>•</span>
        <span>{segmentos.length} segmentos</span>
        <span>•</span>
        <span className={cn("font-medium", linkedCount > 0 && "text-primary")}>
          {linkedCount} selecionados
        </span>
      </div>

      {/* Árvore hierárquica */}
      <ScrollArea className="h-56">
        <div className="space-y-1.5 pr-3">
          {visibleRamos.map(ramo => {
            const children = (filteredSegByRamo[ramo.id] || segmentosByRamo[ramo.id] || [])
              .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
            const linkedInRamo = children.filter(s => linkedSegmentoIds.has(s.id)).length;
            const isOpen = openGroups.has(ramo.id) || !!search;
            const hasAnySelection = linkedInRamo > 0;

            return (
              <div
                key={ramo.id}
                className={cn(
                  "rounded-lg overflow-hidden transition-all duration-200",
                  hasAnySelection
                    ? "bg-gradient-to-r from-primary/10 to-primary/5 ring-1 ring-primary/30"
                    : "bg-muted/30 hover:bg-muted/50"
                )}
              >
                {/* Header do ramo */}
                <div className="flex items-center gap-2 p-2.5">
                  <button
                    type="button"
                    onClick={() => toggleGroup(ramo.id)}
                    className={cn(
                      "p-1 rounded-md transition-all duration-200",
                      isOpen ? "bg-primary/10" : "bg-muted hover:bg-muted/80"
                    )}
                  >
                    <ChevronDown className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      isOpen ? "rotate-180 text-primary" : "text-muted-foreground"
                    )} />
                  </button>

                  {/* Color dot */}
                  {ramo.cor && (
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-background transition-all",
                        hasAnySelection ? "ring-primary/50 scale-110" : "ring-border/50"
                      )}
                      style={{
                        backgroundColor: ramo.cor,
                        boxShadow: `0 2px 8px ${ramo.cor}40`,
                      }}
                    />
                  )}

                  <span className={cn(
                    "text-sm font-medium truncate flex-1 transition-colors",
                    hasAnySelection ? "text-primary" : "text-foreground"
                  )}>
                    {ramo.nome}
                  </span>

                  {/* Contadores */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {linkedInRamo > 0 && (
                      <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {linkedInRamo}
                      </span>
                    )}
                    <span className={cn(
                      "text-[11px] px-1.5 py-0.5 rounded-full",
                      hasAnySelection
                        ? "bg-primary/20 text-primary font-medium"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {children.length}
                    </span>
                  </div>
                </div>

                {/* Segmentos */}
                {isOpen && children.length > 0 && (
                  <div className="px-2.5 pb-2.5 space-y-0.5">
                    <div className="border-t border-border/30 pt-2 ml-8">
                      {children.map(seg => {
                        const isLinked = linkedSegmentoIds.has(seg.id);
                        return (
                          <label
                            key={seg.id}
                            className={cn(
                              "flex items-center gap-2.5 py-1.5 px-2.5 rounded-md cursor-pointer text-sm transition-all duration-150",
                              isLinked
                                ? "bg-primary/15 text-foreground font-medium shadow-sm"
                                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            )}
                          >
                            {togglingIds.has(seg.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                            ) : (
                              <Checkbox
                                checked={isLinked}
                                onCheckedChange={() => toggleSegmento(seg.id, isLinked)}
                                className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                              />
                            )}
                            {ramo.cor && (
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: ramo.cor }}
                              />
                            )}
                            <span className="truncate flex-1">{seg.nome}</span>
                            {isLinked && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isOpen && children.length === 0 && (
                  <div className="px-2.5 pb-2.5">
                    <div className="border-t border-border/30 pt-2 ml-8">
                      <p className="text-xs text-muted-foreground italic py-2">
                        Nenhum segmento neste ramo
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {visibleRamos.length === 0 && search && (
            <div className="text-center py-6">
              <Search className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum ramo encontrado para "<span className="font-medium">{search}</span>"
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
