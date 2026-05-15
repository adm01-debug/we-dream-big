/**
 * MyRecentQuotesWidget — propostas recentes do usuário com busca, filtros
 * e infinite scroll (carrega lotes adicionais conforme o usuário rola).
 * Filtro explícito por seller_id = auth.uid() (defesa em profundidade
 * sobre a RLS já existente).
 */
import { useMemo, useState, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FileText, ArrowRight, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  WidgetFiltersBar,
  EMPTY_FILTERS,
  matchesSearch,
  withinDateRange,
  type WidgetFiltersValue,
} from "./widget-filters/WidgetFiltersBar";
import { useInfiniteScroll } from "./widget-filters/useInfiniteScroll";

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  sent: "Enviado",
  approved: "Aprovado",
  rejected: "Recusado",
  expired: "Expirado",
  pending_approval: "Aguardando aprovação",
  converted: "Convertido",
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

export function MyRecentQuotesWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<WidgetFiltersValue>(EMPTY_FILTERS);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["my-recent-quotes-widget", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from("quotes")
        .select("id, quote_number, status, total, client_name, client_company, updated_at")
        .eq("seller_id", user!.id)
        .order("updated_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (pageParam) q = q.lt("updated_at", pageParam);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    getNextPageParam: (last) =>
      last.length < PAGE_SIZE ? undefined : last[last.length - 1]?.updated_at ?? undefined,
  });

  const all = useMemo(() => data?.pages.flat() ?? [], [data]);

  const filtered = useMemo(() => {
    return all.filter(
      (q) =>
        (filters.status === "all" || q.status === filters.status) &&
        withinDateRange(q.updated_at, filters.dateRange) &&
        matchesSearch([q.quote_number, q.client_name, q.client_company], filters.search),
    );
  }, [all, filters]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const sentinelRef = useInfiniteScroll<HTMLDivElement>(handleLoadMore, {
    enabled: !!hasNextPage,
  });

  if (!isLoading && all.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Minhas Propostas Recentes
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/orcamentos")} className="text-xs gap-1">
            Ver todas <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        <WidgetFiltersBar
          value={filters}
          onChange={setFilters}
          statusOptions={STATUS_OPTIONS}
          searchPlaceholder="Buscar por número ou cliente…"
        />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Nenhuma proposta encontrada com os filtros atuais.
            </p>
          ) : (
            filtered.map((q) => (
              <button
                key={q.id}
                onClick={() => navigate(`/orcamentos/${q.id}`)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    #{q.quote_number} · {q.client_company || q.client_name || "Sem cliente"}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={q.status === "draft" ? "secondary" : "outline"} className="text-[10px] px-1.5 py-0">
                      {STATUS_LABELS[q.status] ?? q.status}
                    </Badge>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDistanceToNow(new Date(q.updated_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </div>
                {q.total !== null && (
                  <p className="text-sm font-semibold text-primary flex-shrink-0">
                    {Number(q.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                )}
              </button>
            ))
          )}
          {hasNextPage && (
            <div ref={sentinelRef} className="flex items-center justify-center py-3">
              {isFetchingNextPage ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <span className="text-[10px] text-muted-foreground">Role para carregar mais</span>
              )}
            </div>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground text-center pt-1">
          Exibindo {filtered.length} de {all.length} carregado(s){hasNextPage ? "+" : ""}.
        </p>
      </CardContent>
    </Card>
  );
}
