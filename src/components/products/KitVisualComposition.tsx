/**
 * KitVisualComposition — visualização em grade dos itens de um kit, com imagens e legendas.
 */
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Package } from "lucide-react";

export interface KitItem {
  id: string;
  name: string;
  imageUrl?: string | null;
  quantity?: number;
}

interface KitVisualCompositionProps {
  items: KitItem[];
  className?: string;
}

export function KitVisualComposition({ items, className }: KitVisualCompositionProps) {
  if (!items.length) {
    return (
      <Card className={cn("flex items-center justify-center p-8 text-muted-foreground", className)}>
        <Package className="h-5 w-5 mr-2" /> Kit vazio
      </Card>
    );
  }
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-3", className)}>
      {items.map((item) => (
        <Card key={item.id} className="overflow-hidden">
          <div className="aspect-square bg-muted flex items-center justify-center">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <Package className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="p-2 text-xs">
            <p className="font-medium truncate">{item.name}</p>
            {item.quantity !== null && <p className="text-muted-foreground">x{item.quantity}</p>}
          </div>
        </Card>
      ))}
    </div>
  );
}
