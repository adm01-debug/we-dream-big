import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useGone410Metrics } from '@/hooks/intelligence/useGone410Metrics';
import { AlertTriangle, Table, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Gone410TelemetryPanel() {
  const { data: metrics, isLoading } = useGone410Metrics();

  if (isLoading || !metrics) return null;

  const hasIssues = metrics.totalOccurrences > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className={cn("border-[1.5px]", hasIssues ? "border-destructive/40 bg-destructive/5" : "border-success/40 bg-success/5")}>
          <CardContent className="flex items-center gap-3 p-4">
            <div className={cn("rounded-lg p-2.5", hasIssues ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success")}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Ocorrências 410 Gone</p>
              <p className="font-display text-3xl font-bold tabular-nums leading-tight">
                {metrics.totalOccurrences}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[1.5px]">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg p-2.5 bg-muted text-muted-foreground">
              <Table className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Tabelas Afetadas</p>
              <p className="font-display text-3xl font-bold tabular-nums leading-tight">
                {metrics.uniqueTablesAffected}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[1.5px]">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg p-2.5 bg-muted text-muted-foreground">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Última Ocorrência</p>
              <p className="text-sm font-medium">
                {metrics.lastOccurrenceAt 
                  ? formatDistanceToNow(metrics.lastOccurrenceAt, { addSuffix: true, locale: ptBR })
                  : 'Nenhuma registrada'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {hasIssues && (
        <Card className="border-[1.5px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Detalhamento por Tabela</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.affectedTables.map((stat) => (
                <div key={stat.table} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <span className="font-mono text-xs">{stat.table}</span>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{stat.count}x</span>
                    <span className="text-xs">
                      visto {formatDistanceToNow(stat.lastAt, { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
