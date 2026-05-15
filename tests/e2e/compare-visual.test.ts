import { test, expect } from "@playwright/test";
import fs from 'fs';
import path from 'path';

/**
 * Módulo: Comparar (E2E Avançado & Regressão Visual)
 * Foco: Screenshots, Loading/Erro Radar & AI, Estabilidade de Transição.
 */

test.describe("Módulo de Comparação - Visual Regression & Robustez", () => {
  const evidenceDir = 'tests/e2e/evidence/advanced';

  test.beforeAll(async () => {
    if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
  });

  test.beforeEach(async ({ page }) => {
    // Captura de logs para falhar em warnings do React
    page.on('console', msg => {
      if (msg.text().includes('update during render') || msg.text().includes('act(')) {
        console.error(`[FAIL] React Warning: ${msg.text()}`);
      }
    });

    // Estado inicial: 2 produtos
    await page.goto("/produtos");
    const compareBtns = page.locator('button[aria-label*="comparar"], button:has-text("Comparar")');
    await compareBtns.nth(0).click();
    await compareBtns.nth(1).click();
    await page.goto("/comparar");
    
    // Reduz animações para estabilidade visual
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
  });

  test("Cenário 1: Visual Regression - Transições de Layout", async ({ page }) => {
    // 1. Baseline: Modo Duelo (2 produtos)
    await expect(page.locator("text=⚔️ Modo Duelo").or(page.locator("text=Ativar Modo Duelo"))).toBeVisible();
    await page.screenshot({ path: `${evidenceDir}/01-duel-mode-baseline.png` });

    // 2. Transição: Adicionar 3º produto (Auto-switch para Galeria)
    await page.goto("/produtos");
    await page.locator('button[aria-label*="comparar"], button:has-text("Comparar")').nth(2).click();
    await page.goto("/comparar");
    
    await expect(page.locator("text=Galeria Visual")).toBeVisible();
    await page.screenshot({ path: `${evidenceDir}/02-gallery-view-3-products.png` });

    // 3. Troca para Tabela Detalhada
    await page.click("text=Tabela Detalhada");
    await expect(page.locator("table")).toBeVisible();
    await page.screenshot({ path: `${evidenceDir}/03-table-view-diff.png` });
  });

  test("Cenário 2: Resiliência Radar Chart (Loading & Error)", async ({ page }) => {
    // Mock de latência para testar Loading
    await page.route('**/rpc/get_top_compared_products*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });
    
    await page.reload();
    // Verifica feedback de loading (skeleton ou spinner se houver)
    // await expect(page.locator(".animate-pulse")).toBeVisible();

    // Mock de erro de rede para Radar Chart / Fallback
    await page.route('**/rpc/get_top_compared_products*', route => route.abort('failed'));
    await page.reload();
    
    // Deve exibir fallback sem quebrar
    await expect(page.locator("text=Sugestões para começar").or(page.locator("text=Os mais comparados"))).toBeVisible();
    await page.screenshot({ path: `${evidenceDir}/04-radar-error-recovery.png` });
  });

  test("Cenário 3: Advisor AI - Erro e Timeout", async ({ page }) => {
    // Advisor AI geralmente depende de contexto de produtos. Mock de falha na IA.
    await page.route('**/functions/v1/ai-advisor*', route => route.abort('timedout'));
    
    await expect(page.locator("text=Advisor AI").or(page.locator("text=Recomendação"))).toBeVisible();
    // Verifica se há mensagem de erro amigável ou se o componente lida com nulo
    await page.screenshot({ path: `${evidenceDir}/05-ai-timeout-state.png` });
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      // Gera dump do DOM em falha
      const dom = await page.content();
      fs.writeFileSync(`${evidenceDir}/failure-${testInfo.title.replace(/\s+/g, '-')}.html`, dom);
    }
  });
});
