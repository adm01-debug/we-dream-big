import * as React from "react";
import { cn } from "@/lib/utils";

const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative overflow-hidden rounded-md bg-muted",
          "after:absolute after:inset-0",
          "after:bg-gradient-to-r after:from-transparent after:via-white/[0.06] after:to-transparent",
          "after:animate-[shimmer_1.8s_ease-in-out_infinite]",
          className
        )}
        {...props}
      />
    );
  }
);
Skeleton.displayName = "Skeleton";

export { Skeleton };
