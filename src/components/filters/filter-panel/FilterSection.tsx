import React from 'react';
import { ChevronUp, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export const SECTION_ICON_COLORS: Record<string, string> = {
  cores: "text-orange",
  categorias: "text-orange/80",
  estoque: "text-info",
  preco: "text-success",
  fornecedores: "text-info",
  publico: "text-primary",
  "datas-comemorativas": "text-primary/80",
  endomarketing: "text-warning",
  materiais: "text-info",
  "ramos-atividade": "text-primary/80",
  tecnicas: "text-destructive/80",
  tags: "text-success",
  "opcoes-rapidas": "text-warning",
  ordenacao: "text-muted-foreground",
};

export const SECTION_TOOLTIPS: Record<string, string> = {
  cores: "Filtre por família de cores, variações e nuances",
  categorias: "Navegue pela árvore de categorias do catálogo",
  estoque: "Defina a quantidade mínima de estoque por cor",
  preco: "Defina a faixa de preço unitário desejada",
  fornecedores: "Selecione um ou mais fornecedores",
  publico: "Filtre por público-alvo do produto",
  "datas-comemorativas": "Encontre produtos ideais para cada data",
  endomarketing: "Produtos para ações de endomarketing",
  materiais: "Filtre por tipo de material e acabamento",
  "ramos-atividade": "Filtre por ramo de atividade e segmento",
  tecnicas: "Selecione técnicas de gravação disponíveis",
  tags: "Etiquetas e classificações adicionais",
  "opcoes-rapidas": "Atalhos para filtros comuns",
  ordenacao: "Defina a ordem de exibição dos resultados",
};

export function FilterSection({
  id, title, icon, children, openSections, onToggle, activeCount, activeSummary,
}: {
  id: string; title: string; icon?: React.ReactNode; children: React.ReactNode;
  openSections: string[]; onToggle: (id: string) => void;
  activeCount?: number; activeSummary?: string;
}) {
  const isOpen = openSections.includes(id);
  const hasActive = (activeCount ?? 0) > 0;
  const iconColor = SECTION_ICON_COLORS[id] || "text-muted-foreground";
  const tooltip = SECTION_TOOLTIPS[id];

  return (
    <Collapsible open={isOpen} onOpenChange={() => onToggle(id)}>
      <div className={cn("transition-all duration-200 border-l-[3px]", hasActive ? "border-l-orange bg-orange/5" : "border-l-transparent hover:border-l-muted-foreground/20")}>
        <CollapsibleTrigger className={cn(
          "flex items-center justify-between w-full py-2.5 px-3 text-sm font-medium transition-all duration-200 group",
          isOpen ? "text-orange" : hasActive ? "text-foreground" : "text-foreground/80 hover:text-foreground"
        )}>
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {icon && <span className={cn("transition-colors duration-200 shrink-0", isOpen ? "text-orange" : iconColor)}>{icon}</span>}
            <span className="truncate">{title}</span>
            {hasActive && !isOpen && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 text-[10px] font-bold rounded-full bg-orange text-orange-foreground shrink-0 animate-scale-in">{activeCount}</span>
            )}
            {tooltip && (
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <span className="opacity-0 group-hover:opacity-40 transition-opacity text-muted-foreground shrink-0 cursor-help">
                    <SlidersHorizontal className="h-3 w-3" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-48 text-xs bg-card border-border z-[100]">{tooltip}</TooltipContent>
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isOpen && activeSummary && <span className="text-[10px] text-muted-foreground max-w-24 truncate hidden sm:inline">{activeSummary}</span>}
            <span className={cn("transition-all duration-200", "group-hover:text-orange", isOpen ? "text-orange" : "text-muted-foreground/50")}>
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="pb-3 px-3 space-y-2">{isOpen && children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function GroupSeparator({ label, icon: Icon }: { label: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-2 pt-4 pb-1 px-1 first:pt-1">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.15em] text-muted-foreground/60 uppercase shrink-0">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border/60 to-transparent" />
    </div>
  );
}
