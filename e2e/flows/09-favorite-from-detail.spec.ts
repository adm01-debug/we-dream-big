/**
 * Fluxo: Favoritar a partir da PÁGINA DE DETALHE do produto
 *
 *  1) Abre o catálogo, escolhe o 1º card e navega para /produto/:id
 *  2) Clica no botão Favoritar (Sel.product.detailFavorite)
 *  3) Se o VariantPickerDialog abrir, escolhe "Sem cor específica"
 *  4) Vai para /favoritos, valida contagem (countBefore + 1) e card pelo data-product-id
 *  5) RELOAD e revalida persistência
 *  6) Cleanup: desfavorita pela lista e confirma sumiço
 *
 * Política: SSOT em e2e/fixtures/selectors.ts — somente data-testid.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import { installFavoritesCleanup } from "../helpers/favorites";
import { Sel } from "../fixtures/selectors";
import type { Locator, Page } from "@playwright/test";

async function readFavoritesCount(page: Page): Promise<number> {
  const loc = page.locator(Sel.favorites.countItems);
  await loc.first().waitFor({ state: "visible", timeout: 10_000 });
  const txt = (await loc.first().innerText()).trim();
  return Number.parseInt(txt, 10) || 0;
}

async function waitForReady(page: Page) {
  await page
    .waitForFunction(
      () => !document.querySelector('[data-state="loading"], [data-skeleton]'),
      { timeout: 8_000 },
    )
    .catch(() => {});
}

/** Botão de favoritar do detalhe — somente testid (SSOT). */
function detailFavoriteButton(page: Page): Locator {
  return page.locator(Sel.product.detailFavorite).first();
}

/** Detecta estado favoritado via aria-pressed. */
async function isFavoritedDetail(btn: Locator): Promise<boolean> {
  const pressed = await btn.getAttribute("aria-pressed").catch(() => null);
  return pressed === "true";
}

/** Resolve productId do 1º card via data-product-id ou href /produto/:id. */
async function firstCardProductId(page: Page): Promise<{ id: string; href: string | null }> {
  const card = page.locator(Sel.product.card).first();
  await card.waitFor({ state: "visible", timeout: 15_000 });

  const id = await card.evaluate((el) => {
    const node = (el as HTMLElement).matches("[data-product-id]")
      ? (el as HTMLElement)
      : (el.querySelector("[data-product-id]") as HTMLElement | null);
    return node?.getAttribute("data-product-id") ?? "";
  });

  let href: string | null = null;
  const detailLink = card.locator('a[href^="/produto/"]').first();
  if ((await detailLink.count()) > 0) {
    href = await detailLink.getAttribute("href");
  }
  return { id, href };
}

test.describe("Fluxo: Favoritar a partir da página de detalhe", () => {
  test.beforeEach(() => requireAuth());
  installFavoritesCleanup(test);

  test("favorita no detalhe, recarrega /favoritos e o produto aparece na lista", async ({
    page,
  }) => {
    // 0. Snapshot do header
    await gotoAndSettle(page, "/favoritos");
    await expect(page.locator(Sel.favorites.title)).toBeVisible();
    const countBefore = await readFavoritesCount(page);

    // 1. Catálogo → 1º card → detalhe
    await gotoAndSettle(page, "/produtos");
    const { id: productId, href } = await firstCardProductId(page);
    expect(productId, "productId do 1º card não pôde ser lido").toBeTruthy();

    if (href) {
      await gotoAndSettle(page, href);
    } else {
      await page.locator(Sel.product.card).first().click();
      await page.waitForURL(/\/produto\/[^/]+/, { timeout: 15_000 });
    }
    await waitForReady(page);
    await expect(page).toHaveURL(/\/produto\/[^/]+/);

    // 2. Verifica nome do produto está renderizado (via testid)
    await expect(page.locator(Sel.product.name).first()).toBeVisible({ timeout: 15_000 });

    // 3. Estado inicial = NÃO favoritado
    const favBtn = detailFavoriteButton(page);
    await favBtn.waitFor({ state: "visible", timeout: 10_000 });

    if (await isFavoritedDetail(favBtn)) {
      await favBtn.click();
      await expect
        .poll(() => isFavoritedDetail(favBtn), { timeout: 8_000 })
        .toBe(false);
    }

    // 4. Favorita — pode abrir VariantPickerDialog
    await favBtn.click();

    const noVariant = page.locator(Sel.variant.noVariant).first();
    if (await noVariant.isVisible().catch(() => false)) {
      await noVariant.click();
    }

    await expect
      .poll(() => isFavoritedDetail(favBtn), {
        message: "botão do detalhe não passou para 'Favoritado'",
        timeout: 10_000,
      })
      .toBe(true);

    // 5. /favoritos antes do reload — card aparece pelo data-product-id
    await gotoAndSettle(page, "/favoritos");
    await expect
      .poll(() => readFavoritesCount(page), { timeout: 10_000 })
      .toBe(countBefore + 1);

    const targetCard = page.locator(`${Sel.favorites.item}[data-product-id="${productId}"]`).first();
    await expect(
      targetCard,
      `card do produto ${productId} deveria aparecer em /favoritos`,
    ).toBeVisible({ timeout: 10_000 });

    // 6. RELOAD — produto persiste
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForReady(page);

    await expect
      .poll(() => readFavoritesCount(page), { timeout: 10_000 })
      .toBe(countBefore + 1);
    await expect(targetCard).toBeVisible({ timeout: 10_000 });

    // 7. Cleanup — desfavorita pela lista
    await targetCard.locator(Sel.favorites.remove).first().click().catch(() => {});

    const confirm = page.locator(Sel.dialog.confirmYes).first();
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click().catch(() => {});
    }

    await expect
      .poll(() => readFavoritesCount(page), { timeout: 10_000 })
      .toBe(countBefore);

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForReady(page);

    await expect
      .poll(() => readFavoritesCount(page), { timeout: 10_000 })
      .toBe(countBefore);
    await expect(
      page.locator(`${Sel.favorites.item}[data-product-id="${productId}"]`),
      `card do produto ${productId} deveria sumir após cleanup + reload`,
    ).toHaveCount(0, { timeout: 10_000 });
  });
});
