import { forwardRef } from "react";
import { Badge } from "@/components/ui/badge";
import { safeNumber } from "@/lib/stock-chart-utils";

// #11 fix: shows fallback when zero-activity day
// forwardRef required because Recharts passes refs to custom tooltip components
export const RiskTooltip = forwardRef<HTMLDivElement, { active?: boolean; payload?: { payload: Record<string, unknown> }[] }>(function RiskTooltip({ active, payload }, ref) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  const depleted = safeNumber(data.depleted);
  const restocked = safeNumber(data.restocked);
  const hasActivity = (depleted !== null && depleted > 0) || (restocked !== null && restocked > 0);

  return (
    <div ref={ref} className="bg-popover border border-border rounded-lg p-2.5 shadow-lg min-w-[150px]">
      <p className="text-[10px] font-medium text-foreground">{data.fullDate}</p>
      <div className="mt-1.5 space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Estoque:</span>
          <span className="font-semibold">{data.stockClose !== null ? data.stockClose.toLocaleString('pt-BR') : '—'}</span>
        </div>
        {!hasActivity && (
          <p className="text-[9px] text-muted-foreground italic">Sem movimentação</p>
        )}
        {depleted !== null && depleted > 0 && (
          <div className="flex justify-between text-[10px]">
            <span className="text-destructive">Saída:</span>
            <span className="font-semibold text-destructive">-{depleted}</span>
          </div>
        )}
        {restocked !== null && restocked > 0 && (
          <div className="flex justify-between text-[10px]">
            <span className="text-primary">Reposição:</span>
            <span className="font-semibold text-primary">+{restocked}</span>
          </div>
        )}
        {data.restockDetected && (
          <Badge variant="outline" className="text-[9px] px-1 py-0 bg-primary/10 text-primary border-primary/30">
            🔄 Reabastecimento
          </Badge>
        )}
      </div>
    </div>
  );
});
