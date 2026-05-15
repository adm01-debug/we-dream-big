/**
 * Fluxo: Persistência de Favoritos via leitura de localStorage
 *
 * Favoritos são 100% client-side: `useFavorites` (src/hooks/useFavorites.ts)
 * persiste em `localStorage["product-favorites"]` no formato:
 *   [{ productId: string, addedAt: ISOString }]
 *
 * Este spec valida o contrato de persistência em duas direções:
 *
 *  1) UI → storage: favoritar pela UI grava no storage e sobrevive a `page.reload()`.
 *  2) storage → UI: pré-popular o storage hidrata `/favoritos` corretamente após reload,
 *     sem qualquer interação prévia.
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

async function clearStorage(page: Page): Promise<void> {
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
}

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

/** Resolve o productId do 1º card (data-product-id ou href /produto/:id). */
async function firstCardProductId(page: Page): Promise<string> {
  const card = page.locator(Sel.product.card).first();
  await card.waitFor({ state: "visible", timeout: 15_000 });

  // tentativa 1: data-product-id no card ou em descendente
  const byAttr = await card
    .evaluate((el) => {
      const withAttr = (el as HTMLElement).matches("[data-product-id]")
        ? (el as HTMLElement)
        : (el.querySelector("[data-product-id]") as HTMLElement | null);
      return withAttr?.getAttribute("data-product-id") ?? "";
    })
    .catch(() => "");
  if (byAttr) return byAttr;

  // tentativa 2: href /produto/:id
  const link = card.locator('a[href^="/produto/"]').first();
  if ((await link.count()) > 0) {
    const href = (await link.getAttribute("href")) ?? "";
    const match = href.match(/^\/produto\/([^/?#]+)/);
    if (match?.[1]) return match[1];
  }

  throw new Error("não foi possível resolver productId do 1º card");
}

test.describe("Persistência de favoritos via localStorage", () => {
  test.beforeEach(() => requireAuth());
  installFavoritesCleanup(test);

  test("favoritar pela UI grava no localStorage e persiste após reload", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    await waitForReady(page);

    const before = await readStorage(page);

    // 1. Favorita o 1º card via UI
    const card = page.locator(Sel.product.card).first();
    await card.waitFor({ state: "visible", timeout: 15_000 });
    const favBtn = card.locator(Sel.product.favorite).first();
    await favBtn.waitFor({ state: "visible" });
    await favBtn.click();

    // 2. Espera o storage refletir +1 item
    await expect
      .poll(async () => (await readStorage(page)).length, {
        message: "localStorage não recebeu o novo favorito",
        timeout: 8_000,
      })
      .toBe(before.length + 1);

    const afterAdd = await readStorage(page);
    const beforeIds = new Set(before.map((f) => f.productId));
    const added = afterAdd.find((f) => !beforeIds.has(f.productId));

    expect(added, "novo item de favorito não encontrado no storage").toBeTruthy();
    expect(typeof added!.productId).toBe("string");
    expect(added!.productId.length).toBeGreaterThan(0);
    expect(typeof added!.addedAt).toBe("string");
    expect(
      Number.isFinite(Date.parse(added!.addedAt)),
      `addedAt "${added!.addedAt}" deveria ser ISO parseável`,
    ).toBe(true);

    // 3. Reload — storage sobrevive
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForReady(page);

    const afterReload = await readStorage(page);
    expect(afterReload.length, "contagem do storage mudou após reload").toBe(afterAdd.length);
    expect(
      afterReload.some((f) => f.productId === added!.productId),
      "productId persistido sumiu após reload",
    ).toBe(true);

    // 4. UI hidrata a partir do storage
    await gotoAndSettle(page, "/favoritos");
    await expect
      .poll(() => readFavoritesCount(page), { timeout: 10_000 })
      .toBe(before.length + 1);

    // 5. Cleanup — restaura o storage ao snapshot inicial
    await writeStorage(page, before);
    expect((await readStorage(page)).length).toBe(before.length);
  });

  test("storage pré-populado hidrata /favoritos sem interação prévia (e sobrevive a reload)", async ({
    page,
  }) => {
    // Precisa estar na origin do app antes de mexer em localStorage
    await gotoAndSettle(page, "/produtos");
    await waitForReady(page);

    const productId = await firstCardProductId(page);
    const original = await readStorage(page);

    // Pré-popula storage com APENAS este produto
    await clearStorage(page);
    await writeStorage(page, [{ productId, addedAt: new Date().toISOString() }]);

    // Carregamento fresco — força hidratação a partir do storage
    await gotoAndSettle(page, "/favoritos");
    await waitForReady(page);

    await expect
      .poll(() => readFavoritesCount(page), {
        message: "UI não hidratou a partir do storage pré-populado",
        timeout: 10_000,
      })
      .toBe(1);

    await expect(page.locator(Sel.favorites.remove).first()).toBeVisible({
      timeout: 10_000,
    });

    // Reload — hidratação se mantém sem qualquer ação
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForReady(page);

    await expect
      .poll(() => readFavoritesCount(page), { timeout: 10_000 })
      .toBe(1);
    await expect(page.locator(Sel.favorites.remove).first()).toBeVisible({
      timeout: 10_000,
    });

    const afterReload = await readStorage(page);
    expect(afterReload.length).toBe(1);
    expect(afterReload[0]?.productId).toBe(productId);

    // Cleanup — restaura snapshot original
    await writeStorage(page, original);
  });
});
