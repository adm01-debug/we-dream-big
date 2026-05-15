/**
 * PackagingBadge - Badge clicável para produtos com embalagem especial
 * Exibe quando has_commercial_packaging === true
 */
import { Gift, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type PackagingContext = 'always' | 'with_customization' | 'without_customization' | null;

interface PackagingBadgeProps {
  hasCommercialPackaging: boolean | null;
  packingType: string | null;
  repackingType: string | null;
  packagingContext: PackagingContext;
  onClick: () => void;
  className?: string;
}

// Mapeamento de contexto para texto de exibição
const contextLabels: Record<string, string> = {
  'always': 'Sempre disponível',
  'with_customization': 'Com personalização',
  'without_customization': 'Sem personalização',
};

export function PackagingBadge({
  hasCommercialPackaging,
  packingType,
  repackingType,
  packagingContext,
  onClick,
  className,
}: PackagingBadgeProps) {
  // Só exibir se has_commercial_packaging === true
  if (!hasCommercialPackaging) {
    return null;
  }

  // Determinar tipo de embalagem baseado no contexto
  const displayType = packagingContext === 'with_customization' 
    ? (repackingType || packingType || "Embalagem Especial")
    : (packingType || "Embalagem Especial");

  // Texto do contexto
  const contextText = packagingContext ? contextLabels[packagingContext] : null;

  return (
    <Badge
      variant="outline"
      onClick={onClick}
      className={cn(
        "cursor-pointer transition-all duration-200 group/packaging",
        "bg-gradient-to-r from-warning/10 to-warning/5",
        "border-warning/30 hover:border-warning/60",
        "hover:from-warning/20 hover:to-warning/10",
        "hover:scale-[1.02] hover:shadow-md",
        "px-3 py-1.5 flex-col items-start gap-0.5",
        className
      )}
    >
      <div className="flex items-center">
        <Gift className="h-3.5 w-3.5 mr-1.5 text-warning group-hover/packaging:scale-110 transition-transform" />
        <span className="text-warning-foreground font-medium text-xs">
          {displayType}
        </span>
        <ChevronRight className="h-3 w-3 ml-1 text-warning/60 group-hover/packaging:translate-x-0.5 transition-transform" />
      </div>
      {contextText && (
        <span className="text-[10px] text-muted-foreground pl-5">
          {contextText}
        </span>
      )}
    </Badge>
  );
}
