import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTopClients } from "@/hooks/useCommercialIntelligence";

export function TopClients({ days = 30, categoryId, supplierId }: { days?: number; categoryId?: string | null; supplierId?: string | null }) {
  const { data: clients, isLoading } = useTopClients(days, categoryId, supplierId);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3"><Skeleton className="h-5 w-48" /></CardHeader>
        <CardContent className="space-y-2">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
        </CardContent>
      </Card>
    );
  }

  if (!clients?.length) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg skin-icon flex items-center justify-center">
              <Users className="h-3.5 w-3.5" />
            </div>
            🏆 Top Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Nenhuma venda no período.</p>
        </CardContent>
      </Card>
    );
  }

  const maxRevenue = Math.max(...clients.map(c => c.revenue));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg skin-icon flex items-center justify-center">
            <Users className="h-3.5 w-3.5" />
          </div>
          🏆 Top Clientes por Faturamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {clients.map((client, i) => {
          const pct = maxRevenue > 0 ? (client.revenue / maxRevenue) * 100 : 0;
          return (
            <div key={client.clientName + i} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="truncate flex-1 mr-2">
                  <span className="font-medium">{client.clientName}</span>
                  {client.company && client.company !== client.clientName && (
                    <span className="text-xs text-muted-foreground ml-1">({client.company})</span>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-semibold text-foreground">{formatCurrency(client.revenue)}</span>
                  <span className="text-[10px] text-muted-foreground ml-1">({client.orderCount} ped.)</span>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full skin-progress transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}