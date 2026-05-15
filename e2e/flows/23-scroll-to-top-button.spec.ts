/**
 * Fluxo: Botão "voltar ao topo" (ScrollToTopButton) nos módulos principais.
 *
 * Para cada rota relevante:
 *  1. Garante que a página tem altura suficiente para rolar (injeta spacer
 *     se necessário) e força `window.scrollTo(0, 1500)`.
 *  2. Confirma que o botão flutuante `[data-testid="scroll-to-top"]` aparece
 *     (ele só renderiza quando `window.scrollY > threshold`, default 150).
 *  3. Clica no botão.
 *  4. Verifica que `window.scrollY` retorna a ~0 (suave, então usa polling).
 *  5. Verifica que o botão desaparece após o retorno ao topo.
 *
 * Cobre os módulos principais autenticados — não usa o catálogo completo
 * porque o objetivo é a feature do botão, não cobertura exaustiva de rotas
 * (essa fica em `flows/22-header-sticky.spec.ts`).
 */
import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle, waitForRouteIdle } from "../helpers/nav";
import { waitForTestIdVisible, pollUntil } from "../helpers/waits";
import { Sel } from "../fixtures/selectors";

/** Tolerância em px para o "topo" — animação smooth pode parar em y∈[0,2]. */
const TOP_TOLERANCE_PX = 4;

/** Módulos principais cobertos. */
const MAIN_MODULES = [
  "/dashboard",
  "/produtos",
  "/orcamentos",
  "/colecoes",
  "/favoritos",
  "/kits",
] as const;

