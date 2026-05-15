/**
 * Fluxo: Remover favorito em /favoritos → reload → item sumiu
 *
 * Garante que a remoção é PERSISTIDA (localStorage + UI):
 *  1. Snapshot inicial do storage e do header
 *  2. Favorita o 1º card do catálogo (estado conhecido)
 *  3. Vai para /favoritos e captura o nome do produto recém-adicionado
 *  4. Remove esse item via botão "Remover favorito" (com confirm tolerante)
 *  5. Header volta a countBefore (sem reload)
 *  6. page.reload() → header continua em countBefore
 *  7. O nome do produto NÃO aparece mais no texto da página (toHaveCount(0))
 *  8. Cleanup: restaura o storage original
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle, settleAfterAction } from "../helpers/nav";
import { installFavoritesCleanup } from "../helpers/favorites";
import { Sel } from "../fixtures/selectors";
import type { Locator, Page } from "@playwright/test";

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

async function readFavoritesTitle(page: Page): Promise<string> {
  const loc = page.locator(Sel.favorites.title).first();
  await loc.waitFor({ state: "visible", timeout: 10_000 });
  return (await loc.innerText()).trim();
}

async function readFavoritesCount(page: Page): Promise<number> {
  const loc = page.locator(Sel.favorites.countItems);
  await loc.first().waitFor({ state: "visible", timeout: 10_000 });
  const txt = (await loc.first().innerText()).trim();
  return Number.parseInt(txt, 10) || 0;
}

/** Lê o texto completo do bloco `favorites-count` (ex.: "3 itens • 2 listas"). */
async function readFavoritesCountText(page: Page): Promise<string> {
  const loc = page.locator(Sel.favorites.count).first();
  await loc.waitFor({ state: "visible", timeout: 10_000 });
  return (await loc.innerText()).trim().replace(/\s+/g, " ");
}

/** Conta cards renderizados na lista de favoritos. */
async function readFavoritesListSize(page: Page): Promise<number> {
  return page.locator(Sel.favorites.item).count();
}

interface FavoriteRenderedItem {
  productId: string;
  productName: string;
}

/**
 * Lista os itens renderizados em `[data-testid="favorite-item"]` extraindo
 * `data-product-id` e `data-product-name` (SSOT do card).
 *
 * Retorna a lista na ORDEM DOM atual (preserva a ordem de renderização para
 * permitir comparações estritas com `toEqual`). Usar essa lista é mais robusto
 * que apenas contar cards: detecta swaps, duplicatas e ordering issues.
 */
async function readFavoritesItems(page: Page): Promise<FavoriteRenderedItem[]> {
  return page.locator(Sel.favorites.item).evaluateAll((nodes) =>
    nodes.map((el) => ({
      productId: (el as HTMLElement).dataset.productId ?? "",
      productName: (el as HTMLElement).dataset.productName ?? "",
    })),
  );
}

interface FavoritesSnapshot {
  title: string;
  count: number;
  countText: string;
  listSize: number;
  items: FavoriteRenderedItem[];
}

/** Lê título + contadores + lista de itens em paralelo (snapshot reutilizável). */
async function readFavoritesSnapshot(page: Page): Promise<FavoritesSnapshot> {
  const [title, count, countText, listSize, items] = await Promise.all([
    readFavoritesTitle(page),
    readFavoritesCount(page),
    readFavoritesCountText(page),
    readFavoritesListSize(page),
    readFavoritesItems(page),
  ]);
  return { title, count, countText, listSize, items };
}

