/**
 * Sentry initialization — LAZY LOADED.
 *
 * O bundle do Sentry (~186KB) NÃO entra no chunk inicial. Carregamos via
 * `import()` dinâmico após `requestIdleCallback` (ou 3s de fallback) para
 * priorizar o First Contentful Paint.
 *
 * Erros disparados antes do load são bufferizados e dispensados no flush.
 */
import type * as SentryNS from '@sentry/react';

type SentryModule = typeof SentryNS;

let sentryRef: SentryModule | null = null;
let initialized = false;
let loadingPromise: Promise<SentryModule | null> | null = null;

interface BufferedError {
  error: Error;
  context?: Record<string, unknown>;
}
const ERROR_BUFFER: BufferedError[] = [];
let bufferedUser: { id: string; email?: string } | null | undefined = undefined;
const BUFFER_MAX = 50;

function shouldLoadSentry(): boolean {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  return !!dsn;
}

async function loadSentry(): Promise<SentryModule | null> {
  if (sentryRef) return sentryRef;
  if (loadingPromise) return loadingPromise;
  if (!shouldLoadSentry()) return null;

  loadingPromise = (async () => {
    try {
      const mod = await import('@sentry/react');
      sentryRef = mod;

      const dsn = import.meta.env.VITE_SENTRY_DSN as string;
      mod.init({
        dsn,
        environment:
          (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) || import.meta.env.MODE,
        // Release tag = commit SHA do Vercel — permite associar erro ao deploy
        release: (import.meta.env.VITE_VERCEL_GIT_COMMIT_SHA as string | undefined) || undefined,
        tracesSampleRate: import.meta.env.PROD ? 0.1 : 0,
        replaysSessionSampleRate: 0,
        // Onda 5: aprovado por Joaquim — replay 100% quando dá erro
        replaysOnErrorSampleRate: import.meta.env.PROD ? 1.0 : 0,
        integrations: [
          mod.browserTracingIntegration(),
          // LGPD: mascarar todo texto + inputs, não enviar imagens/vídeos
          mod.replayIntegration({
            maskAllText: true,
            maskAllInputs: true,
            blockAllMedia: true,
          }),
          // Onda 5: captura console.error automaticamente
          // (logger.error → console.error → GlitchTip)
          mod.captureConsoleIntegration({ levels: ['error'] }),
        ],
        // Onda 5: ignorar ruído conhecido (não-bug nosso)
        ignoreErrors: [
          // Browser/extension noise
          'ResizeObserver loop limit exceeded',
          'ResizeObserver loop completed with undelivered notifications',
          'Non-Error promise rejection captured',
          // Network noise (oscilação de conexão dos vendedores)
          'Failed to fetch',
          'NetworkError when attempting to fetch resource',
          'Load failed',
          // Extension noise
          /extension:\/\//,
          /moz-extension:\/\//,
        ],
        beforeSend(event) {
          if (event.request?.headers) {
            delete (event.request.headers as Record<string, unknown>).authorization;
            delete (event.request.headers as Record<string, unknown>).cookie;
          }
          return event;
        },
      });
      initialized = true;

      // Flush user e buffer
      if (bufferedUser !== undefined) {
        mod.setUser(bufferedUser);
      }
      while (ERROR_BUFFER.length) {
        const item = ERROR_BUFFER.shift();
        if (!item) break;
        mod.captureException(item.error, { extra: item.context });
      }
      return mod;
    } catch {
      // Falha em carregar — bloqueia novas tentativas para não thrashear
      return null;
    }
  })();

  return loadingPromise;
}

/**
 * Agenda o carregamento do Sentry após idle (ou 3s).
 * Idempotente: chamadas múltiplas não duplicam o load.
 */
export function initSentry(): void {
  if (initialized || loadingPromise) return;
  if (!shouldLoadSentry()) return;

  const trigger = () => {
    void loadSentry();
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (
      window as Window & {
        requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void;
      }
    ).requestIdleCallback(trigger, { timeout: 3000 });
  } else {
    setTimeout(trigger, 3000);
  }
}

export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (!shouldLoadSentry()) return;
  if (sentryRef && initialized) {
    sentryRef.captureException(error, { extra: context });
    return;
  }
  // Buffer com cap para não vazar memória
  if (ERROR_BUFFER.length < BUFFER_MAX) {
    ERROR_BUFFER.push({ error, context });
  }
  // Garante que o load foi agendado (caso initSentry não tenha rodado ainda)
  void loadSentry();
}

export function setSentryUser(user: { id: string; email?: string } | null): void {
  if (!shouldLoadSentry()) return;
  if (sentryRef && initialized) {
    sentryRef.setUser(user);
  } else {
    bufferedUser = user;
    void loadSentry();
  }
}

/**
 * Re-export do ErrorBoundary do Sentry (apenas após o load assíncrono).
 * Não use diretamente — em produção, prefira `EnhancedErrorBoundary` em src/main.tsx
 * que funciona desde o paint inicial.
 */
export function getSentryErrorBoundary(): typeof SentryNS.ErrorBoundary | null {
  return sentryRef?.ErrorBoundary ?? null;
}
