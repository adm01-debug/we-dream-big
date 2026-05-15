/**
 * Kit Visual Preview
 * Schematic representation of the box with items
 */

import { Package, Box } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { KitState } from '@/lib/kit-builder';

interface KitVisualPreviewProps {
  kitState: KitState;
}

export function KitVisualPreview({ kitState }: KitVisualPreviewProps) {
  const { box, items, volumeUsagePercent } = kitState;

  if (!box) return null;

  // Calculate proportional sizes for items based on volume
  const maxItemVolume = Math.max(...items.map(i => i.volume * i.quantity), 1);

  const fillColor = volumeUsagePercent > 100
    ? 'bg-destructive/20 border-destructive'
    : volumeUsagePercent > 80
    ? 'bg-warning/20 border-warning'
    : 'bg-primary/10 border-primary/30';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Box className="h-4 w-4 text-primary" />
          Preview Visual
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Box schematic */}
          <div className={cn(
            "relative border-2 border-dashed rounded-xl p-4 min-h-[200px] transition-colors",
            fillColor
          )}>
            {/* Box label */}
            <div className="absolute top-2 left-3 flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">{box.name}</span>
            </div>
            <Badge variant="outline" className="absolute top-2 right-3 text-[10px]">
              {Math.round(volumeUsagePercent)}% ocupado
            </Badge>

            {/* Items grid inside box */}
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {items.map((item) => {
                const relativeSize = Math.max(40, Math.min(80, (item.volume / maxItemVolume) * 80));
                return (
                  <div
                    key={item.id}
                    className="flex flex-col items-center gap-1"
                  >
                    <div
                      className="rounded-lg bg-card border shadow-sm flex items-center justify-center overflow-hidden"
                      style={{ width: relativeSize, height: relativeSize }}
                    >
                      {item.imageUrl ? (
                        
<img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain p-1"  loading="lazy" />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground text-center max-w-[80px] truncate">
                      {item.quantity > 1 && `${item.quantity}x `}{item.name}
                    </span>
                  </div>
                );
              })}
            </div>

            {items.length === 0 && (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Adicione itens ao kit
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground justify-center">
            <span>📦 {box.name}</span>
            <span>•</span>
            <span>{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
            <span>•</span>
            <span>{Math.round(volumeUsagePercent)}% volume</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
