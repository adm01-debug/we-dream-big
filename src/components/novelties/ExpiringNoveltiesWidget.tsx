import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Flame, Sparkles, ChevronRight, Package, Building2 } from "lucide-react";
import { useNoveltiesWithDetails } from "@/hooks/useNovelties";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

function formatDaysAgo(createdAt: string): string {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (days === 0) return "Hoje!";
  if (days === 1) return "Ontem";
  return `${days}d atrás`;
}

function getRecencyVariant(createdAt: string): "hot" | "warm" | "normal" {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (days <= 2) return "hot";
  if (days <= 5) return "warm";
  return "normal";
}

const recencyStyles = {
  hot: "text-orange",
  warm: "text-warning",
  normal: "text-muted-foreground",
};

interface SupplierBreakdown {
  id: string;
  name: string;
  count: number;
  percentage: number;
}

export function ExpiringNoveltiesWidget() {
  const navigate = useNavigate();
  const { data: allNovelties, isLoading } = useNoveltiesWithDetails({ limit: 200 });

  const recentItems = useMemo(() => {
    if (!allNovelties) return [];
    return [...allNovelties]
      .sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime())
      .slice(0, 10);
  }, [allNovelties]);

  // Supplier breakdown
  const supplierBreakdown = useMemo<SupplierBreakdown[]>(() => {
    if (!allNovelties || allNovelties.length === 0) return [];
    const supMap = new Map<string, { id: string; name: string; count: number }>();
    allNovelties.forEach(p => {
      if (p.supplier_id && p.supplier_name) {
        const existing = supMap.get(p.supplier_id);
        if (existing) existing.count++;
        else supMap.set(p.supplier_id, { id: p.supplier_id, name: p.supplier_name, count: 1 });
      }
    });
    const total = allNovelties.length;
    return [...supMap.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(s => ({ ...s, percentage: Math.round((s.count / total) * 100) }));
  }, [allNovelties]);

  const handleClick = (productId: string) => {
    navigate(`/produto/${productId}`);
  };

  return (
    <div className="space-y-3">
      {/* + Recentes widget */}
      <Card className="border-success/40 bg-gradient-to-br from-success/10 via-success/5 to-transparent shadow-[0_0_20px_hsl(var(--success)/0.15)] ring-1 ring-success/20">
        <CardHeader className="pb-1.5 px-3 pt-3">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-success animate-pulse drop-shadow-[0_0_6px_hsl(var(--success)/0.6)]" />
            <span className="text-success font-bold">+ Recentes</span>
            {recentItems.length > 0 && (
              <Badge 
                variant="secondary" 
                className="bg-success/20 text-success border border-success/30 text-[9px] tabular-nums px-1.5 py-0 font-bold"
              >
                {recentItems.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-0 px-3 pb-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <div className="w-4 h-4 border-2 border-primary/40 border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] text-muted-foreground/50">carregando...</span>
            </div>
          ) : recentItems.length > 0 ? (
            <ScrollArea className="h-auto max-h-[280px]">
              <div className="space-y-1">
                {recentItems.map((item, idx) => {
                   const isVeryNew = idx < 3;
                   const variant = getRecencyVariant(item.detected_at);
                   return (
                     <div
                       key={item.novelty_id}
                       className={cn(
                         "group flex items-center gap-2 p-1.5 rounded-md cursor-pointer",
                         "hover:bg-success/10 transition-all duration-150",
                         isVeryNew 
                           ? "border border-success/20 hover:border-success/40 bg-success/5" 
                           : "border border-transparent",
                       )}
                      onClick={() => handleClick(item.product_id)}
                    >
                      <div className="shrink-0 w-8 h-8 rounded bg-muted overflow-hidden relative">
                        {item.product_image ? (
                          <img src={item.product_image} 
                            alt={item.product_name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                            <Package className="h-3 w-3" />
                          </div>
                        )}
                        {isVeryNew && (
                          <div className="absolute -top-0.5 -right-0.5">
                            <Flame className="h-2.5 w-2.5 text-success drop-shadow-[0_0_4px_hsl(var(--success)/0.5)]" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium line-clamp-1 group-hover:text-primary transition-colors">
                          {item.product_name}
                        </p>
                        <div className="flex items-center gap-1">
                          <Sparkles className={cn("h-2.5 w-2.5", recencyStyles[variant])} />
                          <span className={cn("text-[10px] font-medium", recencyStyles[variant])}>
                            {formatDaysAgo(item.detected_at)}
                          </span>
                        </div>
                      </div>

                      <ChevronRight className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-4">
              <Sparkles className="h-6 w-6 mx-auto text-muted-foreground/30 mb-1.5" />
              <p className="text-[11px] text-muted-foreground">
                Nenhuma novidade recente
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supplier Breakdown widget */}
      {supplierBreakdown.length > 0 && (
        <Card className="border-info/30 bg-gradient-to-br from-info/5 to-transparent">
          <CardHeader className="pb-1.5 px-3 pt-3">
            <CardTitle className="text-sm flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-info" />
              Por Fornecedor
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-3 pb-3">
            <div className="space-y-2">
              {supplierBreakdown.map((sup, idx) => (
                <div key={sup.id}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium text-[11px] truncate max-w-[120px]">{sup.name}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[9px] tabular-nums px-1 py-0">
                        {sup.count}
                      </Badge>
                      <span className="text-[9px] text-muted-foreground tabular-nums w-7 text-right">
                        {sup.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700 ease-out",
                        idx === 0 ? "bg-info" : "bg-info/50"
                      )}
                      style={{ width: `${sup.percentage}%` }}
                    />
                  </div>
                  {idx < supplierBreakdown.length - 1 && (
                    <Separator className="mt-2 opacity-20" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
