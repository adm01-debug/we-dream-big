import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { TrendingUp, ShieldCheck, AlertCircle, Activity } from 'lucide-react';
import { useProductsListingLatencyAlert } from '@/pages/admin/telemetry/useProductsListingLatencyAlert';

const TONE = {
  ok: {
    border: 'border-emerald-500/30 bg-emerald-500/5',
    icon: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    title: 'text-emerald-700 dark:text-emerald-300',
    Icon: ShieldCheck,
    label: 'Estável',
    badge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  warning: {
    border: 'border-warning/40 bg-warning/5',
    icon: 'bg-warning/15 text-warning',
    title: 'text-warning',
    Icon: TrendingUp,
    label: 'Atenção',
    badge: 'bg-warning/20 text-warning border-warning/30',
  },
  critical: {
    border: 'border-destructive/40 bg-destructive/5',
    icon: 'bg-destructive/15 text-destructive',
    title: 'text-destructive',
    Icon: AlertCircle,
    label: 'Crítico',
    badge: 'bg-destructive/20 text-destructive border-destructive/30',
  },
} as const;

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatPct(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${Math.round(pct * 100)}%`;
}

export function ProductsListingLatencyAlert() {
  const { alert, isLoading } = useProductsListingLatencyAlert();

  if (isLoading || !alert) {
    return (
      <Card className="border-[1.5px]">
        <CardContent className="p-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const tone = TONE[alert.severity];
  const { current, baseline, avgDeltaPct, reasons } = alert;
  const hasBaseline = baseline.samples > 0;

  return (
    <Card className={cn('border-[1.5px] transition-colors', tone.border)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className={cn('p-2.5 rounded-lg shrink-0', tone.icon)}>
            <tone.Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Listings de products · limit &gt; 50
              </p>
              <Badge variant="outline" className={cn('text-[10px]', tone.badge)}>
                {tone.label}
              </Badge>
            </div>
            <p className={cn('font-display text-base font-semibold leading-tight mt-1', tone.title)}>
              {alert.severity === 'ok'
                ? 'Latência dentro dos parâmetros esperados.'
                : 'Possível regressão de latência detectada.'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Janela atual: 1h · Baseline: 24h prévias · auto-refresh 60s
            </p>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Amostras (1h)" value={current.samples.toString()} />
          <Metric
            label="Média atual"
            value={current.samples > 0 ? formatMs(current.avgMs) : '—'}
            tone={alert.severity}
          />
          <Metric
            label="P95 atual"
            value={current.samples > 0 ? formatMs(current.p95Ms) : '—'}
          />
          <Metric
            label="Δ vs baseline"
            value={hasBaseline && current.samples > 0 ? formatPct(avgDeltaPct) : '—'}
            tone={hasBaseline && avgDeltaPct >= 0.5 ? 'critical' : avgDeltaPct >= 0.25 ? 'warning' : 'ok'}
          />
        </div>

        {/* Razões */}
        {reasons.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-border/40">
            {reasons.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <Activity className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{r.message}</span>
              </div>
            ))}
          </div>
        )}

        {hasBaseline && (
          <p className="text-[10px] text-muted-foreground">
            Baseline: {baseline.samples} amostras · média {formatMs(baseline.avgMs)} · p95 {formatMs(baseline.p95Ms)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  tone = 'ok',
}: {
  label: string;
  value: string;
  tone?: 'ok' | 'warning' | 'critical';
}) {
  return (
    <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          'font-display text-lg font-bold tabular-nums leading-tight mt-0.5',
          tone === 'critical' && 'text-destructive',
          tone === 'warning' && 'text-warning',
        )}
      >
        {value}
      </p>
    </div>
  );
}
