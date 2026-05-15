/**
 * BundleSuggestionCard — sugere produtos comumente orçados juntos com o produto-âncora.
 * Consulta histórico de quote_items via RPC `get_bundle_suggestions(_product_id)`.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Plus } from "lucide-react";
import { motion } from "framer-motion";

interface BundleSuggestion {
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  cooccurrence_count: number;
  frequency_percent: number;
}

interface BundleSuggestionCardProps {
  productId: string;
  onAdd?: (suggestion: BundleSuggestion) => void;
  className?: string;
}

export function BundleSuggestionCard({ productId, onAdd, className }: BundleSuggestionCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["bundle-suggestions", productId],
    enabled: !!productId,
    queryFn: async (): Promise<BundleSuggestion[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("get_bundle_suggestions", {
        _product_id: productId,
      });
      if (error) {
        console.warn("get_bundle_suggestions error:", error);
        return [];
      }
      return (data ?? []) as BundleSuggestion[];
    },
    staleTime: 1000 * 60 * 30,
  });

  if (!isLoading && !data?.length) return null;

  return (
    <Card className={`border-primary/20 shadow-sm hover:shadow-md transition-shadow animate-in zoom-in-95 duration-300 ${className ?? ""}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="p-1 rounded-md bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          Frequentemente orçado em conjunto
        </CardTitle>
        <CardDescription className="text-[11px] leading-tight">
          Vendedores que orçaram este produto também incluíram:
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-2">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-md">
                <Skeleton className="w-10 h-10 rounded-md shrink-0 opacity-20" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-3/4 opacity-15" />
                  <Skeleton className="h-2 w-1/2 opacity-10" />
                </div>
                <Skeleton className="h-7 w-12 rounded-md opacity-20" />
              </div>
            ))}
          </div>
        ) : (
          data!.map(item => (
            <motion.div
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              key={item.product_id}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              {item.product_image_url ? (
                <img
                  src={item.product_image_url}
                  alt={item.product_name}
                  className="w-10 h-10 rounded object-cover bg-muted"
                  loading="lazy"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-muted shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.product_name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {item.frequency_percent}% das vezes · {item.cooccurrence_count}x
                </p>
              </div>
              {onAdd && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] gap-1 shrink-0"
                  onClick={() => onAdd(item)}
                  aria-label={`Adicionar ${item.product_name}`}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
