import { PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title?: string;
  description?: string;
  hasFilters?: boolean;
  onClearFilters?: () => void;
}

/**
 * Empty state ilustrado para os painéis de Inteligência de Mercado.
 * Quando há filtros ativos, oferece CTA "Limpar filtros".
 */
export function IntelligenceEmptyState({
  title = "Nenhum dado para o período",
  description = "Tente ampliar o intervalo de datas ou ajustar os filtros.",
  hasFilters = false,
  onClearFilters,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="relative mb-3">
        <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl" aria-hidden />
        <div className="relative w-14 h-14 rounded-full bg-muted/60 border border-border/50 flex items-center justify-center">
          <PackageSearch className="h-6 w-6 text-muted-foreground" />
        </div>
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5 max-w-[240px]">{description}</p>
      {hasFilters && onClearFilters && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 h-7 text-xs"
          onClick={onClearFilters}
        >
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
