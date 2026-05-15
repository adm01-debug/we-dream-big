/**
 * VariantGridMatrix — Grade visual Cor × Tamanho (refactored)
 * Helpers in ./variant-grid/
 */
import { useMemo, useState, useCallback } from "react";
import { Check, Package, Ruler, CheckSquare, Square, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { BulkToolbar } from "./variant-grid/BulkToolbar";
import { getSizeOrder, isLightColor, formatStock, stockColor } from "./variant-grid/VariantGridHelpers";

export interface VariantGridItem {
  id: string; color_name: string; color_hex: string; size_code?: string | null;
  stock: number; sku?: string; image?: string | null; price?: number | null;
}

export interface BulkAction { type: "toggle_active" | "update_stock"; variantIds: string[]; value?: boolean | number; }

interface VariantGridMatrixProps {
  variants: VariantGridItem[]; selectedId?: string | null; onSelect?: (variant: VariantGridItem) => void;
  mode?: "view" | "admin"; compact?: boolean; onBulkAction?: (action: BulkAction) => Promise<void>; isBulkLoading?: boolean;
}

export function VariantGridMatrix({ variants, selectedId, onSelect, mode = "view", compact = false, onBulkAction, isBulkLoading = false }: VariantGridMatrixProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const isAdmin = mode === "admin" && !!onBulkAction;

  const { colors, sizes, matrix, hasSizes, allVariantIds } = useMemo(() => {
    const colorMap = new Map<string, { name: string; hex: string }>();
    const sizeSet = new Set<string>();
    const allIds: string[] = [];
    for (const v of variants) {
      if (!colorMap.has(v.color_name)) colorMap.set(v.color_name, { name: v.color_name, hex: v.color_hex });
      if (v.size_code) sizeSet.add(v.size_code);
      allIds.push(v.id);
    }
    const colors = Array.from(colorMap.values());
    const sizes = Array.from(sizeSet).sort((a, b) => getSizeOrder(a) - getSizeOrder(b));
    const matrix = new Map<string, Map<string, VariantGridItem>>();
    for (const v of variants) { const sk = v.size_code || "__none__"; if (!matrix.has(v.color_name)) matrix.set(v.color_name, new Map()); matrix.get(v.color_name)!.set(sk, v); }
    return { colors, sizes, matrix, hasSizes: sizes.length > 0, allVariantIds: allIds };
  }, [variants]);

  const toggleSelection = useCallback((id: string) => { setSelectedIds(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }, []);
  const selectAll = useCallback(() => setSelectedIds(new Set(allVariantIds)), [allVariantIds]);
  const deselectAll = useCallback(() => setSelectedIds(new Set()), []);
  const toggleRowSelection = useCallback((colorName: string) => {
    const rowIds = variants.filter(v => v.color_name === colorName).map(v => v.id);
    setSelectedIds(p => { const n = new Set(p); const all = rowIds.every(id => n.has(id)); if (all) rowIds.forEach(id => n.delete(id)); else rowIds.forEach(id => n.add(id)); return n; });
  }, [variants]);
  const handleBulkToggle = useCallback(async (active: boolean) => { if (!onBulkAction || !selectedIds.size) return; await onBulkAction({ type: "toggle_active", variantIds: Array.from(selectedIds), value: active }); setSelectedIds(new Set()); }, [onBulkAction, selectedIds]);
  const handleBulkStock = useCallback(async (stock: number) => { if (!onBulkAction || !selectedIds.size) return; await onBulkAction({ type: "update_stock", variantIds: Array.from(selectedIds), value: stock }); setSelectedIds(new Set()); }, [onBulkAction, selectedIds]);

  if (!variants.length) return null;
  const showBulkBar = isAdmin && selectedIds.size > 0;

  // Single-axis (only colors)
  if (!hasSizes) {
    return (
      <div className="space-y-3">
        {showBulkBar && <BulkToolbar selectedCount={selectedIds.size} totalCount={allVariantIds.length} onSelectAll={selectAll} onDeselectAll={deselectAll} onToggleActive={handleBulkToggle} onUpdateStock={handleBulkStock} isLoading={isBulkLoading} />}
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Package className="h-4 w-4 text-primary" />Variações de Cor ({colors.length})</h4>
        <div className="flex flex-wrap gap-2">
          {colors.map(color => {
            const variant = matrix.get(color.name)?.get("__none__"); if (!variant) return null;
            const isSelected = selectedId === variant.id; const isBulk = selectedIds.has(variant.id); const stock = Math.max(0, variant.stock);
            return (
              <Tooltip key={variant.id}><TooltipTrigger asChild>
                <button 
                  onClick={() => isAdmin ? toggleSelection(variant.id) : onSelect?.(variant)} 
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all text-sm",
                    isBulk ? "border-primary bg-primary/15 ring-2 ring-primary/30" : 
                    isSelected ? "border-primary bg-primary/10 ring-1 ring-primary/20" : 
                    "border-border bg-card hover:border-primary/40", 
                    stock === 0 && "bg-destructive/5 border-destructive/20"
                  )}
                >
                  {isAdmin && (isBulk ? <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" /> : <Square className="h-3.5 w-3.5 text-muted-foreground shrink-0" />)}
                  <div className="w-4 h-4 rounded-full border border-border shrink-0" style={{ backgroundColor: color.hex || "hsl(var(--muted))" }} />
                  <span className="font-medium">{color.name}</span>
                  <span className={cn("text-xs font-mono", stockColor(stock), stock === 0 && "font-bold")}>
                    {formatStock(stock)}
                  </span>
                </button></TooltipTrigger>
                <TooltipContent>{variant.sku && <p className="font-mono text-xs">{variant.sku}</p>}<p>{stock} un. em estoque</p>{isAdmin && <p className="text-xs text-muted-foreground">Clique para selecionar</p>}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    );
  }

  // Multi-axis grid (Color × Size)
  return (
    <div className="space-y-3">
      {showBulkBar && <BulkToolbar selectedCount={selectedIds.size} totalCount={allVariantIds.length} onSelectAll={selectAll} onDeselectAll={deselectAll} onToggleActive={handleBulkToggle} onUpdateStock={handleBulkStock} isLoading={isBulkLoading} />}
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Ruler className="h-4 w-4 text-primary" />Grade Cor × Tamanho
        <Badge variant="secondary" className="text-[10px] px-1.5">{colors.length} cores × {sizes.length} tamanhos</Badge>
        {isAdmin && !selectedIds.size && <span className="text-[10px] text-muted-foreground ml-auto font-normal">Clique nas células para selecionar</span>}
      </h4>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead><tr className="bg-muted/50">
            {isAdmin && <th className={cn("sticky left-0 z-20 bg-muted/80 backdrop-blur-sm text-center border-b border-r border-border w-8", compact ? "px-1 py-1.5" : "px-2 py-2")}>
              <button onClick={selectedIds.size === allVariantIds.length ? deselectAll : selectAll} className="hover:text-primary transition-colors" aria-label="Selecionar todos">
                {selectedIds.size === allVariantIds.length ? <CheckSquare className="h-3.5 w-3.5 text-primary mx-auto" /> : selectedIds.size > 0 ? <Minus className="h-3.5 w-3.5 text-primary mx-auto" /> : <Square className="h-3.5 w-3.5 text-muted-foreground mx-auto" />}
              </button></th>}
            <th className={cn("sticky bg-muted/80 backdrop-blur-sm text-left font-semibold text-muted-foreground border-b border-r border-border", isAdmin ? "left-8 z-10" : "left-0 z-10", compact ? "px-2 py-1.5" : "px-3 py-2")}>Cor</th>
            {sizes.map(size => <th key={size} className={cn("text-center font-semibold text-muted-foreground border-b border-border whitespace-nowrap", compact ? "px-2 py-1.5" : "px-3 py-2")}>{size}</th>)}
          </tr></thead>
          <tbody>
            {colors.map((color, rowIdx) => {
              const rowIds = variants.filter(v => v.color_name === color.name).map(v => v.id);
              const allRow = rowIds.length > 0 && rowIds.every(id => selectedIds.has(id));
              const someRow = rowIds.some(id => selectedIds.has(id));
              return (
                <tr key={color.name} className={cn("transition-colors hover:bg-accent/30", rowIdx % 2 === 0 ? "bg-card" : "bg-muted/20", someRow && "bg-primary/5")}>
                  {isAdmin && <td className={cn("sticky left-0 z-10 text-center border-r border-border w-8", compact ? "px-1 py-1.5" : "px-2 py-2.5", rowIdx % 2 === 0 ? "bg-card" : "bg-muted/20", someRow && "bg-primary/5")}>
                    <button onClick={() => toggleRowSelection(color.name)} className="hover:text-primary transition-colors">
                      {allRow ? <CheckSquare className="h-3.5 w-3.5 text-primary mx-auto" /> : someRow ? <Minus className="h-3.5 w-3.5 text-primary mx-auto" /> : <Square className="h-3.5 w-3.5 text-muted-foreground mx-auto" />}
                    </button></td>}
                  <td className={cn("sticky border-r border-border font-medium whitespace-nowrap", isAdmin ? "left-8 z-10" : "left-0 z-10", compact ? "px-2 py-1.5" : "px-3 py-2.5", rowIdx % 2 === 0 ? "bg-card" : "bg-muted/20", someRow && "bg-primary/5")}>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border border-border shrink-0" style={{ backgroundColor: color.hex || "hsl(var(--muted))", border: isLightColor(color.hex) ? "1px solid hsl(var(--border))" : undefined }} />
                      <span className="truncate max-w-[100px]">{color.name}</span>
                    </div></td>
                  {sizes.map(size => {
                    const variant = matrix.get(color.name)?.get(size);
                    if (!variant) return <td key={size} className={cn("text-center border-border", compact ? "px-2 py-1.5" : "px-3 py-2.5")}><span className="text-muted-foreground/30">—</span></td>;
                    const stock = Math.max(0, variant.stock); const isItem = selectedId === variant.id; const isBulk = selectedIds.has(variant.id);
                    return (
                      <td key={size} className={cn("text-center border-border", compact ? "px-1 py-1" : "px-2 py-2")}>
                        <Tooltip><TooltipTrigger asChild>
                          <button 
                            onClick={() => isAdmin ? toggleSelection(variant.id) : onSelect?.(variant)} 
                            className={cn(
                              "w-full min-w-[3rem] py-1.5 px-2 rounded-md transition-all text-xs font-medium",
                              isBulk ? "bg-primary/20 text-primary ring-2 ring-primary/40 shadow-sm" : 
                              isItem ? "bg-primary text-primary-foreground ring-2 ring-primary/30 shadow-sm" : 
                              stock > 0 ? "bg-secondary/60 hover:bg-secondary text-foreground hover:shadow-sm" : 
                              "bg-destructive/10 text-destructive font-bold border border-destructive/20",
                              (stock > 0 || isAdmin) && !isItem && "hover:scale-105"
                            )}
                          >
                            {isBulk && <Check className="inline-block h-3 w-3 mr-0.5 -mt-0.5 text-primary" />}
                            {isItem && !isBulk && <Check className="inline-block h-3 w-3 mr-0.5 -mt-0.5" />}
                            {formatStock(stock)}
                          </button></TooltipTrigger>
                          <TooltipContent side="top" className="text-xs"><div className="space-y-0.5"><p className="font-semibold">{color.name} — {size}</p>{variant.sku && <p className="font-mono text-muted-foreground">{variant.sku}</p>}
                            {variant.price !== null && <p className="text-primary font-medium">R$ {variant.price.toFixed(2)}</p>}<p className={stockColor(stock)}>{stock > 0 ? `${stock.toLocaleString("pt-BR")} un. disponíveis` : "Sem estoque"}</p></div></TooltipContent>
                        </Tooltip></td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr className="bg-muted/60 font-semibold">
            {isAdmin && <td className={cn("sticky left-0 z-10 bg-muted/60 border-t border-r border-border", compact ? "px-1 py-1.5" : "px-2 py-2")} />}
            <td className={cn("sticky bg-muted/60 border-t border-r border-border text-muted-foreground", isAdmin ? "left-8 z-10" : "left-0 z-10", compact ? "px-2 py-1.5" : "px-3 py-2")}>Total</td>
            {sizes.map(size => { let total = 0; for (const c of colors) { const v = matrix.get(c.name)?.get(size); if (v) total += Math.max(0, v.stock); }
              return <td key={size} className={cn("text-center border-t border-border", compact ? "px-2 py-1.5" : "px-3 py-2", stockColor(total))}>{formatStock(total)}</td>;
            })}
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}
