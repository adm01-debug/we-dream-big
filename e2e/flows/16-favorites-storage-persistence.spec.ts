/**
 * Fluxo: validação SSOT do `localStorage["product-favorites"]`
 *
 * Garante que o contrato de persistência local de favoritos é estável:
 *  1. Snapshot inicial do storage e do header
 *  2. Favorita o 1º card do catálogo (estado conhecido)
 *  3. Valida ESTRUTURA do storage:
 *     - Continua sendo array JSON parseável
 *     - length === original.length + 1
 *     - Item adicionado tem `productId` (string não vazia) e `addedAt` (ISO válido,
 *       dentro da janela do teste)
 *     - Itens originais permanecem intactos (ordem + conteúdo)
 *  4. Valida UI ↔ storage: header `favorites-count-items` reflete o length do storage
 *  5. page.reload() — recarrega zerando o estado de runtime
 *  6. Pós-reload:
 *     - Storage continua IDÊNTICO (length, productIds, addedAt do novo item)
 *     - Header voltou ao mesmo length (re-hidratação correta)
 *     - Storage NÃO foi reescrito com timestamps novos (addedAt preservado)
 *  7. Cleanup: restaura snapshot original via writeStorage + installFavoritesCleanup
 *
 * Cobertura específica vs. spec 14:
 *  - Spec 14 foca em REMOÇÃO + persistência da remoção
 *  - Este foca em ADIÇÃO + invariantes do payload em localStorage pré/pós-reload
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
  // store legacy/zustand pode adicionar `variant` opcional — preservamos via index
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

/** Lê o valor BRUTO do localStorage (sem parse) para validar JSON-ness. */
async function readStorageRaw(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
}

async function writeStorage(page: Page, items: FavoriteItem[]): Promise<void> {
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    { key: STORAGE_KEY, value: items },
  );
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

/**
 * Reload com espera explícita de hidratação.
 * Para esse spec, o sinal SSOT de "app pronto" é o storage continuar populado +
 * o header refletir o length.
 */
