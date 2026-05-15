import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// useAppHealth — KPIs da "Saúde da Aplicação"
// ----------------------------------------------------------------------------
// Lê de public.get_app_health_summary(_minutes) — agregação read-only sobre
// public.webhook_delivery_metrics, restrita a admin/dev no servidor.
// ============================================================================

export type HealthWindow = 15 | 60 | 360 | 1440;

export interface AppHealthKpis {
  total: number;
  req_per_min: number;
  pct_4xx: number;
  pct_5xx: number;
  p95_ms: number;
  p99_ms: number;
  window_minutes: number;
  since: string;
}

export interface RouteErrorRow {
  endpoint: string;
  direction: string;
  total: number;
  count_4xx: number;
  count_5xx: number;
  error_rate_pct: number;
  last_error_at: string | null;
}

export interface WebhookSourceRow {
  source: string;
  direction: string;
  total: number;
  failures: number;
  failure_rate_pct: number;
  p95_ms: number;
  last_failure_at: string | null;
}

export interface EdgeLatencyRow {
  edge_function: string;
  total: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  avg_ms: number;
  max_ms: number;
}

export interface AppHealthSummary {
  kpis: AppHealthKpis;
  top_routes_by_error: RouteErrorRow[];
  webhooks_by_source: WebhookSourceRow[];
  edges_by_latency: EdgeLatencyRow[];
}

export function useAppHealth(windowMinutes: HealthWindow) {
  return useQuery<AppHealthSummary>({
    queryKey: ['app-health-summary', windowMinutes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_app_health_summary', {
        _minutes: windowMinutes,
      });
      if (error) throw error;
      return data as unknown as AppHealthSummary;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export interface RequestIdEvent {
  occurred_at: string;
  source: string;
  direction: string;
  event_type: string | null;
  endpoint: string | null;
  http_status: number | null;
  duration_ms: number | null;
  attempt: number | null;
  success: boolean;
  error_class: string | null;
  error_message: string | null;
  payload_bytes: number | null;
}

export interface RequestIdLookup {
  request_id: string;
  webhook_events: RequestIdEvent[];
  event_count: number;
}

export async function lookupRequestId(requestId: string): Promise<RequestIdLookup> {
  const { data, error } = await supabase.rpc('lookup_request_id', {
    _request_id: requestId,
  });
  if (error) throw error;
  return data as unknown as RequestIdLookup;
}
