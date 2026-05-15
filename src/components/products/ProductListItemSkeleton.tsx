import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton para ProductListItem — espelha o layout horizontal compacto.
 * Thumb 56-72px | Info (meta + nome + stock) | Preço | Actions
 */
export function ProductListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-card border border-border/40 relative overflow-hidden">
      {/* Shimmer overlay */}
      <div className="absolute inset-0 bg-shimmer animate-shimmer pointer-events-none" />

      {/* Thumbnail */}
      <Skeleton className="w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-lg shrink-0 bg-muted/40" />

      {/* Info block */}
      <div className="flex-1 min-w-0 py-0.5 space-y-1.5">
        {/* Meta: category + supplier */}
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3 w-16 opacity-50" />
          <Skeleton className="h-3 w-12 opacity-40" />
        </div>
        {/* Name */}
        <Skeleton className="h-4 w-3/5 opacity-80" />
        {/* Stock + SKU */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-24 opacity-50" />
          <Skeleton className="h-3 w-12 hidden sm:block opacity-30" />
        </div>
      </div>

      {/* Price */}
      <div className="shrink-0 text-right min-w-[80px] sm:min-w-[100px]">
        <Skeleton className="h-5 w-16 ml-auto opacity-70" />
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-0.5">
        <Skeleton className="h-7 w-7 rounded-full opacity-40" />
        <Skeleton className="h-7 w-7 rounded-full opacity-40" />
        <Skeleton className="h-7 w-7 rounded-full hidden sm:block opacity-40" />
      </div>
    </div>
  );
}

export function ProductListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2 will-change-transform">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className=""
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <ProductListItemSkeleton />
        </div>
      ))}
    </div>
  );
}
