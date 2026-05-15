/**
 * MyDiscountRequestsWidget — solicitações de desconto do usuário com busca,
 * filtros e infinite scroll. Filtro explícito por seller_id = auth.uid().
 */
import { useMemo, useState, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Percent, ArrowRight, Clock, Loader2 } from "lucide-react";
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

const STATUS_VARIANT: Record<string, "secondary" | "outline" | "default" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

export function MyDiscountRequestsWidget() {
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
    queryKey: ["my-discount-requests-widget", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      let q = supabase
        .from("discount_approval_requests")
        .select("id, status, requested_discount_percent, quote_id, created_at")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (pageParam) q = q.lt("created_at", pageParam);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    getNextPageParam: (last) =>
      last.length < PAGE_SIZE ? undefined : last[last.length - 1]?.created_at ?? undefined,
  });

  const all = useMemo(() => data?.pages.flat() ?? [], [data]);

  const filtered = useMemo(() => {
    return all.filter(
      (r) =>
        (filters.status === "all" || r.status === filters.status) &&
        withinDateRange(r.created_at, filters.dateRange) &&
        matchesSearch(
          [
            r.quote_id,
            String(Number(r.requested_discount_percent ?? 0).toFixed(1)),
          ],
          filters.search,
        ),
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
            <Percent className="h-4 w-4 text-primary" />
            Minhas Solicitações de Desconto
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/descontos")} className="text-xs gap-1">
            Ver todas <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        <WidgetFiltersBar
          value={filters}
          onChange={setFilters}
          statusOptions={STATUS_OPTIONS}
          searchPlaceholder="Buscar por % ou orçamento…"
        />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Nenhuma solicitação encontrada com os filtros atuais.
            </p>
          ) : (
            filtered.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Percent className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    Desconto solicitado: {Number(r.requested_discount_percent ?? 0).toFixed(1)}%
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={STATUS_VARIANT[r.status] ?? "outline"} className="text-[10px] px-1.5 py-0">
                      {STATUS_LABELS[r.status] ?? r.status}
                    </Badge>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </div>
              </div>
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
