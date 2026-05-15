/**
 * IncidentTimeline72h — Onda 14
 *
 * Timeline horizontal compacta abaixo da Pulse Bar mostrando incidentes
 * (P0/P1/P2) das últimas 72h. Cada evento é um marcador posicionado
 * proporcionalmente no eixo do tempo, colorido por severidade. Hover/
 * focus exibe tooltip com título, severidade e timestamp relativo.
 *
 * Respeita o filtro global de severidade (SeverityFilterContext).
 */
import { useMemo } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useIncidentTimeline72h, type TimelineEvent } from "./useIncidentTimeline72h";
import { useSeverityFilter } from "./SeverityFilterContext";
import type { IncidentSeverity } from "./useRecentIncidents";

const SEV_DOT: Record<IncidentSeverity, string> = {
  P0: "bg-destructive ring-destructive/30",
  P1: "bg-amber-500 ring-amber-500/30 dark:bg-amber-400 dark:ring-amber-400/30",
  P2: "bg-sky-500 ring-sky-500/30 dark:bg-sky-400 dark:ring-sky-400/30",
};

const SEV_LABEL: Record<IncidentSeverity, string> = {
  P0: "Crítico (P0)",
  P1: "Alto (P1)",
  P2: "Informativo (P2)",
};

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins}min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.round(hours / 24);
  return `há ${days}d`;
}

function TimelineMarker({ ev }: { ev: TimelineEvent }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "absolute -translate-x-1/2 top-1/2 -translate-y-1/2",
            "h-2.5 w-2.5 rounded-full ring-2 ring-offset-1 ring-offset-background",
            "transition-transform hover:scale-150 focus-visible:scale-150 focus:outline-none",
            SEV_DOT[ev.severity],
          )}
          style={{ left: `${ev.position * 100}%` }}
          aria-label={`${SEV_LABEL[ev.severity]}: ${ev.title} (${formatRelative(ev.occurredAt)})`}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
            <span className={cn("inline-block h-2 w-2 rounded-full", SEV_DOT[ev.severity])} />
            {SEV_LABEL[ev.severity]}
          </div>
          <div className="text-xs font-medium leading-tight">{ev.title}</div>
          {ev.subtitle && (
            <div className="text-[11px] text-muted-foreground line-clamp-2">{ev.subtitle}</div>
          )}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground pt-0.5">
            <Clock className="h-2.5 w-2.5" />
            {formatRelative(ev.occurredAt)} · {new Date(ev.occurredAt).toLocaleString("pt-BR")}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function IncidentTimeline72h() {
  const { data, isLoading } = useIncidentTimeline72h();
  const { matches } = useSeverityFilter();

  const filteredEvents = useMemo(
    () => (data?.events ?? []).filter((e) => matches(e.severity)),
    [data?.events, matches],
  );

  const counts = useMemo(() => {
    const c = { P0: 0, P1: 0, P2: 0 } as Record<IncidentSeverity, number>;
    for (const e of filteredEvents) c[e.severity] += 1;
    return c;
  }, [filteredEvents]);

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card px-4 py-3 animate-pulse" aria-busy="true">
        <div className="h-3 w-40 bg-muted rounded mb-3" />
        <div className="h-2 w-full bg-muted rounded-full" />
      </div>
    );
  }

  // Tick labels a cada 12h (0h, 12h, 24h, 36h, 48h, 60h, 72h)
  const ticks = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 1];

  return (
    <TooltipProvider delayDuration={150}>
      <section
        aria-label="Timeline de incidentes nas últimas 72 horas"
        className="rounded-lg border bg-card px-4 py-3 space-y-2"
      >
        <header className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Últimas 72h · {filteredEvents.length} evento{filteredEvents.length === 1 ? "" : "s"}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className={cn("h-2 w-2 rounded-full", SEV_DOT.P0)} /> P0 {counts.P0}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className={cn("h-2 w-2 rounded-full", SEV_DOT.P1)} /> P1 {counts.P1}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className={cn("h-2 w-2 rounded-full", SEV_DOT.P2)} /> P2 {counts.P2}
            </span>
          </div>
        </header>

        {filteredEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">
            Sem incidentes na janela atual. Sistema estável. ✨
          </p>
        ) : (
          <div className="relative pt-2 pb-5">
            {/* Trilha */}
            <div className="relative h-2 rounded-full bg-muted/60">
              {/* Ticks verticais */}
              {ticks.map((t) => (
                <div
                  key={t}
                  className="absolute top-0 bottom-0 w-px bg-border/60"
                  style={{ left: `${t * 100}%` }}
                />
              ))}
              {/* Marcadores de evento */}
              {filteredEvents.map((ev) => (
                <TimelineMarker key={ev.id} ev={ev} />
              ))}
            </div>
            {/* Labels de tick */}
            <div className="relative mt-1.5 h-3 text-[10px] text-muted-foreground">
              {[
                { pos: 0, label: "-72h" },
                { pos: 0.5, label: "-36h" },
                { pos: 1, label: "agora" },
              ].map((t) => (
                <span
                  key={t.label}
                  className="absolute -translate-x-1/2"
                  style={{ left: `${t.pos * 100}%` }}
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>
    </TooltipProvider>
  );
}
