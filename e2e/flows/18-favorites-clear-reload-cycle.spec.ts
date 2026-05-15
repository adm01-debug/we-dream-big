/**
 * Fluxo: ciclo limpar→reload→re-favoritar→reload em /favoritos
 *
 * Prova o contrato bidirecional do `localStorage["product-favorites"]`:
 *   FASE A — limpar antes do reload faz o favorito SUMIR
 *     1. Favorita o 1º card → header = baseline+1, storage tem o item
 *     2. localStorage.removeItem("product-favorites") (sem reload)
 *     3. page.reload() — UI deve refletir o storage VAZIO:
 *        - header = 0 itens
 *        - empty state visível
 *        - nenhum card `favorite-item` renderizado
 *        - storage continua vazio (não foi reescrito pela hidratação)
 *
 *   FASE B — re-favoritar e validar retorno no reload
 *     4. Volta ao catálogo, favorita o MESMO produto
 *     5. /favoritos: header = 1, card alvo presente, storage tem 1 item
 *     6. page.reload() — favorito SOBREVIVE:
 *        - header = 1
 *        - card alvo (`data-product-id`) renderizado
 *        - storage idêntico ao pré-reload (mesmo `addedAt`)
 *
 *   FASE C — cleanup defensivo
 *     7. Restaura `original` via writeStorage (afterEach do
 *        installFavoritesCleanup também garante)
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import { installFavoritesCleanup } from "../helpers/favorites";
import { Sel } from "../fixtures/selectors";
import type { Locator, Page } from "@playwright/test";

const STORAGE_KEY = "product-favorites";

interface FavoriteItem {
  productId: string;
  addedAt: string;
  [k: string]: unknown;
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

async function readStorageRaw(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
}

async function writeStorage(page: Page, items: FavoriteItem[]): Promise<void> {
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: STORAGE_KEY, value: items },
  );
}

async function clearFavoritesStorage(page: Page): Promise<void> {
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
}

async function readFavoritesCount(page: Page): Promise<number> {
  const loc = page.locator(Sel.favorites.countItems).first();
  await loc.waitFor({ state: "visible", timeout: 10_000 });
  return Number.parseInt((await loc.innerText()).trim(), 10) || 0;
}

async function isFavorited(button: Locator): Promise<boolean> {
  const pressed = await button.getAttribute("aria-pressed");
  if (pressed === "true") return true;
  const html = await button.innerHTML();
  return /fill-destructive|fill-current/.test(html);
}

/** Reload + espera explícita do header reidratar para `expectedCount`. */
async function reloadAndAwaitCount(page: Page, expectedCount: number): Promise<void> {
  await page.reload({ waitUntil: "load" });
  await page
    .locator(Sel.favorites.title)
    .first()
    .waitFor({ state: "visible", timeout: 10_000 });
  await expect
    .poll(() => readFavoritesCount(page), {
      message: `header favorites-count-items deveria reidratar para ${expectedCount}`,
      timeout: 10_000,
    })
    .toBe(expectedCount);
}

/** Favorita o 1º card do catálogo, retornando o productId adicionado. */
async function favoriteFirstCard(
  page: Page,
  baselineLength: number,
): Promise<{ productId: string; addedItem: FavoriteItem }> {
  await gotoAndSettle(page, "/produtos");
  const card = page.locator(Sel.product.card).first();
  await card.waitFor({ state: "visible", timeout: 15_000 });
  const favBtn = card.locator(Sel.product.favorite).first();
  await favBtn.waitFor({ state: "visible", timeout: 10_000 });

  if (await isFavorited(favBtn)) {
    await favBtn.click();
    await expect.poll(() => isFavorited(favBtn), { timeout: 8_000 }).toBe(false);
    await expect
      .poll(async () => (await readStorage(page)).length, { timeout: 8_000 })
      .toBe(baselineLength);
  }

  await favBtn.click();
  await expect
    .poll(() => isFavorited(favBtn), { timeout: 8_000 })
    .toBe(true);
  await expect
    .poll(async () => (await readStorage(page)).length, { timeout: 8_000 })
    .toBe(baselineLength + 1);

  const after = await readStorage(page);
  // O item adicionado é o ÚLTIMO (append) ou o único novo vs. baseline length
  const addedItem = after[after.length - 1];
  expect(addedItem, "item recém-adicionado não foi encontrado").toBeTruthy();
  expect(addedItem.productId.trim(), "productId não pode ser vazio").not.toBe("");
  return { productId: addedItem.productId, addedItem };
}

