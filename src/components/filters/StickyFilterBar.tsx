import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, ArrowUpDown, X, ChevronUp, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SORT_OPTIONS } from "@/constants/filters";

interface StickyFilterBarProps {
  isVisible: boolean;
  activeFiltersCount: number;
  totalProducts: number;
  sortBy: string;
  onSortChange: (value: string) => void;
  onOpenFilters: () => void;
  onClearFilters: () => void;
  onScrollToTop: () => void;
  viewMode: "grid" | "list" | "table";
  onViewModeChange: (mode: "grid" | "list" | "table") => void;
}

export function StickyFilterBar({
  isVisible,
  activeFiltersCount,
  totalProducts,
  sortBy,
  onSortChange,
  onOpenFilters,
  onClearFilters,
  onScrollToTop,
  viewMode,
  onViewModeChange,
}: StickyFilterBarProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-[4.5rem] left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border shadow-lg"
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Left side - Filters */}
              <div className="flex items-center gap-3">
                {/* Botão Filtros */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenFilters}
                  className="gap-2"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Filtros</span>
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>

                {/* Limpar filtros (se houver) */}
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearFilters}
                    className="gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                    <span className="hidden sm:inline">Limpar</span>
                  </Button>
                )}

                {/* Contador de produtos */}
                <span className="text-sm text-muted-foreground hidden md:block">
                  <strong className="text-foreground">{totalProducts}</strong> produtos
                </span>
              </div>

              {/* Right side - Sort & View */}
              <div className="flex items-center gap-2">
                {/* View mode toggle */}
                <div className="hidden sm:flex border border-border rounded-lg p-0.5">
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="icon" aria-label="LayoutGrid"
                    className="h-7 w-7"
                    onClick={() => onViewModeChange("grid")}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="icon" aria-label="Lista"
                    className="h-7 w-7"
                    onClick={() => onViewModeChange("list")}
                  >
                    <List className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Sort */}
                <Select value={sortBy} onValueChange={onSortChange}>
                  <SelectTrigger className="w-[180px] h-8 text-sm">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Voltar ao topo */}
                <Button
                  variant="secondary"
                  size="icon" aria-label="Expandir"
                  className="h-8 w-8"
                  onClick={onScrollToTop}
                  title="Voltar ao topo"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Barra de filtros compacta para ficar fixa DENTRO do grid de produtos
interface InlineFilterBarProps {
  activeFiltersCount: number;
  totalProducts: number;
  sortBy: string;
  onSortChange: (value: string) => void;
  onOpenFilters: () => void;
  onClearFilters: () => void;
  viewMode: "grid" | "list" | "table";
  onViewModeChange: (mode: "grid" | "list" | "table") => void;
  columnSelector?: React.ReactNode;
}

export function InlineFilterBar({
  activeFiltersCount,
  totalProducts,
  sortBy,
  onSortChange,
  onOpenFilters,
  onClearFilters,
  viewMode,
  onViewModeChange,
  columnSelector,
}: InlineFilterBarProps) {
  return (
    <div className="flex items-center justify-between gap-3">
        {/* Left side - Filters */}
        <div className="flex items-center gap-2">
          {/* Botão Filtros */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenFilters}
            className="gap-2 h-8"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs">Filtros</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>

          {/* Limpar filtros (se houver) */}
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="gap-1 text-muted-foreground hover:text-foreground h-8 px-2"
            >
              <X className="h-3 w-3" />
              <span className="hidden sm:inline text-xs">Limpar</span>
            </Button>
          )}

          {/* Contador de produtos */}
          <span className="text-xs text-muted-foreground">
            <strong className="text-foreground">{totalProducts}</strong> produtos
          </span>
        </div>

        {/* Right side - Sort & View */}
        <div className="flex items-center gap-2">
          {/* Column selector */}
          {viewMode === "grid" && columnSelector}
          {/* View mode toggle */}
          <div className="hidden sm:flex border border-border rounded-md p-0.5">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon" aria-label="LayoutGrid"
              className="h-6 w-6"
              onClick={() => onViewModeChange("grid")}
            >
              <LayoutGrid className="h-3 w-3" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon" aria-label="Lista"
              className="h-6 w-6"
              onClick={() => onViewModeChange("list")}
            >
              <List className="h-3 w-3" />
            </Button>
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
  );
}
