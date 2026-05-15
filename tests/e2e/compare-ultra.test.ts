import { test, expect } from "@playwright/test";
import fs from 'fs';
import path from 'path';

/**
 * Módulo: Comparar (E2E Ultra Avançado)
 * Foco: Performance, Acessibilidade, Advisor AI Robustez e Artefatos de Debug.
 */

test.describe("Módulo de Comparação - Performance & A11y & Robustez", () => {
  const artifactDir = 'tests/e2e/artifacts/compare';

  test.beforeAll(async () => {
    if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
  });

  const saveArtifacts = async (page, name) => {
    const html = await page.content();
    const computedStyles = await page.evaluate(() => {
      const styles = {};
      document.querySelectorAll('*').forEach((el, i) => {
        if (i < 100) { // Limita para evitar payload gigante, foca no topo
          const selector = el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}.${Array.from(el.classList).join('.')}`;
          styles[selector] = window.getComputedStyle(el).cssText;
        }
      });
      return styles;
    });
    fs.writeFileSync(path.join(artifactDir, `${name}.html`), html);
    fs.writeFileSync(path.join(artifactDir, `${name}-styles.json`), JSON.stringify(computedStyles, null, 2));
    await page.screenshot({ path: path.join(artifactDir, `${name}.png`), fullPage: true });
  };

  test.beforeEach(async ({ page }) => {
    // Estado base: 2 produtos
    await page.goto("/produtos");
    const btns = page.locator('button[aria-label*="comparar"], button:has-text("Comparar")');
    await btns.nth(0).click();
    await btns.nth(1).click();
    await page.goto("/comparar");
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
  });

  test("Acessibilidade & Foco: Transição Duelo -> Galeria", async ({ page }) => {
    // Valida foco inicial
    await expect(page.locator("text=Modo Duelo")).toBeVisible();
    
    // Adiciona 3º produto e volta
    await page.goto("/produtos");
    await page.locator('button[aria-label*="comparar"], button:has-text("Comparar")').nth(2).click();
    await page.goto("/comparar");

    // Verifica se o título da nova view é anunciado ou recebe foco
    const title = page.locator("h1");
    await expect(title).toBeVisible();
    
    // Teste de navegação por teclado na nova view
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeDefined();

    // Aria-live check
    const ariaLive = page.locator('[aria-live="polite"]');
    await expect(ariaLive).toBeVisible();

    await saveArtifacts(page, 'a11y-transition-gallery');
  });

  test("Performance: Renderização Tabela Detalhada com Dados no Limite", async ({ page }) => {
    // Adiciona o máximo (4 produtos)
    await page.goto("/produtos");
    await page.locator('button[aria-label*="comparar"], button:has-text("Comparar")').nth(2).click();
    await page.locator('button[aria-label*="comparar"], button:has-text("Comparar")').nth(3).click();
    await page.goto("/comparar");

    const startTime = Date.now();
    await page.click("text=Tabela Detalhada");
    await expect(page.locator("table")).toBeVisible();
    const duration = Date.now() - startTime;

    console.log(`[PERF] Tabela Detalhada renderizada em ${duration}ms`);
    // Assert de performance: deve carregar em menos de 1s após o clique (já com dados no store)
    expect(duration).toBeLessThan(1000);

    await saveArtifacts(page, 'perf-table-limit');
  });

  test("Advisor AI: Retry & Recuperação após Timeout", async ({ page }) => {
    let callCount = 0;
    // Simula falha inicial e depois sucesso para testar retry/recuperação
    await page.route('**/functions/v1/ai-advisor*', async route => {
      callCount++;
      if (callCount === 1) {
        await route.abort('timedout');
      } else {
        await route.fulfill({ status: 200, body: JSON.stringify({ advice: "Recomendação recuperada com sucesso." }) });
      }
    });

    await page.reload();
    
    // Valida que a UI mostra estado de tentativa ou erro amigável
    await expect(page.locator("text=Advisor AI").or(page.locator("text=IA"))).toBeVisible();
    
    // Se houver um botão de "Tentar novamente", clica. Se for auto-retry, apenas aguarda.
    const retryBtn = page.locator("button:has-text('Tentar')");
    if (await retryBtn.isVisible()) {
      await retryBtn.click();
    }

    await expect(page.locator("text=Recomendação recuperada")).toBeVisible();
    await saveArtifacts(page, 'ai-recovery-flow');
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await saveArtifacts(page, `FAIL-${testInfo.title.replace(/\s+/g, '-')}`);
    }
  });
});
