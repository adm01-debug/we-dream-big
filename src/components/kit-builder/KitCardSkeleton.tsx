/**
 * Kit Card Skeleton — content-shaped loaders
 * Replaces generic rectangles with skeletons that mirror real card layout
 * (image, title, sku, badge, price) to eliminate CLS.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function ItemCardSkeleton() {
  return (
    <Card className="rounded-xl border-border/40">
      <CardContent className="p-3">
        <div className="flex gap-3">
          <Skeleton className="w-14 h-14 rounded-md flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-3.5 w-4/5 rounded" />
            <Skeleton className="h-3 w-1/3 rounded" />
            <div className="flex justify-between items-center pt-1">
              <Skeleton className="h-3 w-12 rounded" />
              <Skeleton className="h-3.5 w-16 rounded" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-7 w-20 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}

export function BoxCardSkeleton() {
  return (
    <Card className="rounded-xl border-border/40">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/3 rounded" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-3 w-12 rounded" />
            </div>
            <Skeleton className="h-4 w-20 rounded mt-1" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
