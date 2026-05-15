import { test, expect } from "@playwright/test";
import fs from 'fs';
import path from 'path';

/**
 * Módulo: Comparar (E2E Avançado)
 * Cenários: Transições visuais, Erros de Radar, Performance e Logs de Warning.
 */

test.describe("Módulo de Comparação - Testes de Regressão Visual e Robustez", () => {
  
  const evidenceDir = 'tests/e2e/evidence';

  test.beforeAll(async () => {
    if (!fs.existsSync(evidenceDir)) {
      fs.mkdirSync(evidenceDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    // Captura logs do console para detectar warnings do React
    page.on('console', msg => {
      if (msg.type() === 'warning' || msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('act') || text.includes('update during render') || text.includes('React Router')) {
          console.warn(`[REACT WARNING] ${text}`);
          fs.appendFileSync(path.join(evidenceDir, 'console-warnings.log'), `${new Date().toISOString()} - ${text}\n`);
        }
      }
    });

    await page.goto("/produtos");
    const compareButtons = page.locator('button[aria-label*="comparar"], button:has-text("Comparar")');
    await compareButtons.nth(0).click();
    await compareButtons.nth(1).click();
    await page.goto("/comparar");
  });

  test("Cenário: Regressão Visual - Transição Duelo para Galeria (3º produto)", async ({ page }) => {
    // Reduz animações para screenshots consistentes
    await page.addStyleTag({ content: '*, *::before, *::after { transition-duration: 0.001s !important; animation-duration: 0.001s !important; transition-delay: 0s !important; }' });

    // Screenshot do estado inicial (Duelo com 2 produtos)
    await expect(page.locator("text=⚔️ Modo Duelo").or(page.locator("text=Ativar Modo Duelo"))).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, 'compare-duel-initial.png') });

    // Adiciona o 3º produto via rail ou navegação
    await page.goto("/produtos");
    const compareButtons = page.locator('button[aria-label*="comparar"], button:has-text("Comparar")');
    await compareButtons.nth(2).click();
    await page.goto("/comparar");

    // Valida transição visual automática
    await expect(page.locator("text=Galeria Visual")).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, 'compare-gallery-3-products.png'), fullPage: true });
    
    // Snapshot do DOM para análise de integridade
    const dom = await page.content();
    fs.writeFileSync(path.join(evidenceDir, 'compare-3-products-snapshot.html'), dom);

    // Verifica se o Modo Duelo não está mais visível
    await expect(page.locator("text=⚔️ Modo Duelo")).not.toBeVisible();
  });

  test("Cenário: Erro e Timeout no Radar Chart", async ({ page }) => {
    // Mock de erro na RPC de top produtos para testar resiliência
    await page.route('**/rest/v1/rpc/get_top_compared_products*', route => {
      route.abort('timedout');
    });

    await page.reload();

    // Verifica se a UI exibe o fallback graciosamente em vez de quebrar
    // Nota: O fallback exibe "Sugestões para começar" se a RPC falhar
    const emptyState = page.locator("text=Sugestões para começar").or(page.locator("text=Os mais comparados"));
    await expect(emptyState).toBeVisible();
    
    await page.screenshot({ path: path.join(evidenceDir, 'radar-error-fallback.png') });
  });

  test("Cenário: Performance e Persistência (Galeria vs Tabela)", async ({ page }) => {
    // Alterna para Tabela
    await page.click("text=Tabela Detalhada");
    await expect(page.locator("table")).toBeVisible();
    
    // Inicia medição de tempo de resposta para filtros
    const start = Date.now();
    await page.click("text=Só diferenças");
    await expect(page.locator("text=Mostrando diferenças")).toBeVisible();
    const duration = Date.now() - start;

    console.log(`[PERF] Filtro 'Só diferenças' aplicado em ${duration}ms`);
    expect(duration).toBeLessThan(1000);

    // Valida se o cabeçalho sticky funciona ao rolar
    await page.evaluate(() => window.scrollTo(0, 800));
    // O sticky mini-header aparece quando o Sentinel sai de cena
    const stickyHeader = page.locator('div[class*="sticky top-0"]');
    await expect(stickyHeader).toBeVisible();
    await page.screenshot({ path: path.join(evidenceDir, 'sticky-header-active.png') });
  });

  test("Cenário: Cleanup e Acessibilidade", async ({ page }) => {
    const ariaLive = page.locator('[aria-live="polite"]');
    const clearBtn = page.locator("text=Limpar");
    await clearBtn.click();
    
    // Após limpar, deve voltar para o catálogo ou estado vazio
    await expect(page.locator("text=Comparador de Produtos")).toBeVisible();
    await expect(page.locator("text=Selecione pelo menos 2 produtos")).toBeVisible();
    
    await page.screenshot({ path: path.join(evidenceDir, 'cleanup-state.png') });
  });
});


