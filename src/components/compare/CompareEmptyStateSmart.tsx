/**
 * CompareEmptyStateSmart — empty state inteligente: mostra top 6 mais comparados da semana.
 * Usa RPC get_top_compared_products (criada na C1).
 */
import { useEffect, useState } from "react";
import { GitCompare, Plus, Flame, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useProductsContext } from "@/contexts/ProductsContext";
import { useComparisonStore } from "@/stores/useComparisonStore";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

export function CompareEmptyStateSmart() {
  const [topIds, setTopIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [usedFallback, setUsedFallback] = useState(false);
  const { getProductsByIds, products: allProducts } = useProductsContext();
  const { addToCompare, isInCompare, canAddMore } = useComparisonStore();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.rpc("get_top_compared_products", { p_limit: 6 });
        if (cancelled) return;
        const ids = (data ?? []).map((r: { product_id: string }) => r.product_id);
        setTopIds(ids);
        if (ids.length === 0) {
          logger.warn("[CompareEmptyStateSmart] RPC retornou 0 ids — fallback acionado");
        }
      } catch (err) {
        logger.warn("[CompareEmptyStateSmart] RPC falhou — fallback acionado", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Controla o fallback via useEffect para evitar warnings de update durante o render
  useEffect(() => {
    if (!loading && topIds.length === 0 && allProducts.length > 0 && !usedFallback) {
      setUsedFallback(true);
      logger.warn("[CompareEmptyStateSmart] Usando fallback de produtos do contexto");
    }
  }, [loading, topIds.length, allProducts.length, usedFallback]);

  const products = topIds.length > 0 ? getProductsByIds(topIds) : (usedFallback ? allProducts.slice(0, 6) : []);

  const handleAdd = (id: string, name: string) => {
    if (!canAddMore) {
      toast.error("Máximo 4 produtos");
      return;
    }
    if (addToCompare(id)) toast.success(`${name} adicionado`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 py-8">
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <GitCompare className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Comparador de Produtos</h1>
          <p className="text-muted-foreground max-w-md">
            Selecione pelo menos 2 produtos para comparar lado a lado.
          </p>
        </div>
        <Button onClick={() => navigate("/")}>Explorar catálogo</Button>
      </div>

      {!loading && products.length > 0 && (
        <section className="w-full max-w-5xl space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <header className="flex items-center gap-2 justify-center">
            {usedFallback ? <Sparkles className="h-4 w-4 text-primary" /> : <Flame className="h-4 w-4 text-primary" />}
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {usedFallback ? "Sugestões para começar" : "Os mais comparados da semana"}
            </h2>
          </header>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {products.slice(0, 6).map(p => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-3 space-y-2 hover:shadow-md hover:border-primary/40 transition-all">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-contain" loading="lazy" />
                </div>
                <p className="text-xs font-medium line-clamp-2">{p.name}</p>
                <Button
                  size="sm"
                  variant={isInCompare(p.id) ? "secondary" : "outline"}
                  className="w-full h-7 text-xs"
                  onClick={() => handleAdd(p.id, p.name)}
                  disabled={isInCompare(p.id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {isInCompare(p.id) ? "Adicionado" : "Comparar"}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