test.describe("Fluxo: clear localStorage → reload → re-favoritar → reload", () => {
  test.beforeEach(() => requireAuth());
  installFavoritesCleanup(test);

  test("limpar antes do reload some o favorito; re-favoritar restaura no reload", async ({
    page,
  }) => {
    // 0. Baseline em /favoritos — captura snapshot original
    await gotoAndSettle(page, "/favoritos");
    const original = await readStorage(page);
    const originalJson = JSON.stringify(original);
    // Para isolar o teste, partimos de storage VAZIO (limpamos o baseline e
    // restauramos no final via writeStorage + installFavoritesCleanup).
    await clearFavoritesStorage(page);

    // ============================================================
    // FASE A — clear → reload → favorito SUMIU
    // ============================================================

    // A.1. Favorita o 1º card (baseline = 0)
    const { productId: addedId } = await favoriteFirstCard(page, 0);

    // A.2. /favoritos: header = 1 e card visível
    await gotoAndSettle(page, "/favoritos");
    await expect.poll(() => readFavoritesCount(page), { timeout: 10_000 }).toBe(1);
    await expect(
      page.locator(`${Sel.favorites.item}[data-product-id="${addedId}"]`),
      `card ${addedId} deveria estar visível antes do clear`,
    ).toHaveCount(1, { timeout: 10_000 });

    // A.3. Limpa o localStorage SEM reload (apenas a chave de favoritos)
    await clearFavoritesStorage(page);
    expect(
      await readStorageRaw(page),
      "raw localStorage deveria ser null após removeItem",
    ).toBeNull();

    // A.4. Reload — UI deve refletir o storage vazio
    await reloadAndAwaitCount(page, 0);

    // A.5. Empty state visível e nenhum card renderizado
    await expect(page.locator(Sel.favorites.emptyState)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(Sel.favorites.item)).toHaveCount(0);
    await expect(
      page.locator(`${Sel.favorites.item}[data-product-id="${addedId}"]`),
      `card ${addedId} NÃO deveria reaparecer após clear+reload`,
    ).toHaveCount(0);

    // A.6. Storage continua vazio — hidratação não reescreveu nada
    const storageAfterClearReload = await readStorage(page);
    expect(
      storageAfterClearReload.length,
      "storage deveria continuar vazio após clear+reload (hidratação não pode resgatar)",
    ).toBe(0);

    // ============================================================
    // FASE B — re-favoritar → reload → favorito VOLTA
    // ============================================================

    // B.1. Volta ao catálogo e favorita novamente o 1º card
    const { productId: reAddedId, addedItem: reAddedItem } = await favoriteFirstCard(page, 0);
    expect(
      reAddedId,
      "re-favoritar o mesmo 1º card deveria gerar o mesmo productId",
    ).toBe(addedId);

    // B.2. /favoritos: header = 1 e card alvo presente
    await gotoAndSettle(page, "/favoritos");
    await expect.poll(() => readFavoritesCount(page), { timeout: 10_000 }).toBe(1);
    const targetCard = page
      .locator(`${Sel.favorites.item}[data-product-id="${reAddedId}"]`)
      .first();
    await expect(
      targetCard,
      `card ${reAddedId} deveria estar visível após re-favoritar`,
    ).toHaveCount(1, { timeout: 10_000 });

    // Snapshot canônico do storage pré-reload (string p/ igualdade estrita)
    const storageBeforeReload = await readStorage(page);
    const storageBeforeReloadJson = JSON.stringify(storageBeforeReload);
    expect(storageBeforeReload.length).toBe(1);
    expect(storageBeforeReload[0].productId).toBe(reAddedId);

    // B.3. Reload — favorito SOBREVIVE
    await reloadAndAwaitCount(page, 1);

    // B.4. Card alvo continua presente e empty state ausente
    await expect(
      page.locator(`${Sel.favorites.item}[data-product-id="${reAddedId}"]`),
      `card ${reAddedId} deveria reaparecer após reload`,
    ).toHaveCount(1, { timeout: 10_000 });
    await expect(page.locator(Sel.favorites.emptyState)).toHaveCount(0);

    // B.5. Storage IDÊNTICO ao pré-reload (sem mutação de addedAt)
    const storageAfterReload = await readStorage(page);
    expect(
      JSON.stringify(storageAfterReload),
      "storage foi mutado durante a hidratação pós-reload",
    ).toBe(storageBeforeReloadJson);
    expect(storageAfterReload[0].addedAt).toBe(reAddedItem.addedAt);

    // ============================================================
    // FASE C — cleanup
    // ============================================================
    await writeStorage(page, original);
    await expect
      .poll(async () => JSON.stringify(await readStorage(page)), { timeout: 5_000 })
      .toBe(originalJson);
  });
});
