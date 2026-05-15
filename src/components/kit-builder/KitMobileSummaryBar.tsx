/**
 * Mobile Sticky Bottom Summary
 * Shows price/volume/weight at-a-glance and opens a drawer with full sidebar content.
 */
import { useState } from "react";
import { ChevronUp, Package } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, type KitState } from "@/lib/kit-builder";
import { cn } from "@/lib/utils";

interface KitMobileSummaryBarProps {
  kitState: KitState;
  kitQuantity: number;
  children: React.ReactNode;
}

export function KitMobileSummaryBar({ kitState, kitQuantity, children }: KitMobileSummaryBarProps) {
  const [open, setOpen] = useState(false);
  const grandTotal = kitState.totalPrice * kitQuantity;
  const volume = Math.round(kitState.volumeUsagePercent);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <DrawerTrigger asChild>
          <button
            className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left"
            aria-label="Abrir resumo do kit"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight truncate">
                  {formatCurrency(kitState.totalPrice)}
                  <span className="text-muted-foreground font-normal"> /kit</span>
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Total {formatCurrency(grandTotal)} · {kitQuantity}x
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {kitState.box && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px]",
                    volume > 100 && "border-destructive text-destructive",
                    volume > 80 && volume <= 100 && "border-warning text-warning",
                  )}
                >
                  {volume}%
                </Badge>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" tabIndex={-1}>
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </button>
        </DrawerTrigger>
      </div>
      <DrawerContent className="max-h-[90vh]">
        {/* Visual drag handle (vaul renders one but we reinforce visibility) */}
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-muted-foreground/30" aria-hidden />
        <DrawerHeader className="pb-2">
          <DrawerTitle className="font-display">Resumo do Kit</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-8 overflow-y-auto space-y-4 scrollbar-thin">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
