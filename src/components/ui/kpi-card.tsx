/**
 * KpiCard compartilhado — usado em SalesHistoryChart, StockHistoryChart, e outros.
 * Elimina duplicação de ~30 linhas entre módulos.
 * v2: suporta tooltip explicativo opcional (retrocompatível).
 */
import { cn } from "@/lib/utils";
import { type LucideIcon, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface KpiCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
  alert?: boolean;
  warning?: boolean;
  customValueColor?: string;
  ariaLabel?: string;
  /** Texto explicativo exibido em tooltip ao passar o mouse no ícone de info. */
  tooltip?: string;
  /** Delay opcional (ms) para animação fade-in escalonada. */
  animationDelay?: number;
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
  alert,
  warning,
  customValueColor,
  ariaLabel,
  tooltip,
  animationDelay,
}: KpiCardProps) {
  const content = (
    <div
      className={cn(
        "rounded-md p-2 text-center animate-fade-in",
        alert ? "bg-destructive/10 border border-destructive/20" :
        warning ? "bg-warning/10 border border-warning/20" :
        highlight ? "bg-primary/10 border border-primary/20" :
        "bg-muted/50"
      )}
      style={animationDelay ? { animationDelay: `${animationDelay}ms` } : undefined}
      role="status"
      aria-label={ariaLabel ?? `${label}: ${value} ${sub}`}
    >
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <Icon
          className={cn(
            "h-3 w-3",
            alert ? "text-destructive" :
            warning ? "text-warning" :
            highlight ? "text-primary" :
            "text-muted-foreground"
          )}
          aria-hidden="true"
        />
        <p className="text-[10px] text-muted-foreground leading-tight flex items-center gap-0.5">
          {label}
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground/60 hover:text-foreground transition-colors"
                  aria-label={`Sobre ${label}`}
                >
                  <Info className="h-2.5 w-2.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs leading-relaxed">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </p>
      </div>
      <p className={cn(
        "text-sm font-bold",
        customValueColor ? customValueColor :
        alert ? "text-destructive" :
        warning ? "text-warning" :
        highlight ? "text-primary" :
        "text-foreground"
      )}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );

  if (tooltip) {
    return <TooltipProvider delayDuration={150}>{content}</TooltipProvider>;
  }
  return content;
}

