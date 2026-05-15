import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Brain, Activity } from "lucide-react";

const formatCurrency = (val: number) => `$${val.toFixed(4)}`;
const formatNumber = (val: number) => val.toLocaleString("pt-BR");

interface UserStats { userId: string; count: number; tokens: number; cost: number; }
interface ModelStats { name: string; count: number; tokens: number; cost: number; }
interface LogEntry { id: string; created_at: string; user_id: string; function_name: string; model: string | null; total_tokens: number; estimated_cost_usd: string | number | null; duration_ms: number | null; status: string; }

interface AiTablesProps {
  byUser: UserStats[];
  byModel: ModelStats[];
  logs: LogEntry[];
  statsLoading: boolean;
  logsLoading: boolean;
}

export function AiTables({ byUser, byModel, logs, statsLoading, logsLoading }: AiTablesProps) {
  return (
    <>
      {/* Top Users */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Top Usuários por Consumo</CardTitle></CardHeader>
        <CardContent>
          {statsLoading ? <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border/50 text-muted-foreground"><th className="text-left py-2 px-3 text-xs font-medium">Usuário</th><th className="text-right py-2 px-3 text-xs font-medium">Requisições</th><th className="text-right py-2 px-3 text-xs font-medium">Tokens</th><th className="text-right py-2 px-3 text-xs font-medium">Custo (USD)</th></tr></thead>
                <tbody>{byUser.slice(0, 10).map(u => (
                  <tr key={u.userId} className="border-b border-border/20 hover:bg-accent/20"><td className="py-2 px-3 font-mono text-xs">{u.userId.slice(0, 8)}...</td><td className="py-2 px-3 text-right">{formatNumber(u.count)}</td><td className="py-2 px-3 text-right">{formatNumber(u.tokens)}</td><td className="py-2 px-3 text-right font-medium">{formatCurrency(u.cost)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* By Model */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Brain className="h-4 w-4" /> Consumo por Modelo</CardTitle></CardHeader>
        <CardContent>
          {statsLoading ? <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border/50 text-muted-foreground"><th className="text-left py-2 px-3 text-xs font-medium">Modelo</th><th className="text-right py-2 px-3 text-xs font-medium">Chamadas</th><th className="text-right py-2 px-3 text-xs font-medium">Tokens</th><th className="text-right py-2 px-3 text-xs font-medium">Custo (USD)</th></tr></thead>
                <tbody>{byModel.map(m => (
                  <tr key={m.name} className="border-b border-border/20 hover:bg-accent/20"><td className="py-2 px-3"><Badge variant="outline" className="font-mono text-xs">{m.name}</Badge></td><td className="py-2 px-3 text-right">{formatNumber(m.count)}</td><td className="py-2 px-3 text-right">{formatNumber(m.tokens)}</td><td className="py-2 px-3 text-right font-medium">{formatCurrency(m.cost)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Activity className="h-4 w-4" /> Últimas Chamadas</CardTitle></CardHeader>
        <CardContent>
          {logsLoading ? <div className="space-y-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div> : (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card"><tr className="border-b border-border/50 text-muted-foreground"><th className="text-left py-2 px-2 font-medium">Data</th><th className="text-left py-2 px-2 font-medium">Usuário</th><th className="text-left py-2 px-2 font-medium">Função</th><th className="text-left py-2 px-2 font-medium">Modelo</th><th className="text-right py-2 px-2 font-medium">Tokens</th><th className="text-right py-2 px-2 font-medium">Custo</th><th className="text-right py-2 px-2 font-medium">Tempo</th><th className="text-center py-2 px-2 font-medium">Status</th></tr></thead>
                <tbody>{logs.map(log => (
                  <tr key={log.id} className="border-b border-border/20 hover:bg-accent/20">
                    <td className="py-1.5 px-2 whitespace-nowrap">{new Date(log.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="py-1.5 px-2 font-mono">{log.user_id.slice(0, 8)}</td>
                    <td className="py-1.5 px-2"><Badge variant="outline" className="text-[10px]">{log.function_name}</Badge></td>
                    <td className="py-1.5 px-2 text-muted-foreground">{(log.model || "").replace(/^(google|openai)\//, "")}</td>
                    <td className="py-1.5 px-2 text-right">{formatNumber(log.total_tokens)}</td>
                    <td className="py-1.5 px-2 text-right">{formatCurrency(Number(log.estimated_cost_usd))}</td>
                    <td className="py-1.5 px-2 text-right">{log.duration_ms ? `${log.duration_ms}ms` : "-"}</td>
                    <td className="py-1.5 px-2 text-center">{log.status === "success" ? <Badge variant="outline" className="bg-success/10 text-success border-success/30 text-[10px]">OK</Badge> : <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 text-[10px]">Erro</Badge>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
