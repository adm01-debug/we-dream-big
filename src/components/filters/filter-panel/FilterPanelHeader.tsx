import React from "react";
import { SlidersHorizontal, RefreshCw, ChevronsUpDown, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface FilterPanelHeaderProps {
  activeFiltersCount: number;
  onReset: () => void;
  collapseAllSections: () => void;
  filterSearch: string;
  setFilterSearch: (v: string) => void;
}

export function FilterPanelHeader({
  activeFiltersCount, onReset, collapseAllSections, filterSearch, setFilterSearch,
}: FilterPanelHeaderProps) {
  return (
    <div className="pb-3 mb-1">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange to-orange-hover flex items-center justify-center shadow-md shadow-orange/20">
            <SlidersHorizontal className="h-4 w-4 text-orange-foreground" />
          </div>
          <div>
            <h3 className="font-display font-bold text-sm text-foreground tracking-tight">Filtros</h3>
            {activeFiltersCount > 0 ? (
              <span className="text-[10px] text-orange font-medium">
                {activeFiltersCount} filtro{activeFiltersCount > 1 ? 's' : ''} ativo{activeFiltersCount > 1 ? 's' : ''}
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground/50">Refine sua busca</span>
            )}
          </div>
        </div>
        {activeFiltersCount > 0 && (
          <span className="inline-flex items-center justify-center h-7 min-w-7 px-2 text-xs font-bold rounded-full bg-orange text-orange-foreground shadow-sm shadow-orange/30 animate-scale-in">
            {activeFiltersCount}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { onReset(); toast.success('Filtros resetados'); }}
              className={cn(
                "text-xs h-7 px-3 gap-1.5 transition-all",
                activeFiltersCount > 0
                  ? "border-orange/40 text-orange hover:bg-orange/10 hover:text-orange"
                  : "border-border/50 text-muted-foreground/50 cursor-not-allowed"
              )}
              disabled={activeFiltersCount === 0}
              aria-label="Resetar todos os filtros"
            >
              <RefreshCw className="h-3 w-3" />
              Reset
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs bg-card border-border">Limpar todos os filtros ativos</TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={collapseAllSections}
              className="text-xs h-7 px-3 gap-1.5 border-border/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              aria-label="Fechar todas as seções de filtro"
            >
              <ChevronsUpDown className="h-3 w-3" />
              Fechar
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs bg-card border-border">Recolher todas as seções</TooltipContent>
        </Tooltip>
      </div>

      <div className="relative mt-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-orange z-10" />
        <Input
          placeholder="Buscar filtro..."
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          className="h-8 text-xs pl-8 pr-8 bg-muted/30 border-border/40 placeholder:text-muted-foreground/40 focus:border-orange/50"
          aria-label="Buscar seção de filtro por nome"
        />
        {filterSearch && (
          <button type="button" onClick={() => setFilterSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
