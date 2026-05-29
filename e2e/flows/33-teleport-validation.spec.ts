import { test, expect, requireAuth } from "../fixtures/test-base";
import { gotoAndSettle, expectOnRoute } from "../helpers/nav";
import { Sel } from "../fixtures/selectors";

test.describe("Funcionalidade: Teletransporte (Smart Back Button)", () => {
  test.beforeEach(() => requireAuth());

  test("deve 'teletransportar' para a página anterior exata no histórico", async ({ page }) => {
    // 1. Início -> Produtos
    await gotoAndSettle(page, "/produtos");
    await expectOnRoute(page, "/produtos");

    // 2. Produtos -> Favoritos
    await gotoAndSettle(page, "/favoritos");
    await expectOnRoute(page, "/favoritos");

    // 3. Clica no Teletransporte
    const teleportBtn = page.locator(Sel.app.layout.teleport);
    await expect(teleportBtn).toBeVisible();
    
    // Validar ícone Zap (portal)
    const icon = teleportBtn.locator('svg');
    await expect(icon).toHaveClass(/text-sky-400/);

    await teleportBtn.click();

    // 4. Deve estar de volta em Produtos (e não na Home)
    await expectOnRoute(page, "/produtos");
  });

  test("deve cair na Home se o histórico for raso (fallback seguro)", async ({ page }) => {
    // Entra direto em uma rota profunda
    await gotoAndSettle(page, "/simulador");
    await expectOnRoute(page, "/simulador");

    const teleportBtn = page.locator(Sel.app.layout.teleport);
    await expect(teleportBtn).toBeVisible();
    
    await teleportBtn.click();

    // Como não há página anterior real (entrada direta), deve ir para a Home
    await expectOnRoute(page, "/");
  });

  test("deve validar o tooltip explicativo", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    
    const teleportBtn = page.locator(Sel.app.layout.teleport);
    await expect(teleportBtn).toBeVisible();
    
    // Hover para disparar tooltip
    await teleportBtn.hover();
    
    const tooltip = page.locator(Sel.app.layout.teleportTooltip);
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("Retorna para a página anterior");
    await expect(tooltip).toContainText("Teletransporte");
  });

  test("deve validar analytics do Teletransporte", async ({ page }) => {
    await gotoAndSettle(page, "/produtos");
    await gotoAndSettle(page, "/favoritos");

    const teleportBtn = page.locator(Sel.app.layout.teleport);
    
    // Intercepta a chamada de analytics
    const [request] = await Promise.all([
      page.waitForRequest(req => req.url().includes('navigation_analytics')),
      teleportBtn.click(),
    ]);

    const body = JSON.parse(request.postData() || '{}');
    expect(body).toMatchObject({
      button_name: 'Teletransporte',
      source_path: '/favoritos',
      destination_path: 'previous_page'
    });
  });

  test("deve funcionar em todos os módulos (exaustivo)", async ({ page }) => {
    const modules = [
      { path: "/produtos", slug: "produtos" },
      { path: "/favoritos", slug: "favoritos" },
      { path: "/orcamentos", slug: "orcamentos" },
      { path: "/simulador", slug: "simulador" }
    ];

    for (const mod of modules) {
      await gotoAndSettle(page, "/dashboard");
      await gotoAndSettle(page, mod.path);
      await expectOnRoute(page, mod.path);

      const teleportBtn = page.locator(Sel.app.layout.teleport);
      await expect(teleportBtn, `Botão não visível em ${mod.path}`).toBeVisible();
      
      await teleportBtn.click();
      await expectOnRoute(page, "/dashboard");
    }
  });

  test("comportamento mobile (@mobile)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    
    await gotoAndSettle(page, "/produtos");
    await gotoAndSettle(page, "/favoritos");

    const teleportBtn = page.locator(Sel.app.layout.teleport);
    await expect(teleportBtn).toBeVisible();
    
    // No mobile, validamos que o texto está presente e o botão é clicável
    await expect(teleportBtn).toContainText("Teletransporte");
    await teleportBtn.tap().catch(() => teleportBtn.click());
    
    await expectOnRoute(page, "/produtos");
  });
});
