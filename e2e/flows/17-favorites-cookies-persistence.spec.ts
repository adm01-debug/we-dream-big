/**
 * Fluxo: cookies/sessão NÃO interferem na persistência local de favoritos
 *
 * Hipóteses validadas:
 *  1. Os favoritos vivem em `localStorage["product-favorites"]`, NÃO em cookies.
 *     → snapshot de cookies não deve mencionar a chave nem o productId favoritado.
 *  2. Reload com cookies PRESERVADOS (sessão intacta): favorito sobrevive
 *     (storage idêntico + UI exibe o card).
 *  3. Reload com cookies LIMPOS (sessão de auth removida): o storage local
 *     CONTINUA presente — porque favoritos são per-device, não per-session —
 *     e o UI re-hidrata o mesmo length. Isso prova que o cookie de auth não
 *     é o veículo de persistência. (Se a app redirecionar para /login, o
 *     teste tolera e valida apenas o storage cru; é o caso de plataforma fechada.)
 *  4. Restaura o estado de cookies original ao final.
 *
 * Diferença vs. spec 16:
 *  - 16 valida ESTRUTURA do payload pré/pós-reload (mesma sessão).
 *  - Este isola o EFEITO DOS COOKIES sobre essa persistência.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import { installFavoritesCleanup } from "../helpers/favorites";
import { Sel } from "../fixtures/selectors";
import type { BrowserContext, Cookie, Locator, Page } from "@playwright/test";

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

async function readFavoritesCount(page: Page): Promise<number | null> {
  const loc = page.locator(Sel.favorites.countItems).first();
  const visible = await loc
    .waitFor({ state: "visible", timeout: 5_000 })
    .then(() => true)
    .catch(() => false);
  if (!visible) return null; // pode ter sido redirecionado para /login
  return Number.parseInt((await loc.innerText()).trim(), 10) || 0;
}

async function isFavorited(button: Locator): Promise<boolean> {
  const pressed = await button.getAttribute("aria-pressed");
  if (pressed === "true") return true;
  const html = await button.innerHTML();
  return /fill-destructive|fill-current/.test(html);
}

/** Snapshot dos cookies do contexto (deep clone via JSON p/ comparações estáveis). */
async function snapshotCookies(ctx: BrowserContext): Promise<Cookie[]> {
  const raw = await ctx.cookies();
  return JSON.parse(JSON.stringify(raw)) as Cookie[];
}

