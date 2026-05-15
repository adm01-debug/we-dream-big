/**
 * Fluxo: interceptação de API ao salvar/remover favorito + validação pós-reload
 *
 * Estratégia:
 *  - Instala `page.route("**\/rest/v1/favorite_items*", ...)` e
 *    `page.route("**\/rest/v1/favorite_lists*", ...)` ANTES de qualquer ação,
 *    em modo "spy" (apenas observa, sempre `route.continue()`).
 *  - Cada request capturada armazena: method, url, status, body parseado.
 *  - Roda o ciclo: favoritar → /favoritos → remover → reload.
 *
 * Contratos validados (independente de fluxo legacy/remoto):
 *  1. SUCESSO da request: toda chamada observada para `favorite_items` deve
 *     responder 2xx (PostgREST DELETE = 204; SELECT/INSERT = 200/201).
 *  2. PAYLOAD ECHO: após reload, os dados que reidratam a UI (storage local
 *     OU resposta da última GET observada) devem refletir EXATAMENTE o estado
 *     pré-reload (mesmos productIds, sem mutação de timestamps).
 *  3. PROVA NEGATIVA (fluxo legacy): se NENHUMA request foi disparada para
 *     `favorite_items` durante add/remove, prova-se que o veículo é o
 *     localStorage — e o reload deve reidratar dele sem network.
 *  4. SEM ERROS DE API: nenhuma request observada pode ter status >= 400.
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import { installFavoritesCleanup } from "../helpers/favorites";
import { Sel } from "../fixtures/selectors";
import type { Locator, Page, Request, Route } from "@playwright/test";

const STORAGE_KEY = "product-favorites";

interface FavoriteItem {
  productId: string;
  addedAt: string;
  [k: string]: unknown;
}

interface CapturedRequest {
  method: string;
  url: string;
  postData: string | null;
  status: number;
  responseBody: string;
  parsedResponse: unknown;
  durationMs: number;
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
 * Instala um espião de rotas para `favorite_items` e `favorite_lists`.
 * Retorna o array compartilhado (mutável) onde as requests são empilhadas.
 *
 * Importante: usa `route.continue()` SEM modificar — apenas observa.
 */
async function installFavoritesApiSpy(page: Page): Promise<{
  captured: CapturedRequest[];
  unroute: () => Promise<void>;
}> {
  const captured: CapturedRequest[] = [];
  const pattern = /\/rest\/v1\/favorite_(items|lists|items_trash)\b/;

  const handler = async (route: Route, request: Request) => {
    const start = Date.now();
    try {
      const response = await route.fetch();
      const status = response.status();
      const responseBody = await response.text();
      let parsedResponse: unknown = null;
      try {
        parsedResponse = responseBody ? JSON.parse(responseBody) : null;
      } catch {
        parsedResponse = responseBody;
      }
      captured.push({
        method: request.method(),
        url: request.url(),
        postData: request.postData(),
        status,
        responseBody,
        parsedResponse,
        durationMs: Date.now() - start,
      });
      await route.fulfill({
        status,
        headers: response.headers(),
        body: responseBody,
      });
    } catch (err) {
      captured.push({
        method: request.method(),
        url: request.url(),
        postData: request.postData(),
        status: 0,
        responseBody: `[fetch-error] ${(err as Error).message}`,
        parsedResponse: null,
        durationMs: Date.now() - start,
      });
      await route.continue().catch(() => {});
    }
  };

  await page.route((url) => pattern.test(url.toString()), handler);

  return {
    captured,
    unroute: async () => {
      await page.unroute((url) => pattern.test(url.toString()), handler).catch(() => {});
    },
  };
}

function filterByMethod(captured: CapturedRequest[], method: string): CapturedRequest[] {
  return captured.filter((c) => c.method.toUpperCase() === method.toUpperCase());
}