test.describe("ScrollToTopButton — módulos principais", () => {
  test.describe.configure({ mode: "parallel" });
  test.beforeEach(() => requireAuth());

  for (const route of MAIN_MODULES) {
    test(`botão volta ao topo em ${route}`, async ({ page }) => {
      await gotoAndSettle(page, route);

      test.skip(
        /\/login(\?|$)/.test(page.url()),
        `Rota ${route} redirecionou para /login (role insuficiente).`,
      );

      await waitForRouteIdle(page);
      await waitForTestIdVisible(page, "app-header");

      // Desabilita scroll suave para tornar o teste determinístico
      // (evita flake por animação ainda em curso ao medir scrollY).
      await page.addStyleTag({
        content: `html { scroll-behavior: auto !important; }`,
      });

      // Garante altura para rolar (algumas rotas têm pouco conteúdo).
      await page.evaluate(() => {
        if (document.body.scrollHeight < window.innerHeight + 2000) {
          const spacer = document.createElement("div");
          spacer.style.height = "2400px";
          spacer.setAttribute("data-e2e-spacer", "");
          document.body.appendChild(spacer);
        }
        window.scrollTo(0, 0);
      });

      // Estado inicial: botão NÃO visível (scrollY = 0).
      await expect(
        page.locator(Sel.app.layout.scrollToTop),
        `Botão scroll-to-top não deveria estar visível em ${route} antes do scroll`,
      ).toHaveCount(0);

      // Rola para baixo (acima do threshold de 150px).
      await page.evaluate(() => window.scrollTo(0, 1500));
      await page.waitForFunction(() => window.scrollY > 1000, { timeout: 3000 });

      // Botão aparece após scroll.
      await waitForTestIdVisible(page, "scroll-to-top");
      const button = page.locator(Sel.app.layout.scrollToTop);
      await expect(button).toBeVisible();

      // Clica para voltar ao topo.
      await button.click();

      // Aguarda o scroll completar (smooth desabilitado → praticamente instantâneo,
      // mas usamos polling defensivo para o caso de o teste rodar com outra config).
      await pollUntil(
        async () => {
          const y = await page.evaluate(() => window.scrollY);
          return y <= TOP_TOLERANCE_PX;
        },
        {
          timeoutMs: 3000,
          intervalMs: 100,
          message: `window.scrollY não retornou a ~0 após clicar em scroll-to-top em ${route}`,
        },
      );

      const finalY = await page.evaluate(() => window.scrollY);
      expect(
        finalY,
        `Esperado window.scrollY ≈ 0 após clique em ${route} (recebido ${finalY})`,
      ).toBeLessThanOrEqual(TOP_TOLERANCE_PX);

      // Botão desaparece ao voltar ao topo (scrollY < threshold).
      await expect(
        page.locator(Sel.app.layout.scrollToTop),
        `Botão deveria desaparecer após voltar ao topo em ${route}`,
      ).toHaveCount(0, { timeout: 2000 });
    });
  }

  /**
   * Acessibilidade por teclado: o botão DEVE ser ativável com Enter e Espaço
   * (comportamento nativo do <button>) e, após o clique, o foco DEVE migrar
   * para `#main-content` — caso contrário usuários de teclado/leitor de tela
   * ficariam órfãos (o botão desaparece ao chegar no topo).
   */
  for (const key of ["Enter", "Space"] as const) {
    test(`ativável por teclado (${key}) e foco migra para #main-content`, async ({
      page,
    }) => {
      await gotoAndSettle(page, "/dashboard");
      test.skip(
        /\/login(\?|$)/.test(page.url()),
        "Dashboard redirecionou para /login.",
      );
      await waitForRouteIdle(page);
      await waitForTestIdVisible(page, "app-header");

      // Determinístico: scroll instantâneo + foca alvo imediatamente.
      await page.addStyleTag({
        content: `html { scroll-behavior: auto !important; }
                  *, *::before, *::after { transition-duration: 0s !important; animation-duration: 0s !important; }`,
      });
      await page.emulateMedia({ reducedMotion: "reduce" });

      await page.evaluate(() => {
        if (document.body.scrollHeight < window.innerHeight + 2000) {
          const spacer = document.createElement("div");
          spacer.style.height = "2400px";
          spacer.setAttribute("data-e2e-spacer", "");
          document.body.appendChild(spacer);
        }
        window.scrollTo(0, 1500);
      });
      await page.waitForFunction(() => window.scrollY > 1000, { timeout: 3000 });

      await waitForTestIdVisible(page, "scroll-to-top");
      const button = page.locator(Sel.app.layout.scrollToTop);

      // Foca via API e valida atributos de a11y.
      await button.focus();
      await expect(button).toBeFocused();
      await expect(button).toHaveAttribute("aria-label", /voltar ao topo/i);

      // Aciona via teclado.
      await page.keyboard.press(key);

      // Scroll volta a 0 e foco migra para o main.
      await pollUntil(
        async () => (await page.evaluate(() => window.scrollY)) <= TOP_TOLERANCE_PX,
        { timeoutMs: 3000, intervalMs: 50, message: "scrollY não voltou a 0" },
      );

      const focusedId = await page.evaluate(
        () => document.activeElement?.id ?? null,
      );
      expect(
        focusedId,
        `Foco deveria migrar para #main-content após ${key} (recebido id="${focusedId}")`,
      ).toBe("main-content");
    });
  }

  /**
   * Acessibilidade — anúncio aria-live: ao acionar o botão, uma região
   * `aria-live="polite"` (montada globalmente pelo `AriaLiveProvider`) DEVE
   * receber uma mensagem confirmando a mudança de contexto. Sem isso,
   * usuários de leitor de tela não percebem que o foco saltou para o topo.
   *
   * Não dependemos de testid: o contrato real consumido por AT é o atributo
   * `aria-live` no DOM, então buscamos por seletor de atributo.
   */
  test("anuncia mudança de contexto via aria-live ao acionar", async ({ page }) => {
    await gotoAndSettle(page, "/dashboard");
    test.skip(
      /\/login(\?|$)/.test(page.url()),
      "Dashboard redirecionou para /login.",
    );
    await waitForRouteIdle(page);
    await waitForTestIdVisible(page, "app-header");

    // Determinístico: reduced-motion → anúncio "fim" sai imediatamente.
    await page.addStyleTag({
      content: `html { scroll-behavior: auto !important; }`,
    });
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.evaluate(() => {
      if (document.body.scrollHeight < window.innerHeight + 2000) {
        const spacer = document.createElement("div");
        spacer.style.height = "2400px";
        spacer.setAttribute("data-e2e-spacer", "");
        document.body.appendChild(spacer);
      }
      window.scrollTo(0, 1500);
    });
    await page.waitForFunction(() => window.scrollY > 1000, { timeout: 3000 });

    await waitForTestIdVisible(page, "scroll-to-top");
    const button = page.locator(Sel.app.layout.scrollToTop);

    // Sanity: regiões aria-live existem no DOM antes do clique.
    const liveRegionsBefore = await page
      .locator('[aria-live="polite"]')
      .count();
    expect(
      liveRegionsBefore,
      "AriaLiveProvider deveria montar ao menos uma região [aria-live=polite] global",
    ).toBeGreaterThan(0);

    await button.click();

    // Aguarda alguma região aria-live conter a mensagem esperada.
    await pollUntil(
      async () => {
        const texts = await page
          .locator('[aria-live="polite"]')
          .allTextContents();
        return texts.some((t) =>
          /voltando ao topo|topo da página/i.test(t.trim()),
        );
      },
      {
        timeoutMs: 3000,
        intervalMs: 80,
        message:
          "Nenhuma região [aria-live=polite] anunciou 'voltando ao topo' / 'topo da página' após clique",
      },
    );
  });
});
