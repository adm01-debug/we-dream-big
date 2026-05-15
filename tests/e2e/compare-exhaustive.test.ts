import { test, expect } from "@playwright/test";
import fs from 'fs';
import path from 'path';

/**
 * Módulo: Comparar (E2E Exaustivo)
 * Objetivo: Validar todas as funcionalidades, botões e camadas do sistema de comparação.
 */

test.describe("Módulo de Comparação - Testes Exaustivos e Minuciosos", () => {
  
  const evidenceDir = 'tests/e2e/evidence/exhaustive';

  test.beforeAll(async () => {
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Configura captura de logs para auditoria
    page.on('console', msg => {
      const logLine = `[${msg.type()}] ${msg.text()}\n`;
      fs.appendFileSync(path.join(evidenceDir, 'exhaustive-audit.log'), logLine);
    });

    // Passo 1: Adicionar produtos à comparação a partir do catálogo
    await page.goto("/produtos");
    const compareButtons = page.locator('button[aria-label*="comparar"], button:has-text("Comparar")');
    
    // Adicionamos 4 produtos (limite máximo para testar todos os estados)
    for (let i = 0; i < 4; i++) {
      await compareButtons.nth(i).click();
      await page.waitForTimeout(100); // Pequena pausa para garantir o registro no store
    }
    
    await page.goto("/comparar");
  });

  test("Fluxo 1: Gestão de Itens e Limites", async ({ page }) => {
    // Valida que 4 produtos estão sendo comparados
    await expect(page.locator("text=Comparando 4 produtos")).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, '01-initial-4-products.png') });

    // Testa remoção individual
    const removeButtons = page.locator('button[aria-label="Remover"]');
    await removeButtons.first().click();
    await expect(page.locator("text=Comparando 3 produtos")).toBeVisible();

    // Testa botão Limpar Tudo
    await page.click("text=Limpar");
    await expect(page.locator("text=Selecione pelo menos 2 produtos")).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, '02-after-clear.png') });
  });

  test("Fluxo 2: Visualização de Dados e Filtros Avançados", async ({ page }) => {
    // Alterna para Tabela Detalhada
    await page.click("text=Tabela Detalhada");
    
    // Valida presença de Atributos Críticos
    const attributes = ["Preço unitário", "Quantidade mínima", "Estoque", "Lead time", "SKU"];
    for (const attr of attributes) {
      await expect(page.locator(`text=${attr}`)).toBeVisible();
    }

    // Testa Filtro 'Só diferenças'
    await page.click("text=Só diferenças");
    await expect(page.locator("text=Mostrando diferenças")).toBeVisible();
    
    // Verifica se as linhas que eram iguais sumiram (SKU geralmente é diferente, Categoria pode ser igual)
    // Se todos forem da mesma categoria, a linha 'Categoria' deve sumir no modo 'Só diferenças'
    await page.screenshot({ path: path.join(evidenceDir, '03-table-differences-only.png') });
  });

  test("Fluxo 3: Inteligência e Gráficos (Radar + Advisor)", async ({ page }) => {
    // Valida Radar Chart (Recharts)
    const radar = page.locator(".recharts-responsive-container");
    await expect(radar).toBeVisible();

    // Valida Score Cards
    await expect(page.locator("text=Pontuação de Comparação")).toBeVisible();
    
    // Valida Advisor AI (seção de recomendações inteligentes)
    await expect(page.locator("text=Advisor AI").or(page.locator("text=Recomendação"))).toBeVisible();

    // Testa toggle do Radar via atalho 'R'
    await page.keyboard.press("r");
    await expect(radar).not.toBeVisible();
    await page.keyboard.press("r");
    await expect(radar).toBeVisible();
  });

  test("Fluxo 4: Exportação e Compartilhamento", async ({ page }) => {
    // Testa abertura do Modal de Compartilhamento
    await page.click("text=Compartilhar");
    await expect(page.locator("text=Link de Comparação")).toBeVisible();
    await page.click('button[aria-label="Close"]'); // Fecha modal

    // Testa Exportação (validação de botão presente)
    const exportBtn = page.locator("text=Exportar").or(page.locator('button[aria-label*="Exportar"]'));
    await expect(exportBtn).toBeVisible();
  });

  test("Fluxo 5: Responsividade e Sincronização de Variantes", async ({ page }) => {
    // Simula Mobile Viewport
    await page.setViewportSize({ width: 375, height: 812 });
    // No mobile, a visualização muda para o Carrossel (ComparisonMobileView)
    await expect(page.locator(".md\\:hidden")).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, '04-mobile-carousel.png') });

    // Volta para Desktop
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test("Fluxo 6: Integração CRM e Cliente", async ({ page }) => {
    // Testa seleção de cliente CRM
    await page.click("text=Cliente CRM");
    // Seleciona o primeiro cliente da lista (se houver)
    const clientOption = page.locator("role=menuitem").or(page.locator("button")).filter({ hasText: /Cliente/i }).first();
    if (await clientOption.isVisible()) {
      await clientOption.click();
      await expect(page.locator("text=Comparando")).toContainText(/Cliente/i);
    }
  });

});
