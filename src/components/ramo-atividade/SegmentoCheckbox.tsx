import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { SegmentoComplete } from "@/types/ramo-atividade";

interface SegmentoCheckboxProps {
  segmento: SegmentoComplete;
  isSelected: boolean;
  onToggle: (segmentoSlug: string) => void;
  ramoHexCode?: string | null;
  compact?: boolean;
}

export function SegmentoCheckbox({
  segmento,
  isSelected,
  onToggle,
  ramoHexCode,
  compact = false,
}: SegmentoCheckboxProps) {
  if (compact) {
    return (
      <label className={cn(
        "flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-colors",
        isSelected 
          ? "bg-primary/10 text-primary" 
          : "hover:bg-muted/50 text-foreground"
      )}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle(segmento.segmento_slug)}
          className="w-3.5 h-3.5"
        />
        <span className="text-xs truncate flex-1">
          {segmento.segmento_name}
        </span>
      </label>
    );
  }

  return (
    <label className={cn(
      "flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer transition-all duration-200",
      isSelected 
        ? "bg-primary/10 text-primary ring-1 ring-primary/20" 
        : "hover:bg-muted/50 text-foreground"
    )}>
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle(segmento.segmento_slug)}
        className={cn(
          "w-4 h-4 transition-all",
          isSelected && "bg-primary border-primary"
        )}
      />
      
      <div className="flex-1 min-w-0">
        <span className={cn(
          "text-sm",
          isSelected && "font-medium"
        )}>
          {segmento.segmento_name}
        </span>
        
        {segmento.segmento_description && (
          <p className="text-xs text-muted-foreground truncate">
            {segmento.segmento_description}
          </p>
        )}
      </div>

      {segmento.product_count !== undefined && segmento.product_count > 0 && (
        <span className={cn(
          "text-xs px-1.5 py-0.5 rounded",
          isSelected 
            ? "bg-primary/20 text-primary" 
            : "bg-muted text-muted-foreground"
        )}>
          {segmento.product_count}
        </span>
      )}
    </label>
  );
}
