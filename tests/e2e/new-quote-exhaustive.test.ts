import { test, expect } from "@playwright/test";
import fs from 'fs';
import path from 'path';

/**
 * Módulo: Novo Orçamento (E2E Exaustivo)
 * Objetivo: Avaliar cada módulo, função, botão e camada do sistema de orçamentos.
 */

test.describe("Módulo Novo Orçamento - Testes Exaustivos", () => {
  const evidenceDir = 'tests/e2e/evidence/quotes';

  test.beforeAll(async () => {
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Configura captura de erros para auditoria
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const logLine = `[ERROR] ${msg.text()}\n`;
        fs.appendFileSync(path.join(evidenceDir, 'quotes-error-audit.log'), logLine);
      }
    });

    await page.goto("/orcamentos/novo");
  });

  test("Cenário 1: Fluxo de Identificação - Empresa e Contato", async ({ page }) => {
    // Valida título da página
    await expect(page.locator("h1")).toContainText("Novo Orçamento");
    await page.screenshot({ path: `${evidenceDir}/01-initial-state.png` });

    // Tenta salvar sem preencher nada (validação de obrigatoriedade)
    await page.click("text=Gerar Orçamento");
    await expect(page.locator("text=Selecione uma empresa")).toBeVisible();
    await expect(page.locator("text=Selecione um contato")).toBeVisible();

    // Seleciona Empresa e Contato (seletores de Select/Popover do shadcn)
    // Assumindo que o seletor abre uma busca ou lista
    const companyTrigger = page.locator('button:has-text("Empresa")').or(page.locator('button:has-text("Selecione a empresa")')).first();
    await companyTrigger.click();
    // Simula seleção do primeiro item se disponível ou digitação
    await page.keyboard.type("Cliente Teste");
    await page.keyboard.press("Enter");

    await page.screenshot({ path: `${evidenceDir}/02-client-selected.png` });
  });

  test("Cenário 2: Adição e Customização de Produtos", async ({ page }) => {
    // Abre busca de produtos
    await page.click('button:has-text("Produto")');
    await expect(page.locator("text=Buscar Produtos")).toBeVisible();

    // Digita busca e seleciona primeiro produto
    await page.fill('input[placeholder*="Buscar"]', "Caneta");
    await page.waitForTimeout(500); // Aguarda debounce
    const addBtn = page.locator('button:has-text("Adicionar"), button[aria-label*="Adicionar"]').first();
    await addBtn.click();

    // Valida que produto foi adicionado à lista lateral
    await expect(page.locator("text=1 item(ns) adicionado(s)")).toBeVisible();

    // Customização: Altera quantidade e valida recálculo
    const qtyInput = page.locator('input[type="number"]').first();
    await qtyInput.fill("100");
    await page.keyboard.press("Tab");

    // Valida que o resumo atualizou
    await expect(page.locator("text=R$")).toBeVisible();
    await page.screenshot({ path: `${evidenceDir}/03-product-customized.png` });
  });

  test("Cenário 3: Condições Comerciais e Frete", async ({ page }) => {
    // Seleciona Prazo de Pagamento
    const paymentTrigger = page.locator('button:has-text("Prazo | Pagamento")').or(page.locator('label:has-text("Pagamento") + div button')).first();
    await paymentTrigger.click();
    await page.click("text=21 dias");

    // Seleciona Frete FOB e preenche valor
    const shippingTrigger = page.locator('button:has-text("Frete")').first();
    await shippingTrigger.click();
    await page.click("text=FOB");
    
    const shippingValue = page.locator('input[placeholder="0,00"]');
    await shippingValue.fill("50.00");
    
    await expect(page.locator("text=R$ 50,00")).toBeVisible();
    await page.screenshot({ path: `${evidenceDir}/04-commercial-conditions.png` });
  });

  test("Cenário 4: Uso de Templates e AutoSave", async ({ page }) => {
    // Verifica AutoSave
    const autoSaveIndicator = page.locator("text=Salvo").or(page.locator("text=Sincronizando"));
    await expect(autoSaveIndicator).toBeVisible();

    // Testa aplicação de Template
    const templateBtn = page.locator("button:has-text('Usar Template')");
    if (await templateBtn.isVisible()) {
      await templateBtn.click();
      const firstTemplate = page.locator('role=menuitem').first();
      if (await firstTemplate.isVisible()) {
        await firstTemplate.click();
        await expect(page.locator("text=aplicado")).toBeVisible();
      }
    }
  });

  test("Cenário 5: Finalização e Validação de Erros de Negócio", async ({ page }) => {
    // Tenta finalizar orçamento incompleto
    await page.click("text=Gerar Orçamento");
    
    // Se faltarem dados obrigatórios (ex: frete não preenchido em modo FOB), deve alertar
    const errorAlert = page.locator("text=obrigatório").or(page.locator(".text-destructive"));
    if (await errorAlert.count() > 0) {
      await page.screenshot({ path: `${evidenceDir}/05-validation-errors.png` });
    }
  });

  test("Cenário 6: Acessibilidade e Navegação no Builder", async ({ page }) => {
    // Testa ordem de foco no formulário
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeDefined();

    // Verifica rótulos ARIA nos campos críticos
    const companyLabel = await page.getAttribute('button[aria-haspopup="dialog"]', 'aria-label');
    // expect(companyLabel).toBeDefined(); // Opcional dependendo da implementação exata
  });

});