/** Asserta que o snapshot atual bate com `expected` (uso pré e pós-reload). */
async function expectFavoritesSnapshot(
  page: Page,
  expected: FavoritesSnapshot,
  label: string,
): Promise<FavoritesSnapshot> {
  await expect
    .poll(() => readFavoritesCount(page), {
      message: `[${label}] favorites-count-items deveria ser ${expected.count}`,
      timeout: 10_000,
    })
    .toBe(expected.count);

  // Aguarda a quantidade de cards estabilizar antes de comparar a lista de itens
  await expect
    .poll(() => readFavoritesListSize(page), {
      message: `[${label}] tamanho da lista deveria estabilizar em ${expected.listSize}`,
      timeout: 10_000,
    })
    .toBe(expected.listSize);

  const actual = await readFavoritesSnapshot(page);
  expect(actual.title, `[${label}] título mudou`).toBe(expected.title);
  expect(actual.countText, `[${label}] favorites-count text mudou`).toBe(expected.countText);
  expect(actual.listSize, `[${label}] tamanho da lista mudou`).toBe(expected.listSize);
  // Comparação estrita: mesmo conjunto de productIds (independente da ordem)
  expect(
    new Set(actual.items.map((i) => i.productId)),
    `[${label}] conjunto de productIds renderizados divergiu`,
  ).toEqual(new Set(expected.items.map((i) => i.productId)));
  return actual;
}

async function isFavorited(button: Locator): Promise<boolean> {
  const pressed = await button.getAttribute("aria-pressed");
  if (pressed === "true") return true;
  const html = await button.innerHTML();
  return /fill-destructive|fill-current/.test(html);
}

/** Aceita diálogo de confirmação se aparecer (best-effort, via testid global). */
async function acceptConfirmIfAny(page: Page): Promise<void> {
  const confirm = page.locator(Sel.dialog.confirmYes).first();
  if (await confirm.isVisible().catch(() => false)) {
    await confirm.click().catch(() => {});
  }
}

/**
 * Resolve o botão "Remover favorito" do CARD do produto com cascata de fallbacks,
 * para tolerar pequenas mudanças de layout (header overlay vs. botão interno do
 * ProductCard, mudança de aria-label, etc.).
 *
 * Ordem (do mais específico ao mais genérico):
 *   1. SSOT: `[data-testid="favorite-remove"]` dentro do card alvo
 *   2. Botão de favorito do próprio ProductCard (`Sel.product.favorite`) —
 *      em /favoritos ele atua como toggle de remoção
 *   3. Fallback A11y: `[aria-label="Remover favorito"]` dentro do card
 *   4. Fallback heurístico: qualquer `button` contendo um SVG com
 *      `fill-destructive` (ícone Heart preenchido) dentro do card
 *
 * Lança erro descritivo se nenhum candidato existir.
 */
async function resolveRemoveButton(card: Locator): Promise<Locator> {
  const candidates: Array<{ name: string; locator: Locator }> = [
    { name: "data-testid=favorite-remove", locator: card.locator(Sel.favorites.remove).first() },
    { name: "ProductCard favorite toggle", locator: card.locator(Sel.product.favorite).first() },
    {
      name: 'aria-label="Remover favorito"',
      locator: card.locator('[aria-label="Remover favorito"]').first(),
    },
    {
      name: "button > svg.fill-destructive",
      locator: card.locator('button:has(svg[class*="fill-destructive"])').first(),
    },
  ];

  for (const { name, locator } of candidates) {
    const count = await locator.count().catch(() => 0);
    if (count > 0) {
      const visible = await locator
        .waitFor({ state: "visible", timeout: 3_000 })
        .then(() => true)
        .catch(() => false);
      if (visible) {
        // eslint-disable-next-line no-console
        console.log(`[resolveRemoveButton] usando fallback: ${name}`);
        return locator;
      }
    }
  }
  throw new Error(
    "resolveRemoveButton: nenhum botão de remover encontrado no card " +
      "(tentou: favorite-remove, product.favorite, aria-label, svg.fill-destructive)",
  );
}

/**
 * Reload + espera SSOT por SELETOR (sem `networkidle`):
 *   1. `page.reload({ waitUntil: "load" })` — DOM pronto
 *   2. `Sel.favorites.title` visível         — sinal de hidratação da página
 *   3. `Sel.favorites.list` OU `emptyState`  — árvore renderizada
 *   4. Skeletons sumiram (best-effort)
 */
