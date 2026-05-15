import { devInfraGate } from './dev-gate/DevInfraGate';

/**
 * @deprecated Use `devInfraGate.shouldShow(isDev)` diretamente ou o hook `useDevGate()`.
 * Mantido para compatibilidade durante a migração.
 */
export function shouldShowDevInfraMessages(isDev: boolean): boolean {
  return devInfraGate.shouldShow(isDev);
}
