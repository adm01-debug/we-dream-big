import { useState } from "react";
import { Play, CheckCircle2, XCircle, Loader2, Database, Globe, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SimulationReport {
  totalScenarios: number;
  successes: number;
  failures: number;
  startTime: string;
  endTime: string;
  consistencyChecks: { passed: number; failed: number };
  details: any[];
}

export default function SimulationPage() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SimulationReport | null>(null);

  const runSimulation = async () => {
    setLoading(true);
    setReport(null);
    try {
      const { data, error } = await supabase.functions.invoke("simulation-orchestrator", {
        body: { count: 100 }
      });
      if (error) throw error;
      setReport(data);
      toast.success("Simulação concluída com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao executar simulação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Modo de Simulação</h1>
          <p className="text-muted-foreground">Validação massiva de consistência e resiliência de Edge Functions e Webhooks.</p>
        </div>
        <Button onClick={runSimulation} disabled={loading} size="lg" className="gap-2">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5" />}
          Iniciar Simulação de Elite
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cenários Totais</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report?.totalScenarios || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sucessos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{report?.successes || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Falhas</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{report?.failures || 0}</div>
          </CardContent>
        </Card>
      </div>

      {report && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Integridade de Dados</CardTitle>
              <CardDescription>Consistência verificada após execução</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Checks de Consistência (Passou)</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {report.consistencyChecks.passed}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Checks de Consistência (Falhou)</span>
                <Badge variant="destructive">
                  {report.consistencyChecks.failed}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detalhes das Falhas</CardTitle>
              <CardDescription>Primeiras 20 ocorrências de erro</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                {report.details.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma falha detalhada registrada.</p>
                ) : (
                  <div className="space-y-4">
                    {report.details.map((detail, idx) => (
                      <div key={idx} className="text-xs border-b pb-2">
                        <div className="flex items-center justify-between font-mono font-bold mb-1">
                          <span className="text-primary">{detail.fnName}</span>
                          <span className="text-destructive">Status {detail.status}</span>
                        </div>
                        <p className="text-muted-foreground break-all">{detail.error}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {!report && !loading && (
        <div className="flex flex-col items-center justify-center py-24 bg-muted/20 rounded-xl border border-dashed">
          <Database className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Aguardando Execução</h3>
          <p className="text-muted-foreground max-w-sm text-center">Clique no botão acima para iniciar a bateria de milhares de testes de estresse e consistência.</p>
        </div>
      )}
    </div>
  );
}
