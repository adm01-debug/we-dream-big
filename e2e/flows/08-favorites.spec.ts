/**
 * Fluxo: Favoritos
 *
 * Cobertura:
 *  1) Lista de favoritos carrega
 *  2) Persistência após reload (caso principal):
 *     - favorita o primeiro produto do catálogo
 *     - captura o productId do card (data-product-id, SSOT estável)
 *     - recarrega `/favoritos` e valida que o item persiste
 *     - cleanup: desfavorita para deixar o estado igual ao inicial
 *  3) Toggle no card é idempotente (favorita/desfavorita)
 *
 * Política: SSOT em e2e/fixtures/selectors.ts — somente data-testid.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import { installFavoritesCleanup } from "../helpers/favorites";
import { Sel } from "../fixtures/selectors";
import type { Locator, Page } from "@playwright/test";

const FAV_BUTTON_SELECTOR = Sel.product.favorite;

/** Encontra o primeiro card do catálogo com botão de favoritar visível. */
async function firstCatalogCard(page: Page): Promise<Locator> {
  const card = page.locator(Sel.product.card).first();
  await card.waitFor({ state: "visible", timeout: 15_000 });
  return card;
}

/** Resolve o productId estável do card (data-product-id no card ou descendente). */
async function readCardProductId(card: Locator): Promise<string> {
  const id = await card.evaluate((el) => {
    const node = (el as HTMLElement).matches("[data-product-id]")
      ? (el as HTMLElement)
      : (el.querySelector("[data-product-id]") as HTMLElement | null);
    return node?.getAttribute("data-product-id") ?? "";
  });
  return id ?? "";
}

/** Estado atual do botão (favoritado vs não-favoritado), via aria-pressed. */
async function isFavorited(button: Locator): Promise<boolean> {
  const pressed = await button.getAttribute("aria-pressed");
  return pressed === "true";
}

/** Lê a contagem numérica de ITENS exibida no header de Favoritos. */
async function readFavoritesCount(page: Page): Promise<number> {
  const loc = page.locator(Sel.favorites.countItems);
  await loc.first().waitFor({ state: "visible", timeout: 10_000 });
  const txt = (await loc.first().innerText()).trim();
  return Number.parseInt(txt, 10) || 0;
}

/**
 * Lê a contagem numérica de LISTAS exibida no header de Favoritos.
 * Retorna `null` quando o usuário não tem nenhuma lista (o nó nem é renderizado).
 */
async function readFavoritesListsCount(page: Page): Promise<number | null> {
  const loc = page.locator(Sel.favorites.countLists).first();
  if (await loc.count() === 0) return null;
  if (!(await loc.isVisible().catch(() => false))) return null;
  const txt = (await loc.innerText()).trim();
  const n = Number.parseInt(txt, 10);
  return Number.isFinite(n) ? n : null;
}

/** Lê itens + listas em paralelo. */
async function readFavoritesCounters(
  page: Page,
): Promise<{ items: number; lists: number | null }> {
  const [items, lists] = await Promise.all([
    readFavoritesCount(page),
    readFavoritesListsCount(page),
  ]);
  return { items, lists };
}

/**
 * Asserções "pré-interação" do header de Favoritos:
 *  - h1 (page-title-favoritos) visível com texto "Meus Favoritos"
 *  - container favorites-icon visível
 *  - <svg> do lucide Heart presente DENTRO do container
 *  - classes `fill-destructive` e `text-destructive` aplicadas no <svg> Heart
 *
 * Deve ser chamada ANTES de qualquer interação com a lista para garantir
 * que a página renderizou o header correto e o estilo destrutivo do ícone.
 */
async function assertFavoritesHeaderVisuals(page: Page) {
  // 1. Título h1
  const title = page.locator(Sel.favorites.title);
  await expect(title, "h1 page-title-favoritos deve estar visível").toBeVisible({
    timeout: 15_000,
  });
  await expect(title, "h1 deve ter o texto 'Meus Favoritos'").toHaveText(/Meus Favoritos/);
  expect(
    await title.evaluate((el) => el.tagName.toLowerCase()),
    "page-title-favoritos deve ser um <h1>",
  ).toBe("h1");

  // 2. Container do ícone
  const iconBox = page.locator(Sel.favorites.icon);
  await expect(iconBox, "container favorites-icon deve estar visível").toBeVisible();

  // 3. <svg> do Heart dentro do container (lucide injeta <svg class="lucide lucide-heart ...">)
  const heartSvg = iconBox.locator("svg").first();
  await expect(heartSvg, "ícone Heart (svg) deve existir dentro do favorites-icon").toBeVisible();

  // 4. Classes destrutivas aplicadas no svg
  const svgClass = (await heartSvg.getAttribute("class")) ?? "";
  expect(
    /\bfill-destructive\b/.test(svgClass),
    `ícone Heart deve ter a classe 'fill-destructive' (class atual: "${svgClass}")`,
  ).toBe(true);
  expect(
    /\btext-destructive\b/.test(svgClass),
    `ícone Heart deve ter a classe 'text-destructive' (class atual: "${svgClass}")`,
  ).toBe(true);
}

