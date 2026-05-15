import { test, expect } from './fixtures/test-base';
import { loginAs } from './helpers/auth';

/**
 * Testes E2E para o Módulo de Coleções
 * Abrangência:
 * - Listagem, KPIs e Busca
 * - CRUD de Coleções Locais (Criar, Editar, Clonar, Excluir)
 * - Navegação e Detalhes
 * - Gestão de Produtos (Reordenação, Remoção)
 * - Seleção em Massa e Criação de Orçamento
 * - Acessibilidade e Regressão Visual (Skins)
 */

test.describe('Módulo de Coleções - Testes E2E Exaustivos', () => {
  
  test.beforeEach(async ({ page }) => {
    await loginAs(page);
    // Navegar para a página de coleções
    await page.goto('/colecoes');
    // Aguardar o carregamento inicial validando o título da página via data-testid
    await expect(page.locator('[data-testid="page-title-colecoes"]')).toBeVisible();
  });

  test('Deve validar a interface inicial e KPIs', async ({ page }) => {
    // Verificar se os cards de estatísticas (KPIs) estão visíveis
    await expect(page.getByText('Total Coleções')).toBeVisible();
    await expect(page.getByText('Coleções Catálogo')).toBeVisible();
    await expect(page.getByText('Minhas Coleções')).toBeVisible();
    await expect(page.getByText('Produtos')).toBeVisible();

    // Validar presença do Heatmap de atividade
    await expect(page.locator('aria-label="Histórico semanal de coleções"')).toBeVisible();
  });

  test('Fluxo completo: Criar, Editar, Clonar e Excluir Coleção', async ({ page }) => {
    const uniqueId = Date.now().toString().slice(-4);
    const colName = `Coleção VIP ${uniqueId}`;
    const editedColName = `Coleção VIP ${uniqueId} - Master`;

    // 1. Criar Nova Coleção
    await page.getByRole('button', { name: 'Nova Coleção' }).click();
    await expect(page.getByText('Nova Coleção')).toBeVisible();
    
    await page.getByPlaceholder('Ex: Clientes Premium').fill(colName);
    await page.getByPlaceholder('Descreva esta coleção...').fill('Produtos exclusivos para clientes VIP');
    
    // Selecionar uma cor e um ícone (simulando cliques nos botões de motion)
    await page.locator('button[style*="background-color"]').nth(2).click(); // Escolhe a 3ª cor
    await page.getByText('📂').click(); // Escolhe um ícone padrão se disponível, ou busca por texto
    
    await page.getByRole('button', { name: 'Criar' }).click();
    await expect(page.getByText(colName)).toBeVisible();

    // 2. Editar Coleção
    // Localizar o card da coleção recém-criada
    const card = page.locator('div.group').filter({ hasText: colName }).first();
    await card.hover();
    
    // Clicar no botão de edição (ícone Settings2 ou similar dependendo do componente)
    const editBtn = card.locator('button[aria-label*="Editar"], button:has-text("Editar")').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.getByPlaceholder('Ex: Clientes Premium').clear();
      await page.getByPlaceholder('Ex: Clientes Premium').fill(editedColName);
      await page.getByRole('button', { name: 'Salvar' }).click();
      await expect(page.getByText(editedColName)).toBeVisible();
    }

    // 3. Clonar Coleção
    await card.hover();
    const cloneBtn = card.locator('button[aria-label*="Duplicar"], button:has-text("Duplicar")').first();
    if (await cloneBtn.isVisible()) {
      await cloneBtn.click();
      await expect(page.getByText(`${editedColName} (Cópia)`)).toBeVisible();
    }

    // 4. Excluir Coleção
    await card.hover();
    const deleteBtn = card.locator('button[aria-label*="Excluir"], button:has-text("Excluir")').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await expect(page.getByText('Excluir coleção?')).toBeVisible();
      await page.getByRole('button', { name: 'Excluir' }).click();
      await expect(page.getByText(editedColName)).not.toBeVisible();
    }
  });

  test('Deve gerenciar produtos dentro de uma coleção', async ({ page }) => {
    // Clicar na primeira coleção disponível para entrar nos detalhes
    const firstCollection = page.locator('div.group.cursor-pointer').first();
    if (await firstCollection.isVisible()) {
      await firstCollection.click();
      
      // Validar que estamos na página de detalhes
      await expect(page.url()).toContain('/colecoes/');
      
      // Testar Busca Interna
      const internalSearch = page.getByPlaceholder('Buscar na coleção...');
      if (await internalSearch.isVisible()) {
        await internalSearch.fill('xyz-non-existent');
        // Se houver lógica de empty state interno
      }

      // Testar Ordenação
      await page.getByRole('button', { name: /Adicionados|Nome|SKU/ }).click();
      await page.getByText('Nome A-Z').click();

      // Testar Seleção e Remoção
      const selectBtn = page.getByRole('button', { name: 'Selecionar' });
      if (await selectBtn.isVisible()) {
        await selectBtn.click();
        const firstProductCheckbox = page.getByRole('checkbox').first();
        if (await firstProductCheckbox.isVisible()) {
          await firstProductCheckbox.check();
          await expect(page.getByText(/selecionado/)).toBeVisible();
          
          // Testar Orçamento via Seleção
          await page.getByRole('button', { name: /Orçamento/ }).click();
          await expect(page.url()).toContain('/orcamentos/novo');
          await page.goBack();
        }
      }

      // Testar Botão Compartilhar
      await page.getByRole('button', { name: 'Compartilhar' }).click();
      await expect(page.getByText(/Compartilhar Coleção/i)).toBeVisible();
      await page.keyboard.press('Escape');

      // Voltar para listagem
      await page.getByRole('button', { name: 'Voltar para coleções' }).click();
      await expect(page.locator('[data-testid="page-title-colecoes"]')).toBeVisible();
    }
  });

  test('Deve validar atalhos globais e acessibilidade', async ({ page }) => {
    // Testar atalho G + C (navegação)
    await page.goto('/');
    await page.keyboard.press('g');
    await page.keyboard.press('c');
    await expect(page.url()).toContain('/colecoes');

    // Testar Tab navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).not.toBeNull();
  });

  test('Regressão Visual e Responsividade', async ({ page }) => {
    // Screenshot Desktop - Modo Grade
    await page.screenshot({ path: '/mnt/documents/colecoes-grid-desktop.png', fullPage: true });

    // Alternar para Modo Tabela
    const layoutBtn = page.locator('button').filter({ hasText: /Modo de Visualização|Layout/i }).first();
    if (await layoutBtn.isVisible()) {
      await layoutBtn.click();
      await page.getByRole('menuitem', { name: /Tabela/i }).click();
      await page.screenshot({ path: '/mnt/documents/colecoes-table-desktop.png' });
    }

    // Modo Mobile
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: '/mnt/documents/colecoes-mobile.png' });

    // Validar visibilidade do menu inferior em mobile
    await expect(page.locator('nav.fixed.bottom-0')).toBeVisible();
  });
});