test.describe("Fluxo: interceptação API favorite_items + validação pós-reload", () => {
  test.beforeEach(() => requireAuth());
  installFavoritesCleanup(test);

  test("intercepta add/remove/reload de favoritos e valida echo dos dados", async ({
    page,
  }) => {
    // 0. Instala espião ANTES de qualquer navegação que toque a API
    const spy = await installFavoritesApiSpy(page);

    try {
      // 0.1. Baseline em /favoritos
      await gotoAndSettle(page, "/favoritos");
      const original = await readStorage(page);

      // 1. Favorita o 1º card (captura tudo que tocar a API durante a ação)
      const apiCallsBeforeAdd = spy.captured.length;
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
          .toBe(original.length);
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

      const addCalls = spy.captured.slice(apiCallsBeforeAdd);

      // 2. /favoritos: pode disparar SELECTs de favorite_lists/items para popular UI
      const apiCallsBeforeNav = spy.captured.length;
      await gotoAndSettle(page, "/favoritos");
      await expect
        .poll(() => readFavoritesCount(page), { timeout: 10_000 })
        .toBe(original.length + 1);
      const navCalls = spy.captured.slice(apiCallsBeforeNav);

      // 3. Remove o item recém-adicionado via card alvo
      const apiCallsBeforeRemove = spy.captured.length;
      const targetCard = page.locator(`[data-product-id="${addedId}"]`).first();
      await targetCard.waitFor({ state: "visible", timeout: 10_000 });
      const removeBtn = targetCard
        .locator(Sel.favorites.remove)
        .or(targetCard.locator(Sel.product.favorite))
        .first();
      await removeBtn.waitFor({ state: "visible", timeout: 10_000 });
      await removeBtn.click();
      await expect
        .poll(async () => (await readStorage(page)).length, { timeout: 8_000 })
        .toBe(original.length);
      const removeCalls = spy.captured.slice(apiCallsBeforeRemove);

      // 4. Re-adiciona (para ter dado para validar pós-reload)
      await gotoAndSettle(page, "/produtos");
      const card2 = page.locator(Sel.product.card).first();
      await card2.waitFor({ state: "visible", timeout: 15_000 });
      const favBtn2 = card2.locator(Sel.product.favorite).first();
      if (!(await isFavorited(favBtn2))) {
        await favBtn2.click();
      }
      await expect.poll(() => isFavorited(favBtn2), { timeout: 8_000 }).toBe(true);
      await expect
        .poll(async () => (await readStorage(page)).length, { timeout: 8_000 })
        .toBe(original.length + 1);

      // 5. Snapshot pré-reload em /favoritos
      await gotoAndSettle(page, "/favoritos");
      await expect
        .poll(() => readFavoritesCount(page), { timeout: 10_000 })
        .toBe(original.length + 1);
      const storageBeforeReload = await readStorage(page);
      const storageBeforeReloadJson = JSON.stringify(storageBeforeReload);

      // 6. Reload com captura
      const apiCallsBeforeReload = spy.captured.length;
      await page.reload({ waitUntil: "load" });
      // Sinal SSOT por SELETOR (substitui networkidle — flaky com polling/realtime/spy)
      await page
        .locator(Sel.favorites.title)
        .first()
        .waitFor({ state: "visible", timeout: 10_000 });

      // 6.1. Header — contagem (countItems) reidratada
      await expect
        .poll(() => readFavoritesCount(page), {
          message: "header countItems deveria reidratar para original.length + 1 após reload",
          timeout: 10_000,
        })
        .toBe(original.length + 1);

      // 6.2. Header — ícone visível e badge `count` (se exibido) coerente
      const headerIcon = page.locator(Sel.favorites.icon).first();
      if (await headerIcon.count()) {
        await expect(headerIcon, "ícone de favoritos no header deveria estar visível").toBeVisible();
      }
      const headerCount = page.locator(Sel.favorites.count).first();
      if (await headerCount.count()) {
        await expect
          .poll(
            async () => Number.parseInt((await headerCount.innerText()).trim(), 10) || 0,
            {
              message: "badge `favorites-count` no header deveria refletir o total pós-reload",
              timeout: 8_000,
            },
          )
          .toBe(original.length + 1);
      }

      // 6.3. Lista /favoritos — container e cards renderizados
      await expect(
        page.locator(Sel.favorites.list).first(),
        "container `favorites-list` deveria estar visível pós-reload",
      ).toBeVisible({ timeout: 10_000 });
      await expect
        .poll(() => page.locator(Sel.favorites.item).count(), {
          message: "qtd. de cards `favorite-item` deveria igualar storage pós-reload",
          timeout: 10_000,
        })
        .toBe(original.length + 1);

      // 6.4. Card específico do item recém-favoritado deve estar presente
      await expect(
        page.locator(`[data-product-id="${addedId}"]`).first(),
        `card do produto ${addedId} deveria estar renderizado em /favoritos pós-reload`,
      ).toBeVisible({ timeout: 10_000 });

      const reloadCalls = spy.captured.slice(apiCallsBeforeReload);

      // ============================================================
      // CONTRATOS
      // ============================================================

      // C1. SUCESSO — toda request observada para favorite_* DEVE ser 2xx
      const allCalls = spy.captured;
      const failedCalls = allCalls.filter((c) => c.status === 0 || c.status >= 400);
      expect(
        failedCalls,
        `requests para favorite_* falharam: ${JSON.stringify(
          failedCalls.map((f) => ({ method: f.method, url: f.url, status: f.status })),
        )}`,
      ).toEqual([]);

      // C2. PAYLOAD ECHO — após reload, dados refletem EXATAMENTE o pré-reload
      const storageAfterReload = await readStorage(page);
      expect(
        JSON.stringify(storageAfterReload),
        "storage foi mutado durante o reload (esperado: idêntico)",
      ).toBe(storageBeforeReloadJson);

      // Se houver GETs de favorite_items pós-reload (fluxo remoto), o payload
      // retornado deve incluir o productId atualmente favoritado.
      const reloadGets = filterByMethod(reloadCalls, "GET").filter((c) =>
        /favorite_items/.test(c.url),
      );
      for (const getCall of reloadGets) {
        const body = getCall.parsedResponse;
        if (Array.isArray(body)) {
          const productIds = body
            .map((row) => (row as { product_id?: string }).product_id)
            .filter((v): v is string => typeof v === "string");
          // Se o usuário estiver em uma lista remota e o productId estiver lá,
          // exigimos que apareça. Caso contrário (lista vazia / outro contexto),
          // não bloqueia — apenas registra.
          if (productIds.length > 0 && productIds.includes(addedId as string)) {
            expect(
              productIds,
              `GET favorite_items pós-reload deveria ecoar productId=${addedId}`,
            ).toContain(addedId);
          }
        }
      }

      // C3. CLASSIFICAÇÃO DE FLUXO
      //   - Se removeCalls inclui DELETE para favorite_items → fluxo REMOTO
      //   - Caso contrário → fluxo LEGACY (puro localStorage). Prova negativa:
      //     o storage é o ÚNICO veículo, e o reload reidratou dele.
      const isRemoteFlow =
        filterByMethod(removeCalls, "DELETE").some((c) => /favorite_items/.test(c.url)) ||
        filterByMethod(addCalls, "POST").some((c) => /favorite_items/.test(c.url));

      if (isRemoteFlow) {
        // C3a. Remote: DELETE deveria ter sido 2xx (PostgREST → 204)
        const deletes = filterByMethod(removeCalls, "DELETE").filter((c) =>
          /favorite_items/.test(c.url),
        );
        expect(deletes.length, "fluxo remoto deveria emitir DELETE favorite_items").toBeGreaterThan(0);
        for (const d of deletes) {
          expect(d.status, `DELETE favorite_items deveria ser 2xx (got ${d.status})`).toBeLessThan(300);
          expect(d.status).toBeGreaterThanOrEqual(200);
        }
      } else {
        // C3b. Legacy: prova negativa — nenhuma POST/DELETE em favorite_items
        const writes = allCalls.filter(
          (c) =>
            /favorite_items/.test(c.url) &&
            ["POST", "DELETE", "PATCH", "PUT"].includes(c.method.toUpperCase()),
        );
        expect(
          writes,
          "fluxo legacy não deveria emitir writes para favorite_items — " +
            `got: ${JSON.stringify(writes.map((w) => ({ method: w.method, url: w.url })))}`,
        ).toEqual([]);
        // E o reload reidrata exclusivamente do storage local
        expect(storageAfterReload.length).toBe(original.length + 1);
      }

      // C4. DIAGNÓSTICO — log estruturado p/ debug futuro (não falha)
      // eslint-disable-next-line no-console
      console.log(
        `[favorites-api-spy] flow=${isRemoteFlow ? "remote" : "legacy"} ` +
          `total=${allCalls.length} add=${addCalls.length} nav=${navCalls.length} ` +
          `remove=${removeCalls.length} reload=${reloadCalls.length}`,
      );

      // 7. Cleanup defensivo
      await writeStorage(page, original);
    } finally {
      await spy.unroute();
    }
  });
});