/** Valida título, ícone/label e contagem do header de Favoritos. */
async function assertFavoritesHeader(
  page: Page,
  expectedCount: number,
  opts: { checkCardsMatch?: boolean } = {},
) {
  await assertFavoritesHeaderVisuals(page);
  await expect
    .poll(() => readFavoritesCount(page), {
      message: `header favorites-count-items deveria ser ${expectedCount}`,
      timeout: 10_000,
    })
    .toBe(expectedCount);
  if (opts.checkCardsMatch) {
    const cards = await page.locator(Sel.favorites.item).count();
    expect(cards, "qtde de cards renderizados deve bater com a contagem do header").toBe(
      expectedCount,
    );
  }
}

test.describe("Fluxo: Favoritos", () => {
  test.beforeEach(() => requireAuth());
  installFavoritesCleanup(test);

  test("lista de favoritos carrega", async ({ page }) => {
    await gotoAndSettle(page, "/favoritos");
    await expect(page).toHaveURL(/favoritos/);
    // Header visível em qualquer estado (com itens ou empty state)
    await expect(
      page.locator(Sel.favorites.title).or(page.locator(Sel.favorites.emptyState)),
    ).toBeVisible({ timeout: 15_000 });
    // Quando o título aparece, valida h1 + Heart + fill-destructive antes de qualquer leitura
    if (await page.locator(Sel.favorites.title).isVisible().catch(() => false)) {
      await assertFavoritesHeaderVisuals(page);
    }
  });

  test("favorita um produto, recarrega e ele persiste na lista", async ({ page }) => {
    // 0. Snapshot inicial do header de favoritos
    await gotoAndSettle(page, "/favoritos");
    await assertFavoritesHeaderVisuals(page);
    const countBefore = await readFavoritesCount(page);

    // 1. Catálogo + 1º card
    await gotoAndSettle(page, "/produtos");
    const card = await firstCatalogCard(page);
    const productId = await readCardProductId(card);
    expect(productId, "data-product-id do 1º card não pôde ser lido").toBeTruthy();

    const favButton = card.locator(FAV_BUTTON_SELECTOR).first();
    await favButton.waitFor({ state: "visible" });

    // 2. Estado inicial garantido = NÃO favoritado
    if (await isFavorited(favButton)) {
      await favButton.click();
      await expect.poll(() => isFavorited(favButton), { timeout: 8_000 }).toBe(false);
    }

    // 3. Favorita
    await favButton.click();
    await expect
      .poll(() => isFavorited(favButton), {
        message: "botão não passou para estado favoritado",
        timeout: 8_000,
      })
      .toBe(true);

    // 4. /favoritos antes do reload
    await gotoAndSettle(page, "/favoritos");
    await assertFavoritesHeader(page, countBefore + 1, { checkCardsMatch: true });

    // 5. RELOAD e revalida header
    await page.reload({ waitUntil: "domcontentloaded" });
    await assertFavoritesHeader(page, countBefore + 1, { checkCardsMatch: true });

    // 6. Persistência do produto específico (por data-product-id)
    const targetCard = page.locator(`${Sel.favorites.item}[data-product-id="${productId}"]`).first();
    await expect(targetCard).toBeVisible({ timeout: 10_000 });

    // 7. Cleanup: desfaz o favorito clicando no botão Remover do card alvo
    const removeBtn = targetCard.locator(Sel.favorites.remove).first();
    await removeBtn.click().catch(() => {});

    // ConfirmDialog (se aparecer) — usa testid global do ConfirmDialog
    const confirm = page.locator(Sel.dialog.confirmYes).first();
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click().catch(() => {});
    }

    // Header volta ao inicial (sem reload)
    await expect
      .poll(() => readFavoritesCount(page), { timeout: 10_000 })
      .toBe(countBefore);

    // Reload e revalida ausência persistida
    await page.reload({ waitUntil: "domcontentloaded" });
    await assertFavoritesHeader(page, countBefore, { checkCardsMatch: true });

    // O card do produto removido NÃO deve mais existir
    await expect(
      page.locator(`${Sel.favorites.item}[data-product-id="${productId}"]`),
      `card de favorito ${productId} deveria ter sumido após cleanup + reload`,
    ).toHaveCount(0, { timeout: 10_000 });
  });

  test("header de favoritos: itens + listas permanecem consistentes após reload", async ({ page }) => {
    await gotoAndSettle(page, "/favoritos");
    await assertFavoritesHeaderVisuals(page);

    // Snapshot ANTES do reload (itens + listas)
    const before = await readFavoritesCounters(page);
    await assertFavoritesHeader(page, before.items);

    // RELOAD
    await page.reload({ waitUntil: "domcontentloaded" });
    await assertFavoritesHeaderVisuals(page);

    // Snapshot DEPOIS do reload — precisa bater com o anterior
    const after = await readFavoritesCounters(page);
    await assertFavoritesHeader(page, before.items);

    expect(
      after.items,
      `contador de ITENS deveria permanecer ${before.items} após reload (got ${after.items})`,
    ).toBe(before.items);
    expect(
      after.lists,
      `contador de LISTAS deveria permanecer ${before.lists} após reload (got ${after.lists})`,
    ).toBe(before.lists);
  });

  test("toggle do favorito é idempotente (favorita e desfavorita)", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    const card = await firstCatalogCard(page);
    const favButton = card.locator(FAV_BUTTON_SELECTOR).first();
    await favButton.waitFor({ state: "visible" });

    const initial = await isFavorited(favButton);

    await favButton.click();
    await expect.poll(() => isFavorited(favButton), { timeout: 8_000 }).toBe(!initial);

    await favButton.click();
    await expect.poll(() => isFavorited(favButton), { timeout: 8_000 }).toBe(initial);
  });
});
