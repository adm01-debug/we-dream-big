/**
 * UnmetDemandCard — Demanda Reprimida.
 * Top termos buscados que retornaram 0 resultados = oportunidades perdidas.
 */
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Search, Plus } from "lucide-react";
import { subDays } from "date-fns";

interface UnmetDemandItem {
  term: string;
  searchCount: number;
  lastSearchedAt: string;
}

interface UnmetDemandCardProps {
  days: number;
}

export function UnmetDemandCard({ days }: UnmetDemandCardProps) {
  const navigate = useNavigate();
  const since = subDays(new Date(), days).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["unmet-demand", days],
    queryFn: async (): Promise<UnmetDemandItem[]> => {
      const { isDemoMode, MOCK_UNMET_DEMAND } = await import("@/pages/trends/trends-mock");
      if (isDemoMode()) {
        const now = new Date().toISOString();
        return MOCK_UNMET_DEMAND.map(d => ({
          term: d.term, searchCount: d.count, lastSearchedAt: now,
        }));
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows, error } = await (supabase.from as any)("search_analytics")
        .select("search_term, created_at")
        .eq("results_count", 0)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;

      const map = new Map<string, { count: number; last: string }>();
      (rows ?? []).forEach((r: { search_term: string; created_at: string }) => {
        const key = r.search_term.trim().toLowerCase();
        if (!key) return;
        const existing = map.get(key) ?? { count: 0, last: r.created_at };
        existing.count += 1;
        if (r.created_at > existing.last) existing.last = r.created_at;
        map.set(key, existing);
      });

      return Array.from(map.entries())
        .map(([term, v]) => ({ term, searchCount: v.count, lastSearchedAt: v.last }))
        .sort((a, b) => b.searchCount - a.searchCount)
        .slice(0, 10);
    },
    staleTime: 1000 * 60 * 5,
  });

  const totalLostSearches = data?.reduce((s, item) => s + item.searchCount, 0) ?? 0;

  return (
    <Card className="overflow-hidden border-warning/30">
      <CardHeader className="pb-3 bg-warning/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-warning/20 flex items-center justify-center">
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              </div>
              Demanda Reprimida
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Buscas sem resultado · oportunidades perdidas em {days} dias
            </CardDescription>
          </div>
          {totalLostSearches > 0 && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
              {totalLostSearches} buscas perdidas
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
            <p className="text-xs">Nenhuma busca sem resultado registrada 🎉</p>
            <p className="text-[10px] mt-1 opacity-70">Seu catálogo está cobrindo a demanda</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.map((item, index) => (
              <div
                key={item.term}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
              >
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-warning/15 text-warning shrink-0">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">"{item.term}"</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.searchCount} buscas · sem produtos cadastrados
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] gap-1 shrink-0"
                  onClick={() => navigate(`/catalogo?busca=${encodeURIComponent(item.term)}`)}
                  aria-label={`Pesquisar ${item.term} no catálogo`}
                >
                  <Plus className="h-3 w-3" />
                  Verificar
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
