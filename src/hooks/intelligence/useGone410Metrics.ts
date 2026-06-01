import { useQuery } from '@tanstack/react-query';
import { getSilentEmptyReport, SilentEmptyEvent } from '@/lib/external-db/silent-empty-report';

export interface Gone410Metrics {
  totalOccurrences: number;
  uniqueTablesAffected: number;
  lastOccurrenceAt: number | null;
  affectedTables: { table: string; count: number; lastAt: number }[];
  recentEvents: SilentEmptyEvent[];
}

export function useGone410Metrics() {
  return useQuery({
    queryKey: ['telemetry', 'gone-410-metrics'],
    refetchInterval: 10_000,
    queryFn: async (): Promise<Gone410Metrics> => {
      const report = getSilentEmptyReport();
      const goneEvents = report.filter(e => e.reason === 'gone_410');
      
      const tableStats = new Map<string, { count: number; lastAt: number }>();
      goneEvents.forEach(e => {
        const current = tableStats.get(e.table) || { count: 0, lastAt: 0 };
        tableStats.set(e.table, {
          count: current.count + 1,
          lastAt: Math.max(current.lastAt, e.at)
        });
      });

      const affectedTables = Array.from(tableStats.entries()).map(([table, stats]) => ({
        table,
        ...stats
      })).sort((a, b) => b.count - a.count);

      return {
        totalOccurrences: goneEvents.length,
        uniqueTablesAffected: tableStats.size,
        lastOccurrenceAt: goneEvents.length > 0 ? Math.max(...goneEvents.map(e => e.at)) : null,
        affectedTables,
        recentEvents: goneEvents.slice(-10).reverse()
      };
    }
  });
}