async function reloadAndAwaitHydration(page: Page, expectedCount: number): Promise<void> {
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

test.describe("Fluxo: localStorage product-favorites — adição + persistência pós-reload", () => {
  test.beforeEach(() => requireAuth());
  installFavoritesCleanup(test);

  test("favoritar grava payload válido e o storage sobrevive ao reload sem mutação", async ({
    page,
  }) => {
    // 0. Baseline: vai para /favoritos para garantir hidratação inicial
    await gotoAndSettle(page, "/favoritos");
    const original = await readStorage(page);
    const baselineCount = await readFavoritesCount(page);
    expect(
      baselineCount,
      "baseline: header deveria refletir o length do storage",
    ).toBe(original.length);

    // 1. Vai para o catálogo e favorita o 1º card disponível
    await gotoAndSettle(page, "/produtos");
    const card = page.locator(Sel.product.card).first();
    await card.waitFor({ state: "visible", timeout: 15_000 });

    const favBtn = card.locator(Sel.product.favorite).first();
    await favBtn.waitFor({ state: "visible", timeout: 10_000 });

    // Se já estiver favoritado (estado herdado), desfavorita primeiro p/ partir do baseline
    if (await isFavorited(favBtn)) {
      await favBtn.click();
      await expect.poll(() => isFavorited(favBtn), { timeout: 8_000 }).toBe(false);
      await expect
        .poll(async () => (await readStorage(page)).length, { timeout: 8_000 })
        .toBe(original.length);
    }

    // Marca janela temporal para validar `addedAt` posteriormente
    const tStart = Date.now();
    await favBtn.click();
    await expect
      .poll(() => isFavorited(favBtn), {
        message: "botão não passou para estado favoritado",
        timeout: 8_000,
      })
      .toBe(true);

    // 2. Storage deve refletir +1 com payload válido
    await expect
      .poll(async () => (await readStorage(page)).length, { timeout: 8_000 })
      .toBe(original.length + 1);
    const tEnd = Date.now();

    const afterAdd = await readStorage(page);

    // 2.1. Estrutura: ainda é array
    expect(Array.isArray(afterAdd), "storage deveria ser um array").toBe(true);

    // 2.2. Raw é JSON parseável (defesa contra escrita corrompida)
    const raw = await readStorageRaw(page);
    expect(raw, "raw localStorage não pode ser null após favoritar").not.toBeNull();
    expect(() => JSON.parse(raw as string), "raw deveria ser JSON válido").not.toThrow();

    // 2.3. Itens originais preservados (mesma ordem e mesmo productId)
    const baselineIds = original.map((f) => f.productId);
    const afterIds = afterAdd.map((f) => f.productId);
    expect(
      afterIds.slice(0, baselineIds.length),
      "itens originais deveriam permanecer no início do array",
    ).toEqual(baselineIds);

    // 2.4. Item novo: productId não vazio + addedAt ISO dentro da janela do teste
    const baselineSet = new Set(baselineIds);
    const added = afterAdd.find((f) => !baselineSet.has(f.productId));
    expect(added, "item recém-adicionado não foi encontrado no storage").toBeTruthy();
    expect(typeof added!.productId, "productId deveria ser string").toBe("string");
    expect(added!.productId.trim(), "productId não pode ser vazio").not.toBe("");
    expect(typeof added!.addedAt, "addedAt deveria ser string").toBe("string");

    const addedAtMs = Date.parse(added!.addedAt);
    expect(
      Number.isFinite(addedAtMs),
      `addedAt deveria ser ISO parseável (got "${added!.addedAt}")`,
    ).toBe(true);
    // Tolerância de 5s para clock skew entre teste e browser
    expect(
      addedAtMs >= tStart - 5_000 && addedAtMs <= tEnd + 5_000,
      `addedAt (${added!.addedAt}) fora da janela [${new Date(tStart).toISOString()}, ${new Date(tEnd).toISOString()}]`,
    ).toBe(true);

    // 3. UI ↔ storage: header em /favoritos reflete o novo length
    await gotoAndSettle(page, "/favoritos");
    await expect
      .poll(() => readFavoritesCount(page), { timeout: 10_000 })
      .toBe(original.length + 1);

    // Snapshot canônico do estado pré-reload (string para igualdade estrita)
    const storageBeforeReload = await readStorage(page);
    const storageBeforeReloadJson = JSON.stringify(storageBeforeReload);

    // 4. Reload — runtime é zerado, storage deve sobreviver
    await reloadAndAwaitHydration(page, original.length + 1);

    // 5. Pós-reload: storage IDÊNTICO ao pré-reload (sem reescrita com novos timestamps)
    const storageAfterReload = await readStorage(page);
    expect(
      JSON.stringify(storageAfterReload),
      "storage foi mutado durante a hidratação pós-reload (esperado: idêntico)",
    ).toBe(storageBeforeReloadJson);

    // 5.1. Reafirma invariantes específicos
    expect(storageAfterReload.length).toBe(original.length + 1);
    expect(storageAfterReload.map((f) => f.productId)).toEqual(
      storageBeforeReload.map((f) => f.productId),
    );
    const addedAfterReload = storageAfterReload.find((f) => f.productId === added!.productId);
    expect(addedAfterReload, "item adicionado deveria sobreviver ao reload").toBeTruthy();
    expect(
      addedAfterReload!.addedAt,
      "addedAt foi reescrito durante o reload (deveria ser preservado)",
    ).toBe(added!.addedAt);

    // 5.2. Raw continua JSON-parseável
    const rawAfterReload = await readStorageRaw(page);
    expect(rawAfterReload, "raw localStorage não pode ser null após reload").not.toBeNull();
    expect(() => JSON.parse(rawAfterReload as string)).not.toThrow();

    // 6. Cleanup explícito (afterEach do installFavoritesCleanup também restaura)
    await writeStorage(page, original);
  });
});
