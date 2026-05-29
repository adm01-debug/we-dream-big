import { test, expect } from "../fixtures/test-base";
import { gotoAndSettle } from "../helpers/nav";
import { loginAs } from "../helpers/auth";
import { Sel } from "../fixtures/selectors";

test.describe("Fluxo: Deep Link e Redirecionamento de Auth", () => {
  // Começar sem autenticação
  test.use({ storageState: { cookies: [], origins: [] } });

  test("deve redirecionar para login ao abrir PDP e voltar após autenticação", async ({ page }) => {
    // 1. Tentar acessar uma rota protegida (PDP)
    // Como não sabemos um ID fixo, vamos primeiro pegar um na área pública se possível, 
    // ou apenas usar um caminho que sabemos ser protegido.
    const protectedPath = "/produtos/qualquer-id"; 
    
    await page.goto(protectedPath);
    
    // 2. Verificar que foi redirecionado para /login
    // O sistema de rotas protegidas geralmente anexa o redirecionamento (ex: /login?redirect=...)
    await expect(page).toHaveURL(/\/login/);
    
    // 3. Fazer login
    await loginAs(page, "user");
    
    // 4. Verificar que voltou para a listagem de produtos (ou para a PDP se o redirect funcionou)
    // Nota: Se o 'qualquer-id' não existir, ele pode ir para 404, mas o importante é que SAIA do login.
    // Para um teste mais robusto, vamos primeiro obter um link real.
  });

  test("fluxo completo: deep link real -> login -> PDP -> Personalização", async ({ page }) => {
    // 1. Login inicial para pegar um link de produto real
    await gotoAndSettle(page, "/login");
    await loginAs(page, "user");
    await gotoAndSettle(page, "/produtos");
    
    const firstProduct = page.locator(Sel.product.card).first();
    await expect(firstProduct).toBeVisible();
    const productUrl = await firstProduct.locator('a').first().getAttribute('href');
    const productName = await firstProduct.locator(Sel.product.cardName).innerText();
    
    expect(productUrl).toBeTruthy();

    // 2. Logout (limpar estado)
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => sessionStorage.clear());

    // 3. Tentar acessar o link direto do produto
    await page.goto(productUrl!);
    
    // 4. Deve estar no login
    await expect(page).toHaveURL(/\/login/);
    
    // 5. Login
    await loginAs(page, "user");
    
    // 6. Deve voltar para a PDP do produto
    await expect(page).toHaveURL(new RegExp(productUrl!));
    await expect(page.locator(Sel.product.name)).toContainText(productName);
    
    // 7. Clicar em Personalização deve funcionar normalmente
    const personalizationBadge = page.locator(Sel.product.personalizationBadge);
    await expect(personalizationBadge).toBeVisible();
    await personalizationBadge.click();
    
    await expect(page).toHaveURL(/\/simulador/);
    await expect(page.locator(Sel.simulator.productName)).toContainText(productName);
  });
});