/**
 * HotSearchesCard — Buscas Quentes.
 * Top termos buscados (com resultados) no período. Proxy de interesse real do mercado.
 */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Flame, Search, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { subDays } from "date-fns";

interface HotSearchItem {
  term: string;
  searchCount: number;
  previousCount: number;
  delta: number; // % vs período anterior
}

interface HotSearchesCardProps {
  days: number;
}

export function HotSearchesCard({ days }: HotSearchesCardProps) {
  const navigate = useNavigate();
  const since = subDays(new Date(), days).toISOString();
  const previousSince = subDays(new Date(), days * 2).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["hot-searches", days],
    queryFn: async (): Promise<HotSearchItem[]> => {
      const { isDemoMode, MOCK_HOT_SEARCHES } = await import("@/pages/trends/trends-mock");
      if (isDemoMode()) {
        return MOCK_HOT_SEARCHES.map(s => ({
          term: s.term,
          searchCount: s.count,
          previousCount: Math.max(1, Math.round(s.count / (1 + s.growth / 100))),
          delta: s.growth,
        }));
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows, error } = await (supabase.from as any)("search_analytics")
        .select("search_term, created_at, results_count")
        .gt("results_count", 0)
        .gte("created_at", previousSince)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;

      const recent = new Map<string, number>();
      const previous = new Map<string, number>();
      (rows ?? []).forEach((r: { search_term: string; created_at: string }) => {
        const key = r.search_term.trim().toLowerCase();
        if (!key) return;
        if (r.created_at >= since) {
          recent.set(key, (recent.get(key) ?? 0) + 1);
        } else {
          previous.set(key, (previous.get(key) ?? 0) + 1);
        }
      });

      return Array.from(recent.entries())
        .map(([term, count]) => {
          const prev = previous.get(term) ?? 0;
          const delta = prev === 0 ? (count > 0 ? 100 : 0) : ((count - prev) / prev) * 100;
          return { term, searchCount: count, previousCount: prev, delta: Math.round(delta) };
        })
        .sort((a, b) => b.searchCount - a.searchCount)
        .slice(0, 10);
    },
    staleTime: 1000 * 60 * 5,
  });

  const totalSearches = data?.reduce((s, item) => s + item.searchCount, 0) ?? 0;

  return (
    <Card className="overflow-hidden border-primary/30">
      <CardHeader className="pb-3 bg-primary/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                <Flame className="h-3.5 w-3.5 text-primary" />
              </div>
              Buscas Quentes
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Top termos pesquisados · interesse real em {days} dias
            </CardDescription>
          </div>
          {totalSearches > 0 && (
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              {totalSearches} buscas
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
          </div>
        ) : !data?.length ? (
          <div className="flex flex-col items-center py-10 text-muted-foreground">
            <Search className="h-8 w-8 mb-2 opacity-30" />
            <p className="text-xs">Sem dados de busca no período</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.map((item, index) => {
              const TrendIcon = item.delta > 5 ? TrendingUp : item.delta < -5 ? TrendingDown : Minus;
              const trendColor = item.delta > 5 ? "text-success" : item.delta < -5 ? "text-destructive" : "text-muted-foreground";
              return (
                <div
                  key={item.term}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
                >
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-primary/15 text-primary shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">"{item.term}"</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      {item.searchCount} buscas
                      <span className={`inline-flex items-center gap-0.5 ${trendColor}`}>
                        · <TrendIcon className="h-2.5 w-2.5" />
                        {item.delta > 0 ? "+" : ""}{item.delta}%
                      </span>
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[10px] gap-1 shrink-0"
                    onClick={() => navigate(`/catalogo?busca=${encodeURIComponent(item.term)}`)}
                    aria-label={`Ver catálogo para ${item.term}`}
                  >
                    Ver
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
