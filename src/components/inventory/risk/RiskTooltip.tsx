import { forwardRef } from 'react';

interface RiskChartDataPoint {
  fullDate?: string;
  stockClose?: number | null;
  depleted?: number | null;
  restocked?: number | null;
  restockDetected?: boolean;
}

export const RiskTooltip = forwardRef<
  HTMLDivElement,
  { active?: boolean; payload?: { payload: RiskChartDataPoint }[] }
>(function RiskTooltip({ active, payload }, ref) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div
      ref={ref}
      className="text-tooltip min-w-[150px] rounded-lg border border-border/40 bg-foreground/90 p-2.5 text-background shadow-sm backdrop-blur-sm"
    >
      <p className="font-semibold">{data.fullDate}</p>
      <div className="mt-1.5 space-y-1">
        <div className="flex justify-between">
          <span className="opacity-70">Estoque:</span>
          <span className="font-semibold">
            {data.stockClose != null ? data.stockClose.toLocaleString('pt-BR') : '—'}
          </span>
        </div>
        {data.depleted !== null && data.depleted > 0 && (
          <div className="flex justify-between text-destructive-foreground">
            <span>Saída:</span>
            <span className="font-semibold">-{data.depleted}</span>
          </div>
        )}
        {data.restocked !== null && data.restocked > 0 && (
          <div className="flex justify-between text-primary-foreground">
            <span>Reposição:</span>
            <span className="font-semibold">+{data.restocked}</span>
          </div>
        )}
      </div>
    </div>
  );
});
