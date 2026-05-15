import { useState, useMemo } from "react";
import {
  Package, Palette, Weight, Layers, BoxSelect, ShoppingBag,
  ChevronUp, ChevronDown, Box,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { KitComponent } from "@/types/product-catalog";
import { KitComponentCard } from "./kit-composition/KitComponentCard";

interface KitCompositionProps {
  items: KitComponent[];
  onViewProduct?: (productId: string) => void;
}

export function KitComposition({ items, onViewProduct }: KitCompositionProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({ packaging: true, products: true });

  const stats = useMemo(() => {
    const totalPieces = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalWeight = items.reduce((sum, item) => sum + (item.weightG ?? 0) * item.quantity, 0);
    const packagingCount = items.filter((i) => i.isPackaging).length;
    const productCount = items.filter((i) => !i.isPackaging).length;
    const personalizableCount = items.filter((i) => i.allowsPersonalization).length;
    return { totalPieces, totalWeight, packagingCount, productCount, personalizableCount };
  }, [items]);

  const formatWeight = (grams: number) => grams >= 1000 ? `${(grams / 1000).toFixed(1)} kg` : `${grams} g`;

  const packagingItems = items.filter((i) => i.isPackaging);
  const productItems = items.filter((i) => !i.isPackaging);

  return (
    <>
      {/* Trigger Card */}
      <div
        className="rounded-xl border border-border bg-card overflow-hidden shadow-sm cursor-pointer hover:border-primary/40 transition-all group"
        onClick={() => setDialogOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setDialogOpen(true)}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="font-display font-semibold text-foreground text-base">Composição do Kit</h3>
              <span className="text-xs text-muted-foreground">{items.length} componentes • {stats.totalPieces} peças</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex -space-x-2">
              {items.slice(0, 4).map((item) => (
                <div key={item.id} className="w-8 h-8 rounded-lg bg-muted border-2 border-card flex items-center justify-center overflow-hidden">
                  {item.imageUrl ? 
<img src={item.imageUrl} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" /> : <Package className="h-3.5 w-3.5 text-muted-foreground/50" />}
                </div>
              ))}
              {items.length > 4 && <div className="w-8 h-8 rounded-lg bg-muted border-2 border-card flex items-center justify-center text-[10px] font-bold text-muted-foreground">+{items.length - 4}</div>}
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>

      {/* Dialog Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[72vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Layers className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Composição do Kit</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-0.5">
                  {items.length} {items.length === 1 ? "componente" : "componentes"} • {stats.totalPieces} {stats.totalPieces === 1 ? "peça" : "peças"}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {stats.productCount > 0 && <Badge variant="secondary" className="text-xs gap-1.5 px-2.5 py-1"><ShoppingBag className="h-3 w-3" />{stats.productCount} {stats.productCount === 1 ? "item" : "itens"}</Badge>}
              {stats.packagingCount > 0 && <Badge variant="secondary" className="text-xs gap-1.5 px-2.5 py-1"><BoxSelect className="h-3 w-3" />{stats.packagingCount} {stats.packagingCount === 1 ? "embalagem" : "embalagens"}</Badge>}
              {stats.personalizableCount > 0 && <Badge variant="outline" className="text-xs gap-1.5 px-2.5 py-1 text-primary border-primary/30"><Palette className="h-3 w-3" />{stats.personalizableCount} personalizáveis</Badge>}
              {stats.totalWeight > 0 && <Badge variant="outline" className="text-xs gap-1.5 px-2.5 py-1"><Weight className="h-3 w-3" />{formatWeight(stats.totalWeight)} total</Badge>}
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(72vh-160px)]">
            <div className="px-6 py-4 space-y-5">
              {packagingItems.length > 0 && (
                <Collapsible open={expandedSections.packaging} onOpenChange={(open) => setExpandedSections((s) => ({ ...s, packaging: open }))}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 bg-warning/5 border border-warning/20 rounded-lg hover:bg-warning/10 transition-colors">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-warning dark:text-warning flex items-center gap-1.5"><Box className="h-3.5 w-3.5" />Embalagem ({packagingItems.length})</span>
                    {expandedSections.packaging ? <ChevronUp className="h-4 w-4 text-warning dark:text-warning" /> : <ChevronDown className="h-4 w-4 text-warning dark:text-warning" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-3 space-y-3">
                      {packagingItems.map((item, idx) => (
                        <KitComponentCard key={item.id} item={item} index={idx + 1} variant="packaging" onViewProduct={onViewProduct} onZoomImage={(url) => setZoomImageUrl(url)} />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {productItems.length > 0 && (
                <Collapsible open={expandedSections.products} onOpenChange={(open) => setExpandedSections((s) => ({ ...s, products: open }))}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors border border-border/50">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><ShoppingBag className="h-3.5 w-3.5" />Itens do Kit ({productItems.length})</span>
                    {expandedSections.products ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-3 space-y-3">
                      {productItems.map((item, idx) => (
                        <KitComponentCard key={item.id} item={item} index={idx + 1} variant="item" onViewProduct={onViewProduct} onZoomImage={(url) => setZoomImageUrl(url)} />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Image Zoom Dialog */}
      <Dialog open={!!zoomImageUrl} onOpenChange={() => setZoomImageUrl(null)}>
        <DialogContent className="max-w-2xl p-2 bg-background/95 backdrop-blur-xl">
          {zoomImageUrl && 
<img src={zoomImageUrl} alt="Zoom" className="w-full h-auto max-h-[80vh] object-contain rounded-lg" loading="lazy" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
