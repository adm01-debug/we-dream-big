import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceTableRow {
  quantity: number;
  unitPrice: number;
  total: number;
  discount?: number;
}

interface PriceTiersTableProps {
  tiers: PriceTableRow[];
  isLoading: boolean;
  compact?: boolean;
  formatPrice: (price: number) => string;
}

export function PriceTiersTable({ tiers, isLoading, compact = false, formatPrice }: PriceTiersTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className={cn("animate-spin text-primary", compact ? "h-5 w-5" : "h-6 w-6")} />
        <span className="ml-2 text-sm text-muted-foreground">Carregando preços...</span>
      </div>
    );
  }

  if (tiers.length === 0) {
    return (
      <div className={cn("text-center text-muted-foreground", compact ? "py-8 text-sm" : "py-8")}>
        Nenhuma tabela de preços disponível
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead className={compact ? undefined : "bg-muted/50"}>
        <tr className={compact ? "bg-muted/30 border-b border-border/40" : undefined}>
          <th className={cn("px-4 text-left font-semibold text-muted-foreground uppercase tracking-wider", compact ? "py-2.5 text-[11px]" : "py-3 font-medium text-sm")}>
            {compact ? "Qtd." : "Quantidade"}
          </th>
          <th className={cn("px-4 text-right font-semibold text-muted-foreground uppercase tracking-wider", compact ? "py-2.5 text-[11px]" : "py-3 font-medium text-sm")}>
            Preço/un
          </th>
          <th className={cn("px-4 text-right font-semibold text-muted-foreground uppercase tracking-wider", compact ? "py-2.5 text-[11px]" : "py-3 font-medium text-sm hidden sm:table-cell")}>
            Total
          </th>
          <th className={cn("px-4 text-right font-semibold text-muted-foreground uppercase tracking-wider", compact ? "py-2.5 text-[11px]" : "py-3 font-medium text-sm")}>
            {compact ? "Desc." : "Desconto"}
          </th>
        </tr>
      </thead>
      <tbody>
        {tiers.map((tier, idx) => (
          <tr key={`tier-${idx}-${tier.quantity}`} className={cn(
            "border-t border-border/30 transition-colors",
            idx === 0 && "bg-primary/5",
            idx > 0 && "hover:bg-muted/20"
          )}>
            <td className={cn("px-4 font-medium text-foreground", compact ? "py-2.5" : "py-3")}>
              <div className="flex items-center gap-1.5">
                {tier.quantity.toLocaleString('pt-BR')} un
                {idx === 0 && (
                  compact
                    ? <span className="text-[9px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded">Mín</span>
                    : <Badge variant="outline" className="ml-2 text-xs">Mínimo</Badge>
                )}
              </div>
            </td>
            <td className={cn("px-4 text-right font-bold text-foreground", compact ? "py-2.5" : "py-3 font-semibold")}>
              {formatPrice(tier.unitPrice)}
            </td>
            <td className={cn("px-4 text-right text-muted-foreground", compact ? "py-2.5" : "py-3 hidden sm:table-cell")}>
              {formatPrice(tier.total)}
            </td>
            <td className={cn("px-4 text-right", compact ? "py-2.5" : "py-3")}>
              {tier.discount ? (
                compact
                  ? <span className="text-xs font-bold text-success">-{tier.discount}%</span>
                  : <Badge variant="secondary" className="bg-success/10 text-success border-success/20">-{tier.discount}%</Badge>
              ) : (
                <span className="text-muted-foreground/40">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
