/**
 * Fluxo: payload inválido em `localStorage["product-favorites"]` ao carregar /favoritos
 *
 * Garante que a UI:
 *  1. NÃO crasheia (página renderiza header + título)
 *  2. Loga erro estruturado no console (contrato do hook useFavorites)
 *  3. NÃO atualiza o contador para um valor fantasma vindo do payload corrompido
 *     (favorites-count-items deve ser 0, não o length de qualquer coisa parseada)
 *  4. Renderiza o empty state (favorites-empty-state visível)
 *  5. A lista (favorites-list) não contém cards (favorite-item count === 0)
 *
 * Casos cobertos via test.describe.parallel: JSON malformado, tipo errado (objeto
 * em vez de array), array com itens malformados (sem productId), string crua.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import { installFavoritesCleanup } from "../helpers/favorites";
import { Sel } from "../fixtures/selectors";
import type { ConsoleMessage, Page } from "@playwright/test";

const STORAGE_KEY = "product-favorites";

interface InvalidPayloadCase {
  label: string;
  /** Valor literal a injetar em localStorage (string crua, sem JSON.stringify extra). */
  rawValue: string;
  /**
   * Se o payload for parseável (não lança em JSON.parse), define o "tamanho fantasma"
   * que NÃO deve aparecer no contador. Para JSON malformado, fica `null`.
   */
  ghostCount: number | null;
}

const CASES: InvalidPayloadCase[] = [
  {
    label: "JSON malformado",
    rawValue: "{not-json,,,",
    ghostCount: null,
  },
  {
    label: "tipo errado (objeto em vez de array)",
    rawValue: JSON.stringify({ productId: "x", addedAt: "2024-01-01" }),
    ghostCount: null,
  },
  {
    label: "array com itens sem productId",
    // 7 itens malformados — se o app fosse permissivo, exibiria "7" no contador.
    rawValue: JSON.stringify([
      { foo: "bar" },
      { addedAt: "2024-01-01" },
      null,
      42,
      "string-solta",
      { productId: 123 },
      { productId: "" },
    ]),
    ghostCount: 7,
  },
  {
    label: "string crua (não-JSON)",
    rawValue: "definitely not json at all",
    ghostCount: null,
  },
];

async function readFavoritesCountItems(page: Page): Promise<number> {
  const loc = page.locator(Sel.favorites.countItems).first();
  await loc.waitFor({ state: "visible", timeout: 10_000 });
  return Number.parseInt((await loc.innerText()).trim(), 10) || 0;
}

/**
 * Injeta o payload inválido ANTES de qualquer hook do app rodar.
 * Usa addInitScript para garantir que o valor já esteja em localStorage
 * no primeiro tick — antes do `useEffect` de hidratação dos favoritos.
 */
async function seedInvalidPayload(page: Page, rawValue: string): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* noop */
      }
    },
    { key: STORAGE_KEY, value: rawValue },
  );
}

test.describe("Fluxo: payload inválido em /favoritos não corrompe contador", () => {
  test.beforeEach(() => requireAuth());
  installFavoritesCleanup(test);

  for (const tc of CASES) {
    test(`payload inválido — ${tc.label}: empty state, contador=0 e console.error`, async ({
      page,
    }) => {
      // 1. Captura console.error/pageerror ANTES de navegar
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];
      const onConsole = (msg: ConsoleMessage) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      };
      const onPageError = (err: Error) => {
        pageErrors.push(err.message);
      };
      page.on("console", onConsole);
      page.on("pageerror", onPageError);

      try {
        // 2. Semeia o payload corrompido antes do app inicializar
        await seedInvalidPayload(page, tc.rawValue);

        // 3. Carrega /favoritos
        await gotoAndSettle(page, "/favoritos");

        // 4. Página NÃO crashou — título do h1 está presente
        await expect(page.locator(Sel.favorites.title)).toBeVisible({ timeout: 10_000 });
        await expect(page.locator(Sel.favorites.title)).toHaveText("Meus Favoritos");

        // 5. NENHUM erro fatal de runtime (uncaught) deve ter ocorrido
        expect(
          pageErrors,
          `[${tc.label}] não deveria haver pageerror (uncaught) — got: ${pageErrors.join(" | ")}`,
        ).toEqual([]);

        // 6. Confirma que o storage continha o payload corrompido no momento do load
        const stored = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
        expect(stored, `[${tc.label}] payload semeado deveria ter sido carregado`).not.toBeNull();

        // 7. Contador (favorites-count-items) deve ser 0 — NÃO o "ghostCount"
        const count = await readFavoritesCountItems(page);
        expect(count, `[${tc.label}] contador deveria ser 0 com payload inválido`).toBe(0);
        if (tc.ghostCount !== null) {
          expect(
            count,
            `[${tc.label}] contador NÃO pode refletir o length do payload fantasma (${tc.ghostCount})`,
          ).not.toBe(tc.ghostCount);
        }

        // 8. Empty state está visível e nenhum card foi renderizado
        await expect(page.locator(Sel.favorites.emptyState)).toBeVisible({ timeout: 10_000 });
        await expect(page.locator(Sel.favorites.item)).toHaveCount(0);

        // 9. Para payloads que lançam em JSON.parse, o hook loga "Error loading favorites".
        //    Para os demais (parse OK mas tipo inválido), o app simplesmente ignora —
        //    nesse caso aceitamos ausência de log, desde que count=0 e empty state ok.
        const willThrow = (() => {
          try {
            JSON.parse(tc.rawValue);
            return false;
          } catch {
            return true;
          }
        })();
        if (willThrow) {
          const matched = consoleErrors.some((m) => /error loading favorites/i.test(m));
          expect(
            matched,
            `[${tc.label}] esperado console.error contendo "Error loading favorites" — got: ${consoleErrors.join(" | ")}`,
          ).toBe(true);
        }
      } finally {
        page.off("console", onConsole);
        page.off("pageerror", onPageError);
        // Cleanup: remove o payload corrompido para não contaminar outros testes
        await page.evaluate((k) => localStorage.removeItem(k), STORAGE_KEY).catch(() => {});
      }
    });
  }
});
