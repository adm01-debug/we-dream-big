/**
 * SafeMessage — componente para renderizar mensagens de erro/aviso com
 * sanitização automática SSOT (`sanitizeMessage`) + gate `DevOnly` opcional.
 *
 * Use **sempre** que precisar exibir uma string vinda de `Error`, `error.message`,
 * `data.error` de edge function, etc. Nunca interpole essas strings direto no JSX.
 *
 * Por padrão:
 *  - **não-dev** → vê texto saneado (ou `fallback` público).
 *  - **dev**     → vê texto cru (debugging).
 *
 * Props:
 *  - `error`        — qualquer valor (Error, string, payload de edge, etc.).
 *  - `fallback`     — copy pública alternativa (default: `PUBLIC_FALLBACK_MESSAGE`).
 *  - `as`           — tag a renderizar (default: `span`).
 *  - `className`    — classes Tailwind.
 *  - `showRawForDev`— quando `true` (default), devs veem texto cru;
 *                     quando `false`, todos veem versão saneada.
 *
 * Exemplos:
 *   <SafeMessage error={err} className="text-sm text-destructive" />
 *   <SafeMessage error={data?.error} fallback="Não foi possível salvar." />
 *   <SafeMessage error={raw} showRawForDev={false} />  // forçar saneamento sempre
 */
import { type ElementType, type ReactElement, createElement } from 'react';
import { useDevGate } from '@/hooks/admin';
import { sanitizeMessage, PUBLIC_FALLBACK_MESSAGE } from '@/lib/security/sanitize-message';

export interface SafeMessageProps {
  error: unknown;
  fallback?: string;
  as?: ElementType;
  className?: string;
  showRawForDev?: boolean;
  /** data-testid opcional para E2E. */
  'data-testid'?: string;
}

export function SafeMessage({
  error,
  fallback = PUBLIC_FALLBACK_MESSAGE,
  as = 'span',
  className,
  showRawForDev = true,
  'data-testid': testId,
}: SafeMessageProps): ReactElement {
  const { isAllowed } = useDevGate();
  const isDev = showRawForDev && isAllowed;
  const text = sanitizeMessage(error, { isDev, fallback });
  return createElement(as, { className, 'data-testid': testId }, text);
}

export default SafeMessage;
