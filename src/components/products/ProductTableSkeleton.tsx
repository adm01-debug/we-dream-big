import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ProductTableSkeletonProps {
  rows?: number;
  className?: string;
}

export function ProductTableSkeleton({ rows = 10, className }: ProductTableSkeletonProps) {
  return (
    <div className={cn("w-full border border-border/40 rounded-xl overflow-hidden bg-card", className)}>
      {/* Header */}
      <div className="flex items-center px-4 py-2.5 bg-muted/40 border-b border-border/50">
        <div className="w-12 px-2"><Skeleton className="h-4 w-4" /></div>
        <div className="flex-1 px-3"><Skeleton className="h-3 w-16" /></div>
        <div className="w-32 px-3 hidden md:block"><Skeleton className="h-3 w-12" /></div>
        <div className="w-40 px-3 hidden lg:block"><Skeleton className="h-3 w-20" /></div>
        <div className="w-32 px-3 hidden sm:block"><Skeleton className="h-3 w-12" /></div>
        <div className="w-32 px-3 text-right"><Skeleton className="h-3 w-12 ml-auto" /></div>
        <div className="w-32 px-3 text-right"><Skeleton className="h-3 w-10 ml-auto" /></div>
        <div className="w-48 px-3"><Skeleton className="h-3 w-16 mx-auto" /></div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/30">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center px-4 h-14 relative overflow-hidden">
             {/* Shimmer effect */}
            <div className="absolute inset-0 bg-shimmer animate-shimmer pointer-events-none" />
            
            <div className="w-12 px-2">
              <Skeleton className="w-10 h-10 rounded-md bg-muted/40" />
            </div>
            <div className="flex-1 px-3 space-y-2">
              <Skeleton className="h-4 w-48 bg-muted/50" />
              <div className="flex gap-2">
                 <Skeleton className="h-3 w-16 bg-muted/30 md:hidden" />
                 <Skeleton className="h-3 w-12 bg-muted/30" />
              </div>
            </div>
            <div className="w-32 px-3 hidden md:block">
              <Skeleton className="h-3 w-20 bg-muted/40" />
            </div>
            <div className="w-40 px-3 hidden lg:block">
              <Skeleton className="h-3 w-24 bg-muted/40" />
            </div>
            <div className="w-32 px-3 hidden sm:flex gap-1">
              {[1, 2, 3].map(j => (
                <Skeleton key={j} className="w-3.5 h-3.5 rounded-full bg-muted/40" />
              ))}
            </div>
            <div className="w-32 px-3 text-right">
              <Skeleton className="h-4 w-16 bg-muted/50 ml-auto" />
            </div>
            <div className="w-32 px-3 text-right">
              <Skeleton className="h-4 w-12 bg-muted/40 ml-auto" />
            </div>
            <div className="w-48 px-3 flex justify-center gap-2">
              {[1, 2, 3, 4].map(j => (
                <Skeleton key={j} className="w-8 h-8 rounded-full bg-muted/30" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
