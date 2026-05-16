/**
 * SSOT para resolver o destino pós-login.
 *
 * Mesma função consumida pelo fluxo de e-mail/senha (`Auth.tsx` após `signIn`)
 * e pelo fluxo Google (`SSOCallbackPage` após o round-trip OAuth).
 *
 * Precedência (primeira fonte válida vence):
 *  1. `location.state.from` — destino capturado pelo guard na mesma aba.
 *  2. `?redirect=/path` — deep-link manual na URL de `/auth`.
 *  3. `sessionStorage` (`consumePostLoginRedirect`) — sobrevive ao round-trip OAuth.
 *  4. fallback `/`.
 *
 * Sempre passa o candidato por `consumePostLoginRedirect` para validar paths
 * inseguros (esquemas, protocol-relative, rotas de auth → loop) e zerar o
 * sessionStorage (one-shot).
 */
import { consumePostLoginRedirect } from './post-login-redirect';

export interface RedirectFromState {
  pathname?: string;
  search?: string;
  hash?: string;
}

export interface ResolveRedirectInput {
  /** `location.state.from` (do React Router) */
  fromState?: RedirectFromState | null;
  /** Valor cru do query param `redirect` (ou null) */
  queryRedirect?: string | null;
}

export function resolveRedirectTarget(input: ResolveRedirectInput): string {
  const { fromState, queryRedirect } = input;

  if (fromState?.pathname) {
    const path = `${fromState.pathname}${fromState.search ?? ''}${fromState.hash ?? ''}`;
    return consumePostLoginRedirect(path);
  }

  return consumePostLoginRedirect(queryRedirect ?? '/');
}
