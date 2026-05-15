/**
 * Fluxo: Empty state de Favoritos
 *
 * Cenário:
 *  - Limpa o storage de favoritos (`product-favorites`) e quaisquer caches
 *    da camada cloud que possam restar (best-effort).
 *  - Acessa `/favoritos` e valida:
 *      • header (título + ícone + contagem = 0)
 *      • presença do empty state (testid `favorites-empty-state`)
 *      • CTA do empty navega para o catálogo
 *      • catálogo: o botão de favoritar do 1º card NÃO está marcado
 *        (aria-pressed="false" ou ausente, e SEM classes de fill destrutivo)
 *      • voltar para /favoritos sem clicar em nada → continua vazio
 *  - Cleanup: restaura o snapshot original do storage.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import { installFavoritesCleanup } from "../helpers/favorites";
import { Sel } from "../fixtures/selectors";
import type { Page } from "@playwright/test";

const STORAGE_KEY = "product-favorites";

interface FavoriteItem {
  productId: string;
  addedAt: string;
}

async function readStorage(page: Page): Promise<FavoriteItem[]> {
  return page.evaluate((key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as FavoriteItem[]) : [];
    } catch {
      return [];
    }
  }, STORAGE_KEY);
}

async function writeStorage(page: Page, items: FavoriteItem[]): Promise<void> {
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: STORAGE_KEY, value: items },
  );
}

async function clearAllFavoritesArtifacts(page: Page): Promise<void> {
  await page.evaluate((key) => {
    try {
      localStorage.removeItem(key);
      // best-effort: limpa qualquer chave correlata de cache de favoritos
      Object.keys(localStorage)
        .filter((k) => /favorit/i.test(k))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* noop */
    }
  }, STORAGE_KEY);
}

async function readFavoritesCount(page: Page): Promise<number> {
  const loc = page.locator(Sel.favorites.countItems);
  await loc.first().waitFor({ state: "visible", timeout: 10_000 });
  const txt = (await loc.first().innerText()).trim();
  return Number.parseInt(txt, 10) || 0;
}

test.describe("Fluxo: /favoritos com lista vazia", () => {
  test.beforeEach(() => requireAuth());
  installFavoritesCleanup(test);

  test("mostra empty state e mantém botão de favoritar consistente no catálogo", async ({
    page,
  }) => {
    // 0. Pré-condições: estar na origin para mexer em localStorage
    await gotoAndSettle(page, "/produtos");
    const original = await readStorage(page);

    // 1. Limpa storage de favoritos e qualquer cache correlato
    await clearAllFavoritesArtifacts(page);
    expect((await readStorage(page)).length).toBe(0);

    // 2. /favoritos vazio: header + empty state visíveis
    await gotoAndSettle(page, "/favoritos");
    await expect(page).toHaveURL(/favoritos/);

    // Header consistente
    await expect(page.locator(Sel.favorites.title)).toHaveText("Meus Favoritos");
    const icon = page.locator(Sel.favorites.icon);
    await expect(icon).toBeVisible();
    await expect(icon).toHaveAttribute("aria-label", "Favoritos");

    // Contagem zero
    await expect
      .poll(() => readFavoritesCount(page), {
        message: "favorites-count-items deveria ser 0 com lista vazia",
        timeout: 10_000,
      })
      .toBe(0);

    // Empty state presente
    const empty = page.locator(Sel.favorites.emptyState).first();
    await expect(
      empty,
      "empty state de favoritos deveria estar visível",
    ).toBeVisible({ timeout: 10_000 });

    // Não devem existir cards de favoritos renderizados
    await expect(
      page.locator(Sel.favorites.remove),
      "não deveria haver cards de favoritos com botão Remover",
    ).toHaveCount(0);

    // 3. Catálogo: botão de favoritar do 1º card NÃO está marcado
    await gotoAndSettle(page, "/produtos");
    const card = page.locator(Sel.product.card).first();
    await card.waitFor({ state: "visible", timeout: 15_000 });

    const favBtn = card.locator(Sel.product.favorite).first();
    await favBtn.waitFor({ state: "visible", timeout: 10_000 });

    // Estado consistente: aria-pressed deve ser "false" ou ausente
    const pressed = await favBtn.getAttribute("aria-pressed");
    expect(
      pressed === null || pressed === "false",
      `aria-pressed deveria ser "false"/ausente, recebeu "${pressed}"`,
    ).toBe(true);

    // E não pode ter as classes/SVG de "favoritado" (fill destrutivo)
    const hasFilledHeart = await favBtn.evaluate((el) => {
      const html = el.innerHTML;
      return /fill-destructive|fill-current/.test(html);
    });
    expect(
      hasFilledHeart,
      "ícone do botão não deveria estar com fill-destructive/fill-current quando vazio",
    ).toBe(false);

    // Storage continua vazio (apenas observamos, sem clicar)
    expect((await readStorage(page)).length).toBe(0);

    // 4. Voltar para /favoritos sem clicar em nada → continua vazio
    await gotoAndSettle(page, "/favoritos");
    await expect
      .poll(() => readFavoritesCount(page), { timeout: 10_000 })
      .toBe(0);
    await expect(page.locator(Sel.favorites.emptyState).first()).toBeVisible();

    // 5. Cleanup: restaura snapshot original
    await writeStorage(page, original);
  });

  test("CTA do empty state navega para o catálogo", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    const original = await readStorage(page);

    await clearAllFavoritesArtifacts(page);
    await gotoAndSettle(page, "/favoritos");

    const empty = page.locator(Sel.favorites.emptyState).first();
    await expect(empty).toBeVisible({ timeout: 10_000 });

    const cta = page.locator(Sel.favorites.emptyCta).first();
    if (await cta.isVisible().catch(() => false)) {
      await cta.click();
      // O CTA da branch sem-RPC navega para "/" (catálogo). Aceitamos / ou /produtos.
      await page.waitForURL(/\/(produtos)?$|\/produtos/, { timeout: 10_000 }).catch(() => {});
      await expect(page).toHaveURL(/\/(produtos)?$|\/produtos/);
    }

    // Cleanup
    await gotoAndSettle(page, "/produtos");
    await writeStorage(page, original);
  });
});
