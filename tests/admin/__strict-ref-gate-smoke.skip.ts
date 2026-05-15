/**
 * Smoke test do gate global STRICT_REF_WARNINGS.
 *
 * Este teste apenas dispara um console.error com a mensagem canônica do
 * React FORA de qualquer `installReactWarningGuard` (que substitui o spy).
 * Em modo padrão (sem STRICT_REF_WARNINGS=1) o setup global apenas grava
 * no snapshot e o teste passa. Em modo estrito o `afterAll` global eleva
 * `process.exitCode = 1` — o que faz o CI falhar mesmo com todos os
 * `expect()` verdes. Portanto o teste por si só sempre passa; o que
 * verificamos é a presença do registro no snapshot.
 *
 * Para evitar quebrar o pipeline padrão, este arquivo é EXCLUÍDO do run
 * normal e só é executado pelo job dedicado `test:strict-ref-smoke`.
 */
import { describe, it, expect } from "vitest";

describe("strict-ref gate smoke", () => {
  it("emite ref warning canônico para validar o gate global", () => {
    // Mensagem real do React 18.
    console.error(
      "Warning: Function components cannot be given refs. " +
        "Attempts to access this ref will fail. Did you mean to use React.forwardRef()?%s",
      "\n    in StrictRefSmokeProbe",
    );
    expect(true).toBe(true);
  });
});
