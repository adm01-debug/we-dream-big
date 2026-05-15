import { test, expect } from "@playwright/test";

test.describe("Módulo Orçamentos - Resiliência e AutoSave", () => {
  const STORAGE_KEY = "quote_builder_autosave";

  test("Deve restaurar itens, campos e valores numéricos após refresh da página", async ({ page }) => {
    await page.goto("/orcamentos/novo");
    
    // 1. Preenche Empresa (dispara AutoSave)
    const companyInput = page.locator('input[placeholder*="Buscar empresa"]');
    await companyInput.fill("Cliente Playwright");
    await page.keyboard.press("Enter");
    
    // 2. Adiciona um produto com valor específico para validar cálculos
    await page.click('button:has-text("Produto")');
    const firstProductAdd = page.locator('button:has-text("Adicionar")').first();
    await firstProductAdd.click();

    // 3. Ajusta Markup (para garantir que valores numéricos complexos sejam salvos)
    const markupInput = page.locator('input[name="markup"], [aria-label="Markup"]').first();
    if (await markupInput.isVisible()) {
      await markupInput.fill("15");
      await page.keyboard.press("Tab");
    }
    
    // Aguarda o debounce do AutoSave (2000ms + margem)
    await page.waitForTimeout(3000);
    
    // 4. Captura valores antes do refresh
    const subtotalBefore = await page.locator('text=Subtotal:').locator('xpath=following-sibling::*').first().innerText();
    const totalBefore = await page.locator('text=Total:').locator('xpath=following-sibling::*').first().innerText();
    
    // 5. Força Refresh
    await page.reload();
    
    // 6. Confirma restauração
    await expect(page.locator("text=restaurado")).toBeVisible();
    
    const itemsCount = page.locator("text=1 item(ns) adicionado(s)");
    await expect(itemsCount).toBeVisible();

    // 7. Validação de Valores Numéricos Exatos
    const subtotalAfter = await page.locator('text=Subtotal:').locator('xpath=following-sibling::*').first().innerText();
    const totalAfter = await page.locator('text=Total:').locator('xpath=following-sibling::*').first().innerText();
    
    expect(subtotalAfter).toBe(subtotalBefore);
    expect(totalAfter).toBe(totalBefore);
    expect(totalAfter).not.toContain("R$ 0,00");
  });

  test("Stepper deve refletir o progresso corretamente", async ({ page }) => {
    await page.goto("/orcamentos/novo");
    
    // Passo inicial: Cliente (Active)
    const clientStep = page.locator('text=Cliente');
    await expect(clientStep).toHaveClass(/text-primary/);
    
    // Preenche cliente para avançar
    await page.locator('input[placeholder*="Buscar empresa"]').fill("Teste Stepper");
    await page.keyboard.press("Enter");
    
    // Passo 2: Itens deve se tornar ativo
    const itemsStep = page.locator('text=Itens');
    await expect(itemsStep).toHaveClass(/text-primary/);
    
    // O conector entre Cliente e Itens deve estar colorido (bg-primary)
    // Buscamos o div do conector após o passo Cliente
    const connector = page.locator('[data-testid="quote-wizard"] .bg-primary').first();
    await expect(connector).toBeVisible();
  });
});
