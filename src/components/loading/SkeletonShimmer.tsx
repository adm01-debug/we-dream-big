import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

/**
 * Enhanced Skeleton with shimmer effect
 * Provides consistent loading states across the application
 */

interface SkeletonShimmerProps {
  className?: string;
  children?: ReactNode;
}

export function SkeletonShimmer({ className, children }: SkeletonShimmerProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted",
        "before:absolute before:inset-0",
        "before:-translate-x-full before:animate-shimmer",
        "before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
        className
      )}
      aria-hidden="true"
      role="presentation"
    >
      {children}
    </div>
  );
}

// Text skeleton variants
interface TextSkeletonProps {
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}

export function TextSkeleton({ 
  lines = 3, 
  className,
  lastLineWidth = "60%" 
}: TextSkeletonProps) {
  return (
    <div className={cn("space-y-2", className)} aria-label="Carregando texto...">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonShimmer
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 ? `w-[${lastLineWidth}]` : "w-full"
          )}
          style={i === lines - 1 ? { width: lastLineWidth } : undefined}
        />
      ))}
    </div>
  );
}

// Card skeleton
interface CardSkeletonProps {
  showImage?: boolean;
  showActions?: boolean;
  className?: string;
}

export function CardSkeleton({ 
  showImage = true, 
  showActions = true,
  className 
}: CardSkeletonProps) {
  return (
    <div 
      className={cn(
        "rounded-xl border bg-card p-4 space-y-4",
        className
      )}
      aria-label="Carregando card..."
    >
      {showImage && (
        <SkeletonShimmer className="h-40 w-full rounded-lg" />
      )}
      <div className="space-y-2">
        <SkeletonShimmer className="h-5 w-3/4" />
        <SkeletonShimmer className="h-4 w-1/2" />
      </div>
      <TextSkeleton lines={2} />
      {showActions && (
        <div className="flex gap-2 pt-2">
          <SkeletonShimmer className="h-9 w-24 rounded-md" />
          <SkeletonShimmer className="h-9 w-24 rounded-md" />
        </div>
      )}
    </div>
  );
}

// Table row skeleton
interface TableRowSkeletonProps {
  columns?: number;
  className?: string;
}

export function TableRowSkeleton({ 
  columns = 5, 
  className 
}: TableRowSkeletonProps) {
  return (
    <div 
      className={cn("flex items-center gap-4 py-3 px-4", className)}
      aria-label="Carregando linha..."
    >
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonShimmer
          key={i}
          className={cn(
            "h-4",
            i === 0 ? "w-8" : "flex-1"
          )}
        />
      ))}
    </div>
  );
}

// Table skeleton
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export function TableSkeleton({ 
  rows = 5, 
  columns = 5,
  showHeader = true,
  className 
}: TableSkeletonProps) {
  return (
    <div 
      className={cn("rounded-lg border bg-card overflow-hidden", className)}
      aria-label="Carregando tabela..."
    >
      {showHeader && (
        <div className="flex items-center gap-4 py-3 px-4 bg-muted/50 border-b">
          {Array.from({ length: columns }).map((_, i) => (
            <SkeletonShimmer
              key={i}
              className={cn(
                "h-4",
                i === 0 ? "w-8" : "flex-1"
              )}
            />
          ))}
        </div>
      )}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <TableRowSkeleton key={i} columns={columns} />
        ))}
      </div>
    </div>
  );
}

// Avatar skeleton
interface AvatarSkeletonProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function AvatarSkeleton({ size = "md", className }: AvatarSkeletonProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16"
  };

  return (
    <SkeletonShimmer 
      className={cn("rounded-full", sizeClasses[size], className)} 
    />
  );
}

// Stats card skeleton
export function StatsCardSkeleton({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        "rounded-xl border bg-card p-6 space-y-4",
        className
      )}
      aria-label="Carregando estatística..."
    >
      <div className="flex items-center justify-between">
        <SkeletonShimmer className="h-4 w-24" />
        <SkeletonShimmer className="h-8 w-8 rounded-lg" />
      </div>
      <SkeletonShimmer className="h-8 w-32" />
      <div className="flex items-center gap-2">
        <SkeletonShimmer className="h-4 w-12" />
        <SkeletonShimmer className="h-4 w-20" />
      </div>
    </div>
  );
}

// Chart skeleton
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        "rounded-xl border bg-card p-6 space-y-4",
        className
      )}
      aria-label="Carregando gráfico..."
    >
      <div className="flex items-center justify-between">
        <SkeletonShimmer className="h-5 w-32" />
        <SkeletonShimmer className="h-8 w-24 rounded-md" />
      </div>
      <div className="flex items-end gap-2 h-48">
        {Array.from({ length: 12 }).map((_, i) => (
          <SkeletonShimmer
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${Math.random() * 60 + 40}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonShimmer key={i} className="h-3 w-8" />
        ))}
      </div>
    </div>
  );
}

// Product card skeleton (specific for this app)
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        "rounded-xl border bg-card overflow-hidden",
        className
      )}
      aria-label="Carregando produto..."
    >
      <SkeletonShimmer className="h-48 w-full" />
      <div className="p-4 space-y-3">
        <SkeletonShimmer className="h-5 w-3/4" />
        <div className="flex items-center gap-2">
          <SkeletonShimmer className="h-4 w-16" />
          <SkeletonShimmer className="h-4 w-20" />
        </div>
        <div className="flex items-center justify-between pt-2">
          <SkeletonShimmer className="h-6 w-24" />
          <SkeletonShimmer className="h-9 w-9 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// List item skeleton
export function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div 
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg border bg-card",
        className
      )}
      aria-label="Carregando item..."
    >
      <SkeletonShimmer className="h-12 w-12 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonShimmer className="h-4 w-3/4" />
        <SkeletonShimmer className="h-3 w-1/2" />
      </div>
      <SkeletonShimmer className="h-8 w-8 rounded-md flex-shrink-0" />
    </div>
  );
}

// Form skeleton
export function FormSkeleton({ 
  fields = 4,
  className 
}: { 
  fields?: number;
  className?: string;
}) {
  return (
    <div 
      className={cn("space-y-6", className)}
      aria-label="Carregando formulário..."
    >
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonShimmer className="h-4 w-24" />
          <SkeletonShimmer className="h-10 w-full rounded-md" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <SkeletonShimmer className="h-10 w-32 rounded-md" />
        <SkeletonShimmer className="h-10 w-24 rounded-md" />
      </div>
    </div>
  );
}

// Page header skeleton
export function PageHeaderSkeleton({ className }: { className?: string }) {
  return (
    <div 
      className={cn("space-y-4", className)}
      aria-label="Carregando cabeçalho..."
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonShimmer className="h-8 w-48" />
          <SkeletonShimmer className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <SkeletonShimmer className="h-10 w-32 rounded-md" />
          <SkeletonShimmer className="h-10 w-10 rounded-md" />
        </div>
      </div>
    </div>
  );
}

// Full page loading skeleton
export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div 
      className={cn("space-y-6 p-6", className)}
      aria-label="Carregando página..."
    >
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton />
        <TableSkeleton rows={5} columns={4} />
      </div>
    </div>
  );
}
