import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  blur?: "sm" | "md" | "lg" | "xl";
  opacity?: number;
  border?: boolean;
  gradient?: boolean;
}

const blurLevels = {
  sm: "backdrop-blur-sm",
  md: "backdrop-blur-md",
  lg: "backdrop-blur-lg",
  xl: "backdrop-blur-xl"
};

export function GlassCard({
  children,
  className,
  blur = "md",
  opacity = 80,
  border = true,
  gradient = false
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl",
        blurLevels[blur],
        border && "border border-white/20 dark:border-white/10",
        gradient && "bg-gradient-to-br from-white/10 to-white/5 dark:from-white/5 dark:to-white/[0.02]",
        !gradient && `bg-background/${opacity}`,
        "shadow-lg shadow-black/5",
        className
      )}
      style={{
        backgroundColor: gradient ? undefined : `hsl(var(--background) / ${opacity / 100})`
      }}
    >
      {children}
    </div>
  );
}

// Glass panel with more subtle effect
export function GlassPanel({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "backdrop-blur-sm bg-background/60",
        "border border-border/50 rounded-lg",
        "shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

// Floating glass container (for modals, popovers)
export function GlassOverlay({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "backdrop-blur-xl bg-background/80",
        "border border-border/30 rounded-2xl",
        "shadow-2xl shadow-black/20",
        className
      )}
    >
      {children}
    </div>
  );
}

// Glass button style
export function GlassButton({
  children,
  className,
  onClick,
  disabled
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-4 py-2 rounded-lg",
        "backdrop-blur-md bg-background/10",
        "border border-white/20 dark:border-white/10",
        "text-foreground font-medium",
        "hover:bg-background/20",
        "active:scale-[0.98]",
        "transition-all duration-200",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}

// Glass header/navbar style
export function GlassHeader({
  children,
  className,
  sticky = true
}: {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <header
      className={cn(
        sticky && "sticky top-0 z-50",
        "backdrop-blur-lg bg-background/70",
        "border-b border-border/50",
        "shadow-sm",
        className
      )}
    >
      {children}
    </header>
  );
}

// Glass sidebar style
export function GlassSidebar({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "backdrop-blur-xl bg-background/80",
        "border-r border-border/50",
        className
      )}
    >
      {children}
    </aside>
  );
}

// Frosted glass input
export function GlassInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full px-4 py-2 rounded-lg",
        "backdrop-blur-sm bg-background/10",
        "border border-white/20 dark:border-white/10",
        "text-foreground placeholder:text-muted-foreground",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        "transition-all duration-200",
        className
      )}
      {...props}
    />
  );
}

// Glass tooltip/popover background
export function GlassTooltip({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "backdrop-blur-xl bg-popover/90",
        "border border-border/50 rounded-lg",
        "shadow-lg",
        "p-3",
        className
      )}
    >
      {children}
    </div>
  );
}
