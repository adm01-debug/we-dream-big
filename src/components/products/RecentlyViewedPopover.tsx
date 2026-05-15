import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useRecentlyViewedStore } from "@/stores/useRecentlyViewedStore";
import { useProductsContext } from "@/contexts/ProductsContext";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface RecentlyViewedPopoverProps {
  maxVisible?: number;
}

export function RecentlyViewedPopover({ maxVisible = 10 }: RecentlyViewedPopoverProps) {
  const navigate = useNavigate();
  const {
    items,
    itemCount,
    removeFromRecentlyViewed,
    clearRecentlyViewed,
  } = useRecentlyViewedStore();
  const { getProductsByIds } = useProductsContext();

  const products = useMemo(
    () => getProductsByIds(items.map((i) => i.productId)).slice(0, maxVisible),
    [getProductsByIds, items, maxVisible]
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon" aria-label="Horário"
          className={cn(
            "relative h-10 w-10 rounded-full border-border/50 transition-colors",
            itemCount > 0 ? "hover:border-primary/50" : "opacity-60 hover:opacity-100"
          )}
        >
          <Clock className="h-4 w-4" />
          {itemCount > 0 && (
            <Badge
              variant="secondary"
              className="absolute -top-1.5 -right-1.5 h-5 min-w-5 p-0 flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full"
            >
              {itemCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3" sideOffset={8}>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Vistos recentemente</span>
              {itemCount > 0 && (
                <span className="text-muted-foreground text-xs">({itemCount})</span>
              )}
            </div>
            {itemCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={clearRecentlyViewed}
                   aria-label="Excluir"><Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Limpar histórico</TooltipContent>
              </Tooltip>
            )}
          </div>

          {itemCount === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhum produto visualizado ainda
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {products.map((product) => (
                <div key={product.id} className="relative group">
                  <button
                    onClick={() => navigate(`/produto/${product.id}`)}
                    className={cn(
                      "w-full aspect-square rounded-lg overflow-hidden border-2 border-border/50",
                      "bg-muted cursor-pointer hover:border-primary/50 transition-all duration-200",
                      "hover:scale-105 hover:shadow-md"
                    )}
                  >
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover" loading="lazy" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromRecentlyViewed(product.id);
                    }}
                    className={cn(
                      "absolute -top-1 -right-1 w-4 h-4 rounded-full",
                      "bg-muted-foreground/80 text-background",
                      "flex items-center justify-center",
                      "opacity-0 group-hover:opacity-100 transition-opacity",
                      "hover:bg-destructive"
                    )}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                  <p className="text-[9px] text-muted-foreground text-center mt-1 truncate leading-tight">
                    {product.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
