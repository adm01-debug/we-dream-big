/**
 * SecurityDashboard — Painel de segurança da conta
 * Refatorado: lógica de dados em useSecurityData.ts
 */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX, Key, Monitor, Globe,
  Lock, Unlock, AlertTriangle, CheckCircle2, XCircle, Clock, Activity,
  Eye, Bell, History, MapPin, Users,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TwoFactorSetup } from './TwoFactorSetup';
import { IPRestrictionManager } from './IPRestrictionManager';
import { GeoBlockingManager } from './GeoBlockingManager';
import { KnownDevicesManager } from '@/components/auth/KnownDevicesManager';
import { PushNotificationSettings } from './PushNotificationSettings';
import {
  useSecurityData, getScoreColor, getScoreProgressColor, getScoreLabel,
  type UserProfile,
} from './useSecurityData';

function getScoreIcon(score: number) {
  if (score >= 80) return <ShieldCheck className="h-8 w-8 text-success" />;
  if (score >= 60) return <Shield className="h-8 w-8 text-warning" />;
  if (score >= 40) return <ShieldAlert className="h-8 w-8 text-orange" />;
  return <ShieldX className="h-8 w-8 text-destructive" />;
}

export function SecurityDashboard() {
  const { user, isAdmin } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);

  const effectiveUserId = selectedUserId || user?.id;
  const isManagingOther = !!selectedUserId && selectedUserId !== user?.id;
  const selectedUser = users.find(u => u.user_id === selectedUserId);

  const { metrics, loginAttempts, notifications, is2FAEnabled, allowedIPs } =
    useSecurityData(effectiveUserId, isManagingOther, selectedUserId);

  useEffect(() => {
    if (isAdmin) {
      supabase.from('profiles').select('user_id, full_name, email')
        .eq('is_active', true).order('full_name')
        .then(({ data }) => { if (data) setUsers(data); });
    }
  }, [isAdmin]);

  const recommendations = [];
  if (!is2FAEnabled) recommendations.push({ icon: <Key className="h-4 w-4" />, title: 'Ativar autenticação de dois fatores', description: isManagingOther ? 'Este usuário não possui 2FA ativado' : 'Adiciona uma camada extra de segurança à sua conta', priority: 'high' });
  if (allowedIPs.length === 0) recommendations.push({ icon: <Globe className="h-4 w-4" />, title: 'Configurar restrição de IP', description: 'Limite o acesso por endereços IP específicos', priority: 'medium' });
  if (metrics.failedLoginAttempts > 3) recommendations.push({ icon: <AlertTriangle className="h-4 w-4" />, title: 'Revisar tentativas de login falhas', description: 'Foram detectadas várias tentativas de login sem sucesso', priority: 'high' });

  return (
    <div className="space-y-6">
      {/* Admin User Selector */}
      {isAdmin && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-primary">
                <Users className="h-5 w-5" />
                <span className="font-medium text-sm">Gerenciar segurança de:</span>
              </div>
              <Select value={selectedUserId || user?.id || ''} onValueChange={(v) => setSelectedUserId(v === user?.id ? null : v)}>
                <SelectTrigger className="w-[500px] bg-background"><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      <div className="flex items-center gap-2">
                        <span>{u.full_name || 'Sem nome'}</span>
                        <span className="text-muted-foreground text-xs">({u.email})</span>
                        {u.user_id === user?.id && <Badge variant="secondary" className="text-xs ml-1">Você</Badge>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isManagingOther && <Badge variant="outline" className="border-primary text-primary">Gerenciando: {selectedUser?.full_name || selectedUser?.email}</Badge>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Score Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-full lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Pontuação de Segurança</CardTitle>
            <CardDescription>{isManagingOther ? `Avaliação de segurança de ${selectedUser?.full_name || selectedUser?.email}` : 'Avaliação geral da segurança da sua conta'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
                {getScoreIcon(metrics.score)}
                <span className={`text-3xl font-bold mt-2 ${getScoreColor(metrics.score)}`}>{metrics.score}%</span>
                <Badge variant={metrics.score >= 60 ? 'default' : 'destructive'} className="mt-1">{getScoreLabel(metrics.score)}</Badge>
              </div>
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span>Progresso da segurança</span><span className={getScoreColor(metrics.score)}>{metrics.score}%</span></div>
                  <div className="relative h-3 rounded-full bg-secondary overflow-hidden">
                    <div className={`h-full transition-all duration-500 ${getScoreProgressColor(metrics.score)}`} style={{ width: `${metrics.score}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">{is2FAEnabled ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}<span>MFA {is2FAEnabled ? 'ativo' : 'inativo'}</span></div>
                  <div className="flex items-center gap-2">{allowedIPs.length > 0 ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}<span>{allowedIPs.length} IPs permitidos</span></div>
                  <div className="flex items-center gap-2"><Monitor className="h-4 w-4 text-muted-foreground" /><span>{metrics.knownDevicesCount} dispositivos</span></div>
                  <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-muted-foreground" /><span>{metrics.recentLoginAttempts} logins recentes</span></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Key className="h-4 w-4" />MFA</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {is2FAEnabled ? <><Lock className="h-5 w-5 text-success" /><span className="text-lg font-semibold text-success">Ativo</span></> : <><Unlock className="h-5 w-5 text-destructive" /><span className="text-lg font-semibold text-destructive">Inativo</span></>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{is2FAEnabled ? 'Proteção extra ativada' : 'Recomendado ativar'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><Bell className="h-4 w-4" />Alertas</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {metrics.securityAlerts > 0 ? <><AlertTriangle className="h-5 w-5 text-warning" /><span className="text-lg font-semibold text-warning">{metrics.securityAlerts}</span></> : <><CheckCircle2 className="h-5 w-5 text-success" /><span className="text-lg font-semibold text-success">0</span></>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{metrics.securityAlerts > 0 ? 'Alertas não lidos' : 'Nenhum alerta pendente'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-warning/20 bg-warning/5">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-warning" />Recomendações de Segurança</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-background">
                  <div className={`p-2 rounded-full ${rec.priority === 'high' ? 'bg-destructive/10 text-destructive' : 'bg-orange/10 text-orange'}`}>{rec.icon}</div>
                  <div className="flex-1"><h4 className="font-medium text-sm">{rec.title}</h4><p className="text-xs text-muted-foreground">{rec.description}</p></div>
                  <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'}>{rec.priority === 'high' ? 'Alta' : 'Média'}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview" className="flex items-center gap-2"><Eye className="h-4 w-4" /><span className="hidden sm:inline">Visão Geral</span></TabsTrigger>
          <TabsTrigger value="mfa" className="flex items-center gap-2"><Key className="h-4 w-4" /><span className="hidden sm:inline">MFA</span></TabsTrigger>
          <TabsTrigger value="devices" className="flex items-center gap-2"><Monitor className="h-4 w-4" /><span className="hidden sm:inline">Dispositivos</span></TabsTrigger>
          <TabsTrigger value="ips" className="flex items-center gap-2"><Globe className="h-4 w-4" /><span className="hidden sm:inline">IPs</span></TabsTrigger>
          <TabsTrigger value="geo" className="flex items-center gap-2"><MapPin className="h-4 w-4" /><span className="hidden sm:inline">Geo</span></TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2"><Bell className="h-4 w-4" /><span className="hidden sm:inline">Push</span></TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2"><History className="h-4 w-4" /><span className="hidden sm:inline">Histórico</span></TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Activity className="h-4 w-4" />Logins Recentes</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {loginAttempts.slice(0, 10).map((attempt) => (
                      <div key={attempt.id} className="flex items-center justify-between p-2 rounded-lg border">
                        <div className="flex items-center gap-3">
                          {attempt.success ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                          <div>
                            <p className="text-sm font-medium">{attempt.ip_address}</p>
                            <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(attempt.created_at), { addSuffix: true, locale: ptBR })}</p>
                          </div>
                        </div>
                        <Badge variant={attempt.success ? 'default' : 'destructive'}>{attempt.success ? 'Sucesso' : 'Falha'}</Badge>
                      </div>
                    ))}
                    {loginAttempts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum login registrado</p>}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm font-medium flex items-center gap-2"><Bell className="h-4 w-4" />Alertas de Segurança</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3">
                    {notifications.map((notif) => (
                      <div key={notif.id} className={`p-3 rounded-lg border ${!notif.is_read ? 'bg-primary/5 border-primary/20' : ''}`}>
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-4 w-4 text-orange mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{notif.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                            <p className="text-xs text-muted-foreground mt-2">{formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ptBR })}</p>
                          </div>
                          {!notif.is_read && <Badge variant="secondary" className="text-xs">Novo</Badge>}
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="text-center py-8">
                        <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-2" />
                        <p className="text-sm font-medium">Tudo seguro!</p>
                        <p className="text-xs text-muted-foreground">Nenhum alerta de segurança pendente</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mfa"><TwoFactorSetup targetUserId={isManagingOther ? selectedUserId! : undefined} targetUserEmail={isManagingOther ? selectedUser?.email || undefined : undefined} /></TabsContent>
        <TabsContent value="devices"><KnownDevicesManager targetUserId={isManagingOther ? selectedUserId! : undefined} /></TabsContent>
        <TabsContent value="ips"><IPRestrictionManager /></TabsContent>
        <TabsContent value="geo"><GeoBlockingManager /></TabsContent>
        <TabsContent value="notifications"><PushNotificationSettings /></TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Histórico de Logins</CardTitle>
              <CardDescription>{isManagingOther ? `Tentativas de login de ${selectedUser?.full_name || selectedUser?.email}` : 'Todas as tentativas de login na sua conta'}</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {loginAttempts.map((attempt) => (
                    <div key={attempt.id} className={`flex items-center justify-between p-3 rounded-lg border ${!attempt.success ? 'border-destructive/20 bg-destructive/5' : ''}`}>
                      <div className="flex items-center gap-4">
                        {attempt.success ? (
                          <div className="p-2 rounded-full bg-success/10"><CheckCircle2 className="h-4 w-4 text-success" /></div>
                        ) : (
                          <div className="p-2 rounded-full bg-destructive/10"><XCircle className="h-4 w-4 text-destructive" /></div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{attempt.success ? 'Login bem-sucedido' : 'Tentativa falha'}</span>
                            <Badge variant={attempt.success ? 'default' : 'destructive'} className="text-xs">{attempt.success ? 'OK' : 'Falha'}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{attempt.ip_address}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(new Date(attempt.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                          </div>
                          {attempt.failure_reason && <p className="text-xs text-destructive mt-1">Motivo: {attempt.failure_reason}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                  {loginAttempts.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum login registrado ainda</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
