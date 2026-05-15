/**
 * BundleSuggestions — "Combos para a categoria favorita"
 *
 * Reposicionado para gravitar em torno de CATEGORIA:
 *  1. Resolve a categoria favorita do cliente via useClientCategoryAffinity
 *  2. Permite ao vendedor trocar de categoria via dropdown (top 5 categorias)
 *  3. Ancora o RPC get_bundle_suggestions no top produto da categoria escolhida
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package2, ShoppingBasket, TrendingUp, Layers } from "lucide-react";
import { useClientCategoryAffinity } from "@/hooks/bi/useClientCategoryAffinity";
import { useBICategoryFocus } from "@/contexts/BICategoryFocusContext";

interface Props {
  clientId: string;
}

interface BundleRow {
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  cooccurrence_count: number;
  frequency_percent: number;
}

export function BundleSuggestions({ clientId }: Props) {
  const affinity = useClientCategoryAffinity(clientId);
  const { focusedSlug } = useBICategoryFocus();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  // Categorias com pelo menos 1 produto real conhecido (para servir de âncora)
  const selectableCategories = useMemo(
    () => affinity.categories.filter((c) => c.topProducts.length > 0).slice(0, 6),
    [affinity.categories],
  );

  const activeCategory = useMemo(() => {
    // Foco global ganha prioridade sobre seleção local
    if (focusedSlug) {
      return selectableCategories.find((c) => c.slug === focusedSlug) ?? selectableCategories[0] ?? null;
    }
    if (selectedSlug) {
      return selectableCategories.find((c) => c.slug === selectedSlug) ?? selectableCategories[0] ?? null;
    }
    return selectableCategories[0] ?? null;
  }, [selectedSlug, selectableCategories, focusedSlug]);

  const anchorProduct = activeCategory?.topProducts[0] ?? null;
  const anchorId = anchorProduct?.productId ?? null;
  const anchorName = anchorProduct?.productName ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ["bi-bundle-suggestions", anchorId],
    enabled: !!anchorId,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<BundleRow[]> => {
      if (!anchorId) return [];
      const { data, error } = await supabase.rpc("get_bundle_suggestions", { _product_id: anchorId });
      if (error || !Array.isArray(data)) return [];
      return data as BundleRow[];
    },
  });

  if (selectableCategories.length === 0) return null;

  const headerSelector = selectableCategories.length > 1 && (
    <Select
      value={activeCategory?.slug ?? selectableCategories[0]?.slug}
      onValueChange={(v) => setSelectedSlug(v)}
    >
      <SelectTrigger className="h-8 w-[200px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {selectableCategories.map((c) => (
          <SelectItem key={c.slug} value={c.slug} className="text-xs">
            <span className="flex items-center gap-2">
              <Layers className="h-3 w-3 text-muted-foreground" />
              {c.label}
              <span className="text-[10px] text-muted-foreground tabular-nums">
                ({Math.round(c.revenueSharePct)}%)
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <Card className="border-[1.5px]">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <ShoppingBasket className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-semibold text-sm sm:text-base">
                Combos para a categoria{" "}
                <span className="text-emerald-700 dark:text-emerald-300">
                  {activeCategory?.label ?? "favorita"}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground">
                {anchorName
                  ? `Cruzando com ${anchorName} — produto âncora dessa categoria.`
                  : "Sugestões baseadas em pedidos reais de outros clientes."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerSelector}
            <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-[10px]">
              <TrendingUp className="h-3 w-3" /> Cross-sell
            </Badge>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-6 text-center">
            Sem combos identificados para essa categoria ainda. Tente outra categoria favorita.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {data.map((b) => (
              <div
                key={b.product_id}
                className="p-3 rounded-lg border bg-card hover:border-primary/30 hover:shadow-sm transition-all"
              >
                {b.product_image_url ? (
                  <div className="aspect-square rounded-md overflow-hidden bg-muted/40 mb-2 border">
                    <img
                      src={b.product_image_url}
                      alt={b.product_name}
                      loading="lazy"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="aspect-square rounded-md bg-muted/40 flex items-center justify-center mb-2">
                    <Package2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="text-xs font-medium line-clamp-2 leading-snug min-h-[2rem]">
                  {b.product_name}
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{b.cooccurrence_count}× junto</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {Math.round(b.frequency_percent)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
