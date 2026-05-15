import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// Re-using common components from the main project
import { 
  Tooltip as ShadcnTooltip, 
  TooltipContent as ShadcnTooltipContent, 
  TooltipProvider as ShadcnTooltipProvider, 
  TooltipTrigger as ShadcnTooltipTrigger 
} from "@/components/ui/tooltip";

interface SuspiciousWarningProps {
  isSuspicious: boolean;
  suspiciousStreakSeconds: number;
  streakWindowStats: {
    triggers: number;
    fetches: number;
    ratio: number;
    fromT: number;
    toT: number;
  };
  streakTrend: {
    direction: "rising" | "flat" | "falling";
    slopePerSec: number;
    suggestion: { primary: string; rationale: string } | null;
  };
  threshold: number;
}

export function SuspiciousWarning({
  isSuspicious,
  suspiciousStreakSeconds,
  streakWindowStats,
  streakTrend,
  threshold
}: SuspiciousWarningProps) {
  if (!isSuspicious) return null;

  return (
    <ShadcnTooltipProvider delayDuration={150}>
      <ShadcnTooltip>
        <ShadcnTooltipTrigger asChild>
          <span
            role="status"
            aria-live="polite"
            className="inline-flex items-center gap-1 rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold text-warning animate-pulse cursor-help"
          >
            <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
            ratio ≥ {threshold} for {suspiciousStreakSeconds}s
          </span>
        </ShadcnTooltipTrigger>
        <ShadcnTooltipContent side="bottom" align="end" className="p-2 max-w-[280px]">
          <div className="font-mono text-[10px] leading-snug space-y-1">
            <div className="font-semibold text-warning text-[11px] flex items-center gap-1">
              <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />
              Suspicious window
            </div>
            <div className="text-muted-foreground">
              ratio ≥ {threshold} for {suspiciousStreakSeconds}s
              {streakWindowStats.fromT > 0 && (
                <span className="block">
                  {new Date(streakWindowStats.fromT).toLocaleTimeString()} →{" "}
                  {new Date(streakWindowStats.toT).toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0 pt-1 border-t border-border/40">
              <span className="text-muted-foreground">triggers (window)</span>
              <span className="text-right tabular-nums text-foreground">{streakWindowStats.triggers}</span>
              <span className="text-muted-foreground">fetches (window)</span>
              <span className="text-right tabular-nums text-foreground">{streakWindowStats.fetches}</span>
              <span className="text-muted-foreground">saved (window)</span>
              <span className="text-right tabular-nums text-primary">
                {Math.max(0, streakWindowStats.triggers - streakWindowStats.fetches)}
              </span>
            </div>
            <div className="pt-1 border-t border-border/40 text-muted-foreground">
              <span className="block">ratio = fetches / triggers</span>
              <span className="block">
                = {streakWindowStats.fetches} / {streakWindowStats.triggers} ={" "}
                <span className="font-semibold text-warning">{streakWindowStats.ratio.toFixed(3)}</span>
              </span>
            </div>
            {streakTrend.suggestion && (
              <div className="pt-1 border-t border-border/40">
                <div className="text-foreground inline-flex items-center gap-1">
                  <span className="font-semibold">💡 Suggestion</span>
                  <span
                    className={cn(
                      "px-1 rounded text-[9px] font-semibold uppercase tracking-wide",
                      streakTrend.direction === "rising"
                        ? "bg-warning/15 text-warning"
                        : streakTrend.direction === "falling"
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {streakTrend.direction}
                    {streakTrend.slopePerSec !== 0 && (
                      <> {streakTrend.slopePerSec > 0 ? "+" : ""}{streakTrend.slopePerSec.toFixed(2)}/s</>
                    )}
                  </span>
                </div>
                <div className="text-foreground mt-0.5">→ {streakTrend.suggestion.primary}</div>
                <div className="text-muted-foreground text-[9px] mt-0.5">{streakTrend.suggestion.rationale}</div>
              </div>
            )}
          </div>
        </ShadcnTooltipContent>
      </ShadcnTooltip>
    </ShadcnTooltipProvider>
  );
}
