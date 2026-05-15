/**
 * TechniqueOption — Etapa 2: Opção de grupo de técnica
 * 
 * Mostra APENAS o nome do grupo (Laser, UV Digital, Serigrafia).
 * Sem preço, sem variação, sem dimensão.
 */

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TechniqueOptionProps {
  groupCode: string;
  groupLabel: string;
  isSelected: boolean;
  onSelect: (groupCode: string) => void;
}

export function TechniqueOption({
  groupCode,
  groupLabel,
  isSelected,
  onSelect,
}: TechniqueOptionProps) {
  return (
    <button
      className={cn(
        "w-full p-3 rounded-lg flex items-center gap-2.5 transition-all duration-200 border text-left",
        isSelected
          ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20"
          : "bg-secondary/50 border-border/50 hover:bg-secondary/80 hover:border-border"
      )}
      onClick={() => onSelect(groupCode)}
    >
      <div className={cn(
        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
        isSelected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-muted-foreground/40"
      )}>
        {isSelected && <Check className="h-3 w-3" />}
      </div>
      <span className="font-medium text-sm text-foreground">
        {groupLabel}
      </span>
    </button>
  );
}