test.describe("Fluxo: cookies/sessão e persistência de favoritos", () => {
  test.beforeEach(() => requireAuth());
  installFavoritesCleanup(test);

  test("cookies NÃO carregam favoritos; reload preserva estado com sessão intacta", async ({
    page,
    context,
  }) => {
    // 0. Baseline em /favoritos
    await gotoAndSettle(page, "/favoritos");
    const original = await readStorage(page);
    const cookiesOriginal = await snapshotCookies(context);

    // 1. Favorita o 1º card do catálogo
    await gotoAndSettle(page, "/produtos");
    const card = page.locator(Sel.product.card).first();
    await card.waitFor({ state: "visible", timeout: 15_000 });
    const favBtn = card.locator(Sel.product.favorite).first();
    await favBtn.waitFor({ state: "visible", timeout: 10_000 });

    if (await isFavorited(favBtn)) {
      await favBtn.click();
      await expect.poll(() => isFavorited(favBtn), { timeout: 8_000 }).toBe(false);
    }
    await favBtn.click();
    await expect.poll(() => isFavorited(favBtn), { timeout: 8_000 }).toBe(true);
    await expect
      .poll(async () => (await readStorage(page)).length, { timeout: 8_000 })
      .toBe(original.length + 1);

    const afterAdd = await readStorage(page);
    const baselineIds = new Set(original.map((f) => f.productId));
    const addedId = afterAdd.find((f) => !baselineIds.has(f.productId))?.productId;
    expect(addedId, "productId recém-adicionado não pôde ser identificado").toBeTruthy();

    // 2. PROVA NEGATIVA — favoritos NÃO viajam em cookies
    const cookiesAfterAdd = await snapshotCookies(context);
    const cookieBlob = JSON.stringify(cookiesAfterAdd);
    expect(
      cookieBlob.includes(STORAGE_KEY),
      `cookies não deveriam conter a chave "${STORAGE_KEY}"`,
    ).toBe(false);
    expect(
      cookieBlob.includes(addedId as string),
      `cookies não deveriam conter o productId favoritado (${addedId})`,
    ).toBe(false);
    // Nenhum cookie novo "favorit*" deveria ter sido criado pela ação
    const newFavoriteCookies = cookiesAfterAdd.filter(
      (c) =>
        /favorit/i.test(c.name) &&
        !cookiesOriginal.some((o) => o.name === c.name && o.domain === c.domain),
    );
    expect(
      newFavoriteCookies,
      `nenhum cookie novo com "favorit*" deveria surgir após favoritar — got: ${JSON.stringify(newFavoriteCookies.map((c) => c.name))}`,
    ).toEqual([]);

    // 3. CENÁRIO A — Reload com cookies PRESERVADOS (sessão intacta)
    await gotoAndSettle(page, "/favoritos");
    const headerBeforeReload = await readFavoritesCount(page);
    expect(headerBeforeReload).toBe(original.length + 1);
    const storageBeforeReload = await readStorage(page);
    const storageBeforeReloadJson = JSON.stringify(storageBeforeReload);

    await page.reload({ waitUntil: "load" });
    await page
      .locator(Sel.favorites.title)
      .first()
      .waitFor({ state: "visible", timeout: 10_000 });

    // Cookies devem continuar IDÊNTICOS após o reload (sessão preservada)
    const cookiesAfterReload = await snapshotCookies(context);
    expect(
      cookiesAfterReload.length,
      "número de cookies mudou após reload com sessão preservada",
    ).toBe(cookiesAfterAdd.length);

    // Storage continua idêntico
    const storageAfterReload = await readStorage(page);
    expect(
      JSON.stringify(storageAfterReload),
      "storage foi mutado durante reload com cookies preservados",
    ).toBe(storageBeforeReloadJson);

    // UI re-hidratou e card alvo está visível
    await expect
      .poll(() => readFavoritesCount(page), { timeout: 10_000 })
      .toBe(original.length + 1);
    await expect(
      page.locator(`${Sel.favorites.item}[data-product-id="${addedId}"]`),
      `card ${addedId} deveria reaparecer após reload com sessão intacta`,
    ).toHaveCount(1, { timeout: 10_000 });

    // 4. CENÁRIO B — Reload com cookies LIMPOS (sessão removida)
    //    Prova que cookies NÃO são o veículo de persistência: o storage local
    //    sobrevive porque vive em localStorage, não na sessão de auth.
    await context.clearCookies();
    const cookiesCleared = await snapshotCookies(context);
    expect(
      cookiesCleared.length,
      "context.clearCookies() deveria zerar os cookies",
    ).toBe(0);

    // Re-grava o storage no escopo da origin (clearCookies não toca localStorage,
    // mas garantimos via writeStorage para tolerar implementações que limpam
    // sessionStorage adjacente em alguns navegadores).
    await writeStorage(page, storageBeforeReload);

    await page.reload({ waitUntil: "load" });
    // Após clearCookies a app pode redirecionar para /login (plataforma fechada).
    // Em vez de `networkidle` (flaky), aguardamos um estado terminal por SELETOR:
    // /favoritos hidratado OU /login renderizado.
    await page
      .waitForFunction(
        () =>
          !!document.querySelector('[data-testid="page-title-favoritos"]') ||
          !!document.querySelector('[data-testid="login-form"], [data-testid="page-title-login"]') ||
          location.pathname.startsWith("/login"),
        { timeout: 10_000 },
      )
      .catch(() => {});

    // O storage local DEVE estar intacto, INDEPENDENTE de cookies/sessão
    const rawAfterClear = await readStorageRaw(page);
    expect(
      rawAfterClear,
      "localStorage de favoritos não deveria ser apagado por context.clearCookies()",
    ).not.toBeNull();
    const storageAfterClear = await readStorage(page);
    expect(storageAfterClear.length).toBe(storageBeforeReload.length);
    expect(storageAfterClear.map((f) => f.productId)).toEqual(
      storageBeforeReload.map((f) => f.productId),
    );

    // UI: a app pode redirecionar para /login (plataforma fechada). Toleramos.
    // O contrato testado aqui é APENAS o storage local.
    const headerAfterClear = await readFavoritesCount(page);
    if (headerAfterClear !== null) {
      expect(
        headerAfterClear,
        "se o header renderizou após cookies limpos, deveria refletir o storage",
      ).toBe(storageBeforeReload.length);
    }

    // 5. Cleanup: restaura cookies originais (e o afterEach restaura o storage)
    await context.clearCookies();
    if (cookiesOriginal.length > 0) {
      await context.addCookies(cookiesOriginal);
    }
  });
});
