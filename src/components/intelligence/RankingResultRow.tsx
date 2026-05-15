import { TrendingUp, TrendingDown, Minus, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TrendingProduct } from "@/hooks/useCommercialIntelligence";
import { HighlightMatch } from "./RankingFilterToolbar";

export function RankBadge({ index }: { index: number }) {
  if (index === 0) return <span className="text-base" title="1º lugar">🥇</span>;
  if (index === 1) return <span className="text-base" title="2º lugar">🥈</span>;
  if (index === 2) return <span className="text-base" title="3º lugar">🥉</span>;
  return (
    <span className={cn(
      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
      "bg-muted text-muted-foreground",
    )}>
      {index + 1}
    </span>
  );
}

export function ABCBadge({ revenue, topRevenue }: { revenue: number; topRevenue: number }) {
  const ratio = topRevenue > 0 ? revenue / topRevenue : 0;
  if (ratio >= 0.5) return <Badge variant="default" className="text-[9px] h-4 px-1 bg-success hover:bg-success">🔥 A</Badge>;
  if (ratio >= 0.2) return <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-warning/20 text-warning hover:bg-warning/20">⚡ B</Badge>;
  return <Badge variant="outline" className="text-[9px] h-4 px-1 text-muted-foreground">📦 C</Badge>;
}

const trendIcon = {
  up: <TrendingUp className="h-3 w-3 text-success" />,
  down: <TrendingDown className="h-3 w-3 text-destructive" />,
  stable: <Minus className="h-3 w-3 text-muted-foreground" />,
};

interface RankingResultRowProps {
  product: TrendingProduct;
  index: number;
  topRevenue: number;
  searchQuery: string;
  formatCurrency: (v: number) => string;
  onClick: () => void;
}

export function RankingResultRow({ product, index, topRevenue, searchQuery, formatCurrency, onClick }: RankingResultRowProps) {
  const avgUnit = product.totalQuantity > 0 ? product.totalRevenue / product.totalQuantity : 0;

  return (
    <div
      className={cn(
        "grid gap-2 px-3 py-2.5 hover:bg-muted/20 cursor-pointer transition-colors items-center",
        "grid-cols-[2rem_2.5rem_1fr_auto] sm:grid-cols-[2rem_2.5rem_1fr_4.5rem_5rem_5rem_4rem]",
        index < 3 && "bg-primary/[0.02]"
      )}
      onClick={onClick}
    >
      {/* Rank */}
      <div className="flex items-center justify-center">
        <RankBadge index={index} />
      </div>

      {/* Image */}
      <div className="w-9 h-9 rounded-md overflow-hidden bg-muted border border-border/50 flex-shrink-0">
        {product.productImage ? (
          <img src={product.productImage} alt="Imagem do produto" className="w-full h-full object-contain" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Name + Meta */}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium truncate">
            <HighlightMatch text={product.productName} query={searchQuery} />
          </p>
          <ABCBadge revenue={product.totalRevenue} topRevenue={topRevenue} />
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
          {product.productSku && <HighlightMatch text={product.productSku} query={searchQuery} />}
          {product.productSku && ' · '}{product.orderCount} pedidos
          <span className="sm:hidden"> · {product.totalQuantity.toLocaleString('pt-BR')} un. · {formatCurrency(product.totalRevenue)}</span>
        </div>
      </div>

      {/* Mobile trend indicator */}
      <div className="flex items-center gap-1 sm:hidden">
        {trendIcon[product.trend]}
      </div>

      {/* Quantity — desktop */}
      <div className="hidden sm:block text-right">
        <p className="text-sm font-medium">{product.totalQuantity.toLocaleString('pt-BR')}</p>
        <p className="text-[10px] text-muted-foreground">un.</p>
      </div>

      {/* Revenue — desktop */}
      <div className="hidden sm:block text-right">
        <p className="text-sm font-semibold">{formatCurrency(product.totalRevenue)}</p>
      </div>

      {/* Avg unit price — desktop */}
      <div className="hidden sm:block text-right">
        <p className="text-xs text-muted-foreground">{formatCurrency(avgUnit)}</p>
        <p className="text-[9px] text-muted-foreground/70">p/ un.</p>
      </div>

      {/* Conversion + Trend — desktop */}
      <div className="hidden sm:flex items-center gap-1 justify-end">
        {trendIcon[product.trend]}
        <span className="text-[10px] text-muted-foreground">{product.conversionRate}%</span>
      </div>
    </div>
  );
}
