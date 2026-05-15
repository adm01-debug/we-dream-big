/**
 * Global teardown — roda UMA vez DEPOIS de toda a suite Playwright.
 *
 * Limpa dados de aplicação criados pelos usuários de teste durante a
 * execução. Skip silencioso quando faltam variáveis de configuração.
 *
 * Lógica detalhada vive em `e2e/helpers/cleanup-client.ts` e é
 * compartilhada com `global-setup.ts` e a fixture `cleanup-on-failure`.
 */
import { loadCleanupConfig, logSkipReason, purgeAll } from "./helpers/cleanup-client";

export default async function globalTeardown(): Promise<void> {
  const cfg = loadCleanupConfig();
  if (!cfg) {
    logSkipReason("teardown");
    return;
  }
  await purgeAll(cfg, { reason: "post-suite" });
}
