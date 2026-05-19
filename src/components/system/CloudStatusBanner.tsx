import { memo, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  RefreshCw,
  WifiOff,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useCloudStatus } from '@/hooks/ui';
import { useDevGate } from '@/hooks/admin';
import { DevOnly } from '@/components/dev/DevOnly';
import { getStatusTimeline } from '@/lib/cloud-status';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type BannerVariant = {
  className: string;
  icon: LucideIcon;
  message: string;
};

const STATUS_CONFIG: Partial<Record<'down' | 'degraded' | 'warming', BannerVariant>> = {
  down: {
    message: 'Backend indisponível. Verifique sua conexão e tente novamente.',
    icon: WifiOff,
    className: 'bg-destructive text-destructive-foreground border-destructive/40',
  },
  degraded: {
    message: 'Backend instável — algumas operações podem falhar momentaneamente.',
    icon: AlertTriangle,
    className: 'bg-warning text-warning-foreground border-warning/40',
  },
  warming: {
    message:
      'Backend inicializando parcialmente — algumas operações podem demorar alguns segundos.',
    icon: Loader2,
    className: 'bg-muted text-muted-foreground border-border',
  },
};

const CloudStatusBannerInner = memo(function CloudStatusBannerInner() {
  const { status, snapshot, retry, isChecking } = useCloudStatus();
  const { isAllowed } = useDevGate();
  const [showDebug, setShowDebug] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const timeline = useMemo(() => getStatusTimeline(), []);
  const isIssueStatus = status === 'down' || status === 'degraded' || status === 'warming';
  const config = isIssueStatus ? STATUS_CONFIG[status] : null;
  if (!isIssueStatus) return null;
  // Mensagens críticas (down/degraded) são visíveis para todos. "warming" é
  // técnico e fica oculto para não-devs / quando o gate de infra está fechado.
  if (status === 'warming' && !isAllowed) return null;

  // Defensivo: como shouldShow exige status ∈ {down, degraded, warming},
  // config sempre estará definido aqui. Os fallbacks (?? ...) protegem caso
  // STATUS_CONFIG fique incompleto no futuro mas, hoje, são dead code — daí
  // o pragma de cobertura v8.
  /* v8 ignore next 5 */
  const Icon = config?.icon ?? CheckCircle2;
  const message =
    config?.message ??
    (status === 'unknown'
      ? 'Cloud status aguardando primeira sondagem.'
      : 'Cloud saudável — modo debug ativo.');
  const className = config?.className ?? 'bg-card text-foreground border-border';

  return (
    <AnimatePresence>
      <motion.div
        key={status}
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        transition={{ duration: 0.2 }}
        role="status"
        aria-live="polite"
        className={cn(
          'safe-area-top sticky top-0 z-50 w-full border-b shadow-md transition-colors duration-500',
          className,
        )}
      >
        <div className="container mx-auto px-4 py-2">
          <div className="flex flex-col items-start gap-3 text-sm sm:flex-row sm:items-center">
            <div className="flex flex-1 items-start gap-3 sm:items-center">
              <Icon
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0 sm:mt-0',
                  status === 'warming' && 'animate-spin',
                  !config && 'text-green-500',
                )}
                aria-hidden
              />
              <span className="flex-1 font-medium leading-tight">{message}</span>
            </div>

            <div className="flex items-center gap-2">
              <DevOnly strict>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowTimeline(!showTimeline)}
                  title="Ver histórico"
                >
                  <Clock className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowDebug(!showDebug)}
                  title="Debug Latência"
                >
                  <Info className="h-3.5 w-3.5" />
                </Button>
              </DevOnly>

              {status === 'down' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void retry()}
                  disabled={isChecking}
                  className="h-7 gap-1.5"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', isChecking && 'animate-spin')} />
                  Tentar novamente
                </Button>
              )}
            </div>
          </div>

          <AnimatePresence>
            {showDebug && snapshot && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-current/10 mt-2 grid grid-cols-3 gap-4 border-t pt-2 font-mono text-xs"
              >
                {[
                  { label: 'AUTH', signal: snapshot.signals.auth },
                  { label: 'BRIDGE', signal: snapshot.signals.bridge },
                  { label: 'REST', signal: snapshot.signals.rest },
                ].map(({ label, signal }) => (
                  <div key={label} className="flex items-center gap-2">
                    {signal.ok ? (
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                    <span>
                      {label}: {signal.ms}ms
                    </span>
                  </div>
                ))}
              </motion.div>
            )}

            {showTimeline && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-current/10 mt-2 max-h-40 overflow-y-auto border-t pt-2"
              >
                <div className="flex flex-col gap-1">
                  {timeline
                    .slice()
                    .reverse()
                    .map((entry, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between font-mono text-[10px] opacity-80"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              entry.status === 'healthy'
                                ? 'bg-green-500'
                                : entry.status === 'down'
                                  ? 'bg-red-500'
                                  : 'bg-yellow-500',
                            )}
                          />
                          <span>{entry.status.toUpperCase()}</span>
                          {entry.consecutiveFailures > 0 && (
                            <span className="text-red-400">
                              ({entry.consecutiveFailures} falhas)
                            </span>
                          )}
                        </div>
                        <span className="italic text-muted-foreground">
                          {formatDistanceToNow(entry.timestamp, { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                    ))}
                  {timeline.length === 0 && (
                    <div className="py-2 text-center text-[10px] text-muted-foreground">
                      Sem histórico disponível.
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

export const CloudStatusBanner = memo(function CloudStatusBanner() {
  // Wrapper-level gating foi removido: o gating por estado (warming → dev-only)
  // é decidido dentro de CloudStatusBannerInner, e os botões internos de debug
  // continuam protegidos por <DevOnly strict>.
  return <CloudStatusBannerInner />;
});
