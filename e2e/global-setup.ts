/**
 * Global setup — roda UMA vez ANTES de toda a suite Playwright.
 *
 * Limpa dados residuais de execuções anteriores que possam ter ficado
 * para trás (CI cancelado, crash do worker, etc.) garantindo que a suite
 * comece de um estado conhecido.
 *
 * Skip silencioso quando configuração de cleanup está ausente.
 */
import { loadCleanupConfig, logSkipReason, purgeAll } from "./helpers/cleanup-client";

export default async function globalSetup(): Promise<void> {
  const cfg = loadCleanupConfig();
  if (!cfg) {
    logSkipReason("setup");
    return;
  }
  await purgeAll(cfg, { reason: "pre-suite" });
}