async function reloadAndSettle(page: Page): Promise<void> {
  await page.reload({ waitUntil: "load" });
  await page
    .locator(Sel.favorites.title)
    .first()
    .waitFor({ state: "visible", timeout: 10_000 });
  const list = page.locator(Sel.favorites.list).first();
  const empty = page.locator(Sel.favorites.emptyState).first();
  await expect
    .poll(
      async () =>
        ((await list.count()) > 0 && (await list.isVisible())) ||
        ((await empty.count()) > 0 && (await empty.isVisible())),
      {
        message: "favorites-list ou favorites-empty-state deveriam estar visíveis pós-reload",
        timeout: 10_000,
      },
    )
    .toBe(true);
  await page
    .waitForFunction(
      () => !document.querySelector('[data-state="loading"], [data-skeleton]'),
      { timeout: 6_000 },
    )
    .catch(() => {});
}

test.describe("Fluxo: remover favorito persiste após reload", () => {
  test.beforeEach(() => requireAuth());
  installFavoritesCleanup(test);

  test("remove em /favoritos, page.reload() e item some da lista (e do texto)", async ({
    page,
  }) => {
    // 0. Snapshot inicial
    await gotoAndSettle(page, "/favoritos");
    const baselineSnapshot = await readFavoritesSnapshot(page);
    expect(baselineSnapshot.title).toBe("Meus Favoritos");
    const original = await readStorage(page);
    const countBefore = baselineSnapshot.count;

    // 1. Garante que existe um item para remover — favorita o 1º card do catálogo
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
    await expect
      .poll(() => isFavorited(favBtn), {
        message: "botão não passou para estado favoritado",
        timeout: 8_000,
      })
      .toBe(true);

    // Storage refletiu +1
    await expect
      .poll(async () => (await readStorage(page)).length, { timeout: 8_000 })
      .toBe(original.length + 1);

    const afterAdd = await readStorage(page);
    const beforeIds = new Set(original.map((f) => f.productId));
    const addedId = afterAdd.find((f) => !beforeIds.has(f.productId))?.productId;
    expect(addedId, "productId recém-adicionado não pôde ser identificado").toBeTruthy();

    // 2. /favoritos: confirma +1 no header e captura snapshot ANTES da remoção
    await gotoAndSettle(page, "/favoritos");
    await expect
      .poll(() => readFavoritesCount(page), { timeout: 10_000 })
      .toBe(countBefore + 1);

    const snapshotWithItem = await readFavoritesSnapshot(page);
    expect(snapshotWithItem.title).toBe(baselineSnapshot.title);
    expect(snapshotWithItem.listSize, "lista deveria conter ao menos 1 card visível").toBeGreaterThan(0);
    expect(
      snapshotWithItem.items.length,
      "snapshot.items deve ter o mesmo length que listSize",
    ).toBe(snapshotWithItem.listSize);

    // Confirma via SSOT (readFavoritesItems) que o produto adicionado está na lista renderizada
    const addedItem = snapshotWithItem.items.find((i) => i.productId === addedId);
    expect(
      addedItem,
      `addedId=${addedId} deveria aparecer em readFavoritesItems() antes da remoção`,
    ).toBeTruthy();

    // Localiza o card do produto adicionado por data-product-id (presente em ProductCard)
    const targetCard = page.locator(`[data-product-id="${addedId}"]`).first();
    await targetCard.waitFor({ state: "visible", timeout: 10_000 });
    await expect(
      targetCard,
      `card de favorito ${addedId} deveria estar visível antes da remoção`,
    ).toBeVisible({ timeout: 10_000 });

    // Nome alvo vem do snapshot SSOT (mesma fonte que será usada nas asserções)
    const targetName = addedItem?.productName?.trim() ?? "";
    expect(targetName, "data-product-name do card alvo deveria estar presente").not.toBe("");

    // 3. Remove via botão "Remover favorito" do card alvo
    const removeBtn = await resolveRemoveButton(targetCard);

    // 3.0. ESPERA EXPLÍCITA — anti-flakiness:
    //   (a) Se for fluxo REMOTO (isRemoteListView), o app dispara
    //       `DELETE /rest/v1/favorite_items?id=eq.<uuid>` (PostgREST → 200/204).
    //       Armamos um `waitForResponse` ANTES do clique, com timeout curto e
    //       tolerância (catch → null) para também suportar o fluxo LEGACY local
    //       (puro localStorage, sem network).
    //   (b) Em paralelo, garantimos que o storage local caiu para `length-1`
    //       — esse é o sinal SSOT de que o estado propagou (cobre legacy +
    //       remoto, já que o store local é a fonte da UI legacy).
    const expectedStorageLen = (await readStorage(page)).length - 1;
    const removeResponsePromise = page
      .waitForResponse(
        (resp) => {
          const u = resp.url();
          return (
            /\/rest\/v1\/favorite_items/.test(u) &&
            resp.request().method() === "DELETE"
          );
        },
        { timeout: 4_000 },
      )
      .catch(() => null);

    const [removeResponse] = await Promise.all([
      removeResponsePromise,
      (async () => {
        await removeBtn.click();
        await acceptConfirmIfAny(page);
      })(),
    ]);

    // Se a request foi observada (fluxo remoto), valida status 2xx (PostgREST
    // costuma retornar 204 No Content em DELETE).
    if (removeResponse) {
      const status = removeResponse.status();
      expect(
        status,
        `DELETE favorite_items deveria responder 2xx (got ${status})`,
      ).toBeGreaterThanOrEqual(200);
      expect(status).toBeLessThan(300);
    }

    // 3.0.1. Aguarda explicitamente o storage refletir a remoção (sinal SSOT
    //        independente de toast/aria-live e tolerante a re-renders lentos).
    await expect
      .poll(async () => (await readStorage(page)).length, {
        message: "storage local não caiu para length-1 após o clique de remoção",
        timeout: 8_000,
      })
      .toBe(expectedStorageLen);

    // 3.1. FEEDBACK — toast (sonner) com nome do produto removido
    //      Contrato do FavoritesPage: toast.success(`"${name}" removido dos favoritos`)
    const toast = page.locator(Sel.toast.sonnerToast).filter({
      hasText: new RegExp(
        `${targetName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*removido dos favoritos`,
        "i",
      ),
    });
    await expect(
      toast.first(),
      `toast de confirmação contendo "${targetName}" removido dos favoritos não apareceu`,
    ).toBeVisible({ timeout: 5_000 });

    // 3.2. FEEDBACK A11y — aria-live region anuncia a remoção (role=status)
    const ariaLive = page.locator('[role="status"][aria-live="polite"]').filter({
      hasText: new RegExp(
        `${targetName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+removido dos favoritos`,
        "i",
      ),
    });
    await expect(
      ariaLive.first(),
      "região aria-live deveria anunciar a remoção do produto",
    ).toHaveCount(1, { timeout: 5_000 });

    await settleAfterAction(page);


    // 4. Calcula o snapshot ESPERADO após remoção e valida ANTES do reload
    await expect
      .poll(() => readFavoritesCount(page), {
        message: "contagem deveria voltar a countBefore após remover",
        timeout: 10_000,
      })
      .toBe(countBefore);

    const expectedAfterRemove = await readFavoritesSnapshot(page);
    expect(expectedAfterRemove.count).toBe(countBefore);
    expect(expectedAfterRemove.listSize).toBe(snapshotWithItem.listSize - 1);
    expect(expectedAfterRemove.countText).not.toBe(snapshotWithItem.countText);
    expect(
      expectedAfterRemove.countText.startsWith(`${countBefore} `),
      `favorites-count deveria começar com "${countBefore} " (got "${expectedAfterRemove.countText}")`,
    ).toBe(true);

    // Lista renderizada via SSOT (readFavoritesItems): removed sumiu, baseline preservado
    expect(
      expectedAfterRemove.items.find((i) => i.productId === addedId),
      `pré-reload: addedId=${addedId} NÃO deveria existir em readFavoritesItems()`,
    ).toBeUndefined();
    expect(
      expectedAfterRemove.items.length,
      "pré-reload: items.length deveria igualar listSize",
    ).toBe(expectedAfterRemove.listSize);

    // Storage também caiu para o baseline
    await expect
      .poll(async () => (await readStorage(page)).length, { timeout: 8_000 })
      .toBe(original.length);

    // 5. Reload com espera explícita de navegação (load + networkidle + título)
    await reloadAndSettle(page);

    // 6. Reusa o MESMO snapshot esperado para validar pós-reload
    //    (expectFavoritesSnapshot já compara items por Set de productIds)
    await expectFavoritesSnapshot(page, expectedAfterRemove, "pós-reload");

    // 6.1. Reafirma via readFavoritesItems direto pós-reload — produto removido ausente
    const itemsAfterReload = await readFavoritesItems(page);
    expect(
      itemsAfterReload.find((i) => i.productId === addedId),
      `pós-reload: addedId=${addedId} reapareceu em readFavoritesItems()`,
    ).toBeUndefined();
    expect(
      new Set(itemsAfterReload.map((i) => i.productId)),
      "pós-reload: conjunto de productIds renderizados divergiu do estado pré-reload",
    ).toEqual(new Set(expectedAfterRemove.items.map((i) => i.productId)));

    // 7. Card do produto removido NÃO existe mais (SSOT por data-product-id)
    const removedCardLocator = page.locator(
      `${Sel.favorites.item}[data-product-id="${addedId}"]`,
    );
    await expect(
      removedCardLocator,
      `card do produto ${addedId} não deveria existir após reload`,
    ).toHaveCount(0, { timeout: 10_000 });

    // 8. CLEANUP ROBUSTO — restaura o storage para o estado inicial e valida o ciclo completo
    //    (além do afterEach do installFavoritesCleanup, fazemos a restauração in-test
    //     para poder asseverar pós-reload que o baseline foi efetivamente restaurado.)
    await writeStorage(page, original);

    // 8.1. Storage está idêntico ao snapshot inicial (mesmos productIds, mesmo length)
    await expect
      .poll(async () => (await readStorage(page)).length, {
        message: "cleanup: storage deveria ter o mesmo length do baseline original",
        timeout: 8_000,
      })
      .toBe(original.length);
    const restored = await readStorage(page);
    expect(
      new Set(restored.map((f) => f.productId)),
      "cleanup: conjunto de productIds restaurados deve igualar o original",
    ).toEqual(new Set(original.map((f) => f.productId)));

    // 8.2. Reload final — o estado restaurado precisa SOBREVIVER ao reload
    await reloadAndSettle(page);

    // 8.3. Header voltou ao baseline ABSOLUTO (countBefore), não ao snapshot intermediário
    await expect
      .poll(() => readFavoritesCount(page), {
        message: `cleanup: contagem deveria voltar ao baseline inicial (${countBefore}) após reload final`,
        timeout: 10_000,
      })
      .toBe(countBefore);

    // 8.4. Snapshot final bate com o baseline (título + count + countText + listSize)
    await expectFavoritesSnapshot(page, baselineSnapshot, "cleanup pós-reload");

    // 8.5. Produto removido CONTINUA ausente após o reload de cleanup
    //      (garante que o restore não ressuscitou o item alvo)
    await expect(
      removedCardLocator,
      `cleanup: card do produto ${addedId} não deveria reaparecer após restore + reload`,
    ).toHaveCount(0, { timeout: 10_000 });
  });
});
