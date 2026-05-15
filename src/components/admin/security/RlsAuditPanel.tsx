import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Loader2, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScenarioResult {
  table: string;
  op: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
  scenario: string;
  expected: "allow" | "deny";
  actual: "allow" | "deny" | "error";
  passed: boolean;
  detail?: string;
}

interface AuditResponse {
  summary: { total: number; passed: number; failed: number; seller_id: string; ran_at: string };
  results: ScenarioResult[];
}

export function RlsAuditPanel() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AuditResponse | null>(null);

  const run = async () => {
    setLoading(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke<AuditResponse>("rls-audit");
      if (error) throw error;
      setData(resp ?? null);
      const failed = resp?.summary.failed ?? 0;
      if (failed === 0) toast.success(`Todos os ${resp?.summary.total} cenários passaram ✅`);
      else toast.error(`${failed} cenário(s) falharam ❌`);
    } catch (e) {
      toast.error("Falha ao executar auditoria: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const grouped = data?.results.reduce<Record<string, ScenarioResult[]>>((acc, r) => {
    (acc[r.table] ??= []).push(r);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Auditoria de RLS — Vendedor
          </CardTitle>
          <CardDescription>
            Executa SELECT/INSERT/UPDATE/DELETE em <code>quotes</code>, <code>orders</code> e{" "}
            <code>discount_approval_requests</code> com seu JWT, garantindo que apenas registros com
            <code> seller_id = auth.uid()</code> são acessíveis.
          </CardDescription>
        </div>
        <Button onClick={run} disabled={loading} size="sm">
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
          Executar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {data && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={data.summary.failed === 0 ? "default" : "destructive"}>
              {data.summary.passed}/{data.summary.total} OK
            </Badge>
            <span className="text-muted-foreground">
              seller_id: <code>{data.summary.seller_id.slice(0, 8)}…</code>
            </span>
            <span className="text-muted-foreground">
              executado: {new Date(data.summary.ran_at).toLocaleString()}
            </span>
          </div>
        )}

        {grouped &&
          Object.entries(grouped).map(([table, rows]) => (
            <div key={table} className="border rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-muted/40 font-medium text-sm flex items-center justify-between">
                <span><code>{table}</code></span>
                <span className="text-xs text-muted-foreground">
                  {rows.filter((r) => r.passed).length}/{rows.length}
                </span>
              </div>
              <ul className="divide-y">
                {rows.map((r, i) => (
                  <li key={i} className="px-3 py-2 flex items-start gap-3 text-sm">
                    {r.passed ? (
                      <ShieldCheck className="h-4 w-4 mt-0.5 text-emerald-600 shrink-0" />
                    ) : (
                      <ShieldAlert className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{r.op}</Badge>
                        <span>{r.scenario}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        esperado: <b>{r.expected}</b> · obtido: <b>{r.actual}</b>
                        {r.detail && <> · <span className="break-all">{r.detail}</span></>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        {!data && !loading && (
          <p className="text-sm text-muted-foreground">
            Clique em "Executar" para rodar os 13 cenários de validação de RLS.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
