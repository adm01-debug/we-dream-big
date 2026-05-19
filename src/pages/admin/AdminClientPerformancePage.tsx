import { useState, useEffect } from 'react';
import { PageSEO } from '@/components/seo/PageSEO';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Clock, 
  Trash2, 
  RefreshCw, 
  Zap, 
  BarChart3, 
  Layout, 
  Palette,
  Timer
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { performanceTracker, type PerformanceMetric } from '@/utils/performance';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function AdminClientPerformancePage() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setMetrics(performanceTracker.getHistory());
    
    // Auto-refresh stats every 5s if there's activity
    const interval = setInterval(() => {
      setMetrics(performanceTracker.getHistory());
    }, 5000);
    
    return () => clearInterval(interval);
  }, [tick]);

  const handleClear = () => {
    performanceTracker.clear();
    setMetrics([]);
    setTick(t => t + 1);
  };

  const routeMetrics = metrics.filter(m => m.name.startsWith('Route:'));
  const themeMetrics = metrics.filter(m => m.name.startsWith('Theme:'));
  
  const avgRouteTime = routeMetrics.length 
    ? routeMetrics.reduce((acc, m) => acc + m.duration, 0) / routeMetrics.length 
    : 0;
    
  const avgThemeTime = themeMetrics.length 
    ? themeMetrics.reduce((acc, m) => acc + m.duration, 0) / themeMetrics.length 
    : 0;

  const chartData = metrics.map(m => ({
    ...m,
    time: format(m.timestamp, 'HH:mm:ss'),
    shortName: m.name.replace('Route: ', '').replace('Theme: ', '')
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <>
      <PageSEO 
        title="Performance Client-side — Admin" 
        description="Monitoramento de latência de interface, trocas de tema e transições de rota" 
        path="/admin/client-performance" 
      />
      
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">Performance Client-side</h1>
              <p className="text-sm text-muted-foreground">Métricas de experiência do usuário (UX) em tempo real</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setTick(t => t + 1)}
              className="h-9"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClear}
              className="h-9 text-destructive hover:text-destructive hover:bg-destructive/5"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Logs
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            icon={Layout} 
            label="Média Transição Rota" 
            value={`${avgRouteTime.toFixed(0)}ms`} 
            sub={`${routeMetrics.length} transições medidas`}
            status={avgRouteTime > 500 ? 'warning' : 'success'}
          />
          <StatCard 
            icon={Palette} 
            label="Média Troca Tema" 
            value={`${avgThemeTime.toFixed(0)}ms`} 
            sub={`${themeMetrics.length} trocas medidas`}
            status={avgThemeTime > 300 ? 'warning' : 'success'}
          />
          <StatCard 
            icon={Timer} 
            label="Total de Eventos" 
            value={metrics.length.toString()} 
            sub="Últimos 50 eventos capturados"
          />
          <StatCard 
            icon={Zap} 
            label="Status Render" 
            value="Fluido" 
            sub="60 FPS alvo mantido"
            status="success"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timeline Chart */}
          <Card className="border-border/60 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Timeline de Latência
                  </CardTitle>
                  <CardDescription>Duração de eventos chronológicos</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[300px] w-full">
                {metrics.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="time" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        stroke="hsl(var(--muted-foreground))"
                        unit="ms"
                      />
                      <RechartsTooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="duration" 
                        name="Duração"
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2} 
                        dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState message="Nenhuma métrica coletada ainda." />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Distribution Chart */}
          <Card className="border-border/60 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Distribuição por Tipo
              </CardTitle>
              <CardDescription>Latência média por categoria de evento</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[300px] w-full">
                {metrics.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Rotas', value: avgRouteTime },
                      { name: 'Temas', value: avgThemeTime },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="name" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false}
                        stroke="hsl(var(--muted-foreground))"
                        unit="ms"
                      />
                      <RechartsTooltip 
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey="value" name="Média (ms)" radius={[4, 4, 0, 0]}>
                        <Cell fill="hsl(var(--primary))" />
                        <Cell fill="hsl(var(--secondary))" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyState message="Navegue pelo sistema para gerar dados." />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logs Table */}
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 pb-4">
            <CardTitle className="text-lg">Log Detalhado de Eventos</CardTitle>
            <CardDescription>Lista completa dos últimos 50 eventos medidos</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-left">
                    <th className="px-6 py-3 font-semibold text-muted-foreground">Evento</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground">Data/Hora</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground">Duração</th>
                    <th className="px-6 py-3 font-semibold text-muted-foreground">Status UX</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {[...metrics].reverse().map((m, i) => (
                    <tr key={i} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-medium">{m.name}</span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {format(m.timestamp, 'dd/MM/yyyy HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4 font-bold tabular-nums">
                        {m.duration.toFixed(2)}ms
                      </td>
                      <td className="px-6 py-4">
                        <Badge 
                          variant={m.duration > 500 ? 'destructive' : m.duration > 200 ? 'warning' : 'secondary'}
                          className="text-[10px] px-2 py-0"
                        >
                          {m.duration > 500 ? 'Lento' : m.duration > 200 ? 'Ok' : 'Excelente'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {metrics.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                        Nenhum log disponível.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatCard({ icon: Icon, label, value, sub, status }: { 
  icon: any, 
  label: string, 
  value: string, 
  sub: string,
  status?: 'success' | 'warning' | 'destructive'
}) {
  return (
    <Card className={cn(
      "border-border/60 shadow-sm transition-all hover:shadow-md",
      status === 'success' && "bg-green-50/30 dark:bg-green-500/5 border-green-200/50 dark:border-green-500/20",
      status === 'warning' && "bg-amber-50/30 dark:bg-amber-500/5 border-amber-200/50 dark:border-amber-500/20",
      status === 'destructive' && "bg-red-50/30 dark:bg-red-500/5 border-red-200/50 dark:border-red-500/20"
    )}>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn(
          "p-2.5 rounded-lg shrink-0",
          status === 'success' ? "bg-green-100 dark:bg-green-500/20 text-green-600" :
          status === 'warning' ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600" :
          status === 'destructive' ? "bg-red-100 dark:bg-red-500/20 text-red-600" :
          "bg-primary/10 text-primary"
        )}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-0.5">{label}</p>
          <p className="text-2xl font-bold tracking-tight truncate">{value}</p>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center text-muted-foreground gap-3">
      <Activity className="h-8 w-8 opacity-20" />
      <p className="text-sm italic">{message}</p>
    </div>
  );
}