import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MockupSkeletonProps {
  variant?: "config" | "preview" | "result" | "card" | "editor" | "wizard";
  className?: string;
  delay?: number; // Stagger delay in ms
}

// Enhanced shimmer with gradient animation
const shimmerBase = "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent";

export function MockupSkeleton({
  variant = "config",
  className,
  delay = 0,
}: MockupSkeletonProps) {
  const shimmerClass = cn(
    "bg-muted/80 rounded",
    shimmerBase
  );

  const staggerStyle = delay > 0 ? { animationDelay: `${delay}ms` } : {};

  if (variant === "wizard") {
    return (
      <div 
        className={cn("animate-fade-in opacity-0 [animation-fill-mode:forwards]", className)}
        style={staggerStyle}
      >
        <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl border">
          {/* Step indicators */}
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={cn("h-8 w-8 rounded-full", shimmerClass)} />
              <div className="flex-1 hidden md:block space-y-1">
                <div className={cn("h-3 w-16 rounded", shimmerClass)} />
                <div className={cn("h-2 w-24 rounded", shimmerClass)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "editor") {
    return (
      <Card 
        className={cn("overflow-hidden animate-fade-in opacity-0 [animation-fill-mode:forwards]", className)}
        style={staggerStyle}
      >
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("h-4 w-4 rounded", shimmerClass)} />
              <div className={cn("h-4 w-28 rounded", shimmerClass)} />
            </div>
            <div className={cn("h-8 w-20 rounded-md", shimmerClass)} />
          </div>

          {/* Canvas area */}
          <div className={cn("aspect-square rounded-xl", shimmerClass)} />

          {/* Quick actions */}
          <div className="flex gap-2">
            <div className={cn("h-9 flex-1 rounded-md", shimmerClass)} />
            <div className={cn("h-9 flex-1 rounded-md", shimmerClass)} />
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className={cn("h-3 w-14 rounded", shimmerClass)} />
                  <div className={cn("h-3 w-10 rounded", shimmerClass)} />
                </div>
                <div className={cn("h-2 w-full rounded-full", shimmerClass)} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "config") {
    return (
      <Card 
        className={cn("overflow-hidden animate-fade-in opacity-0 [animation-fill-mode:forwards]", className)}
        style={staggerStyle}
      >
        <CardContent className="p-6 space-y-6">
          {/* Header skeleton */}
          <div className="space-y-2">
            <div className={cn("h-6 w-32 rounded", shimmerClass)} />
            <div className={cn("h-4 w-48 rounded", shimmerClass)} />
          </div>

          {/* Select skeletons */}
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2" style={{ animationDelay: `${i * 100}ms` }}>
              <div className={cn("h-4 w-24 rounded", shimmerClass)} />
              <div className={cn("h-10 w-full rounded-md", shimmerClass)} />
            </div>
          ))}

          {/* Button skeleton */}
          <div className="flex gap-2 pt-4">
            <div className={cn("h-10 flex-1 rounded-md", shimmerClass)} />
            <div className={cn("h-10 w-10 rounded-md", shimmerClass)} />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "preview") {
    return (
      <Card 
        className={cn("overflow-hidden animate-fade-in opacity-0 [animation-fill-mode:forwards]", className)}
        style={staggerStyle}
      >
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-full", shimmerClass)} />
              <div className="space-y-1.5">
                <div className={cn("h-4 w-32 rounded", shimmerClass)} />
                <div className={cn("h-3 w-24 rounded", shimmerClass)} />
              </div>
            </div>
            <div className={cn("h-8 w-20 rounded", shimmerClass)} />
          </div>

          {/* Image area with pulse ring */}
          <div className="relative">
            <div className={cn("aspect-square rounded-xl", shimmerClass)} />
            <div className="absolute inset-0 rounded-xl border-2 border-primary/20 animate-pulse" />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={cn("h-8 w-16 rounded", shimmerClass)} style={{ animationDelay: `${i * 50}ms` }} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "result") {
    return (
      <Card 
        className={cn("overflow-hidden animate-fade-in opacity-0 [animation-fill-mode:forwards]", className)}
        style={staggerStyle}
      >
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("h-8 w-8 rounded-full", shimmerClass)} />
              <div className={cn("h-4 w-24 rounded", shimmerClass)} />
            </div>
            <div className={cn("h-8 w-24 rounded", shimmerClass)} />
          </div>

          {/* Image with loading indicator */}
          <div className="relative">
            <div className={cn("aspect-square rounded-xl", shimmerClass)} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            </div>
          </div>

          {/* Info */}
          <div className="flex items-center justify-between">
            <div className={cn("h-6 w-20 rounded-full", shimmerClass)} />
            <div className={cn("h-8 w-32 rounded", shimmerClass)} />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Card variant (for history grid) with stagger animation
  return (
    <div 
      className={cn(
        "border rounded-xl overflow-hidden bg-card animate-fade-in opacity-0 [animation-fill-mode:forwards]",
        className
      )}
      style={staggerStyle}
    >
      <div className={cn("aspect-square", shimmerClass)} />
      <div className="p-3 space-y-2">
        <div className={cn("h-4 w-3/4 rounded", shimmerClass)} />
        <div className="flex gap-1.5">
          <div className={cn("h-5 w-16 rounded-full", shimmerClass)} />
          <div className={cn("h-5 w-12 rounded-full", shimmerClass)} />
        </div>
        <div className={cn("h-3 w-1/3 rounded", shimmerClass)} />
      </div>
    </div>
  );
}

// Loading grid for history with staggered entrance
export function MockupHistorySkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <MockupSkeleton 
          key={i} 
          variant="card" 
          delay={i * 50} // Stagger each card by 50ms
        />
      ))}
    </div>
  );
}

// Full page loading state
export function MockupPageSkeleton() {
  return (
    <div className="space-y-6 p-4">
      {/* Wizard skeleton */}
      <MockupSkeleton variant="wizard" delay={0} />
      
      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Config panel */}
        <div className="lg:col-span-4">
          <MockupSkeleton variant="config" delay={100} />
        </div>
        
        {/* Editor panel */}
        <div className="lg:col-span-4">
          <MockupSkeleton variant="editor" delay={200} />
        </div>
        
        {/* Result panel */}
        <div className="lg:col-span-4">
          <MockupSkeleton variant="result" delay={300} />
        </div>
      </div>
    </div>
  );
}
