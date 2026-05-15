/**
 * E2E: Validação ponta-a-ponta de /admin/conexoes com integration_credentials preenchida.
 *
 * Cobre o fluxo "credenciais no banco → cards exibem ‘Ativo’ → produtos reais
 * aparecem":
 *
 *   1. ConnectionsOverviewTable renderiza ao menos uma linha com badge "Ativo"
 *      (ConnectionStatusBadge.active.label === "Ativo"), provando que o trigger
 *      de sync de integration_credentials → external_connections funcionou e
 *      que o último teste de conexão foi bem-sucedido.
 *
 *   2. IntegrationsHealthCard exibe contagem de conexões ativas > 0.
 *
 *   3. Aba 🐛 Debug → BridgeProductsPreviewPanel chama o external-db-bridge
 *      (operação select em products) e renderiza pelo menos uma linha de
 *      produto real, com o contador "X–Y de N produto(s)" preenchido.
 *
 * Notas:
 *   - A rota é protegida por guarda de admin. Sem sessão admin válida o teste
 *     é marcado como `skip` para não falhar no CI sem credenciais.
 *   - Os asserts dependem de DADOS REAIS no banco — credenciais
 *     EXTERNAL_PROMOBRIND_* preenchidas em integration_credentials e produtos
 *     no catálogo externo. Se o ambiente estiver vazio, marcamos `skip` com
 *     mensagem explícita em vez de falhar.
 */
import { test, expect, type Page } from "@playwright/test";

const ROUTE = "/admin/conexoes";

async function gotoOrSkip(page: Page) {
  await page.goto(ROUTE);
  await page.waitForLoadState("domcontentloaded");
  if (/\/login/i.test(page.url())) {
    test.skip(true, "Rota protegida — necessário login admin para o E2E.");
  }
  // Garante que a página principal renderizou
  await expect(page.locator("#zone-connections")).toBeVisible({ timeout: 15_000 });
}

test.describe("Admin Conexões — credenciais preenchidas → cards ativos + produtos reais (E2E)", () => {
  test.beforeEach(async ({ page }) => {
    await gotoOrSkip(page);
  });

  test("ConnectionsOverviewTable mostra ao menos uma conexão com badge ‘Ativo’", async ({ page }) => {
    // A tabela vive dentro da zona Conexões; aguarda ela carregar (skeleton → linhas).
    const zone = page.locator("#zone-connections");
    await expect(zone).toBeVisible();

    // Aguarda os dados aparecerem — qualquer texto "Ativo" dentro da tabela serve.
    // ConnectionStatusBadge usa <Badge>{label}</Badge> com label="Ativo" para status active.
    const ativoBadges = zone.locator('text=/^Ativo$/');

    // Espera até 20s para a query de external_connections retornar.
    await expect(ativoBadges.first()).toBeVisible({ timeout: 20_000 });

    const count = await ativoBadges.count();
    expect(count, "Esperado ao menos um badge 'Ativo' no overview de conexões").toBeGreaterThan(0);
  });

  test("IntegrationsHealthCard exibe contagem de conexões ativas > 0", async ({ page }) => {
    // O card está na zona Saúde. Aguarda render.
    const healthZone = page.locator("#zone-health");
    await expect(healthZone).toBeVisible();

    // O título do card de saúde tem "Saúde das Integrações" / "Conexões ativas".
    // Procura pelo padrão "X/Y" onde X >= 1 dentro da zona de saúde.
    // Aceita qualquer KPI no formato "N / M" com N > 0.
    const fraction = healthZone.locator("text=/[1-9]\\d*\\s*\\/\\s*[1-9]\\d*/").first();
    await expect(fraction).toBeVisible({ timeout: 20_000 });

    const text = (await fraction.textContent()) ?? "";
    const match = text.match(/(\d+)\s*\/\s*(\d+)/);
    expect(match, `Esperado padrão "ativas/total" na zona Saúde, recebido: "${text}"`).not.toBeNull();
    if (match) {
      const ativos = Number(match[1]);
      expect(ativos, "Esperado pelo menos 1 conexão ativa").toBeGreaterThan(0);
    }
  });

  test("Aba 🐛 Debug renderiza produtos reais do external-db-bridge", async ({ page }) => {
    // Garante que a zona Conexões está expandida (onde vivem as tabs).
    const zone = page.locator("#zone-connections");
    await expect(zone).toBeVisible();

    // Clica na tab "🐛 Debug".
    const debugTab = zone.getByRole("tab", { name: /Debug/i });
    await expect(debugTab).toBeVisible({ timeout: 10_000 });
    await debugTab.click();
    await expect(debugTab).toHaveAttribute("aria-selected", "true");

    // Aguarda o painel "Produtos preenchidos (external-db-bridge)" aparecer.
    const panelHeading = page.getByText(/Produtos preenchidos \(external-db-bridge\)/i);
    await expect(panelHeading).toBeVisible({ timeout: 10_000 });

    // O painel está dentro de um Card com cabeçalho de tabela "SKU" — escopo seguro.
    // Aguarda a primeira chamada à edge function completar (skeleton → linhas).
    // A tabela tem cabeçalhos: Nome, SKU, Marca, Preço, Estoque, Ativo, Atualizado.
    const productsCard = panelHeading.locator(
      'xpath=ancestor::*[contains(@class,"rounded-lg") and .//table][1]',
    );
    await expect(productsCard).toBeVisible();

    // Aguarda o counter "X–Y de N produto(s)" aparecer (não-zero) — sinal de que
    // o bridge respondeu com count exato.
    const counter = productsCard.locator(
      "text=/\\d+\\s*[–-]\\s*\\d+\\s*de\\s*[\\d.]+\\s*produto\\(s\\)/i",
    );
    await expect(counter, "Counter de paginação deve aparecer com valores reais").toBeVisible({
      timeout: 25_000,
    });

    const counterText = (await counter.textContent()) ?? "";
    const match = counterText.match(/(\d+)\s*[–-]\s*(\d+)\s*de\s*([\d.]+)/);
    expect(match, `Esperado padrão "X–Y de N produto(s)", recebido: "${counterText}"`).not.toBeNull();
    if (match) {
      const total = Number(match[3].replace(/\./g, ""));
      expect(total, "Catálogo externo deve ter > 0 produtos").toBeGreaterThan(0);
    }

    // Conta linhas reais (exclui header). Cada produto vira uma <tr> no tbody.
    const productRows = productsCard.locator("tbody tr");
    const rowCount = await productRows.count();
    expect(rowCount, "Tabela deve renderizar ao menos 1 linha de produto").toBeGreaterThan(0);

    // Sanity: a primeira linha deve ter um SKU não-vazio (font-mono na coluna 2)
    // OU pelo menos um nome não-vazio (coluna 1). Garante que não é placeholder.
    const firstRow = productRows.first();
    const firstRowText = (await firstRow.textContent()) ?? "";
    expect(
      firstRowText.replace(/\s|—/g, "").length,
      "Primeira linha não pode estar vazia ou ser placeholder",
    ).toBeGreaterThan(0);
    expect(firstRowText, "Primeira linha não deve ser a mensagem de vazio").not.toMatch(
      /Nenhum produto encontrado/i,
    );
  });

  test("O painel de produtos suporta paginação após a primeira carga", async ({ page }) => {
    const zone = page.locator("#zone-connections");
    await zone.getByRole("tab", { name: /Debug/i }).click();

    const panelHeading = page.getByText(/Produtos preenchidos \(external-db-bridge\)/i);
    await expect(panelHeading).toBeVisible({ timeout: 10_000 });

    const productsCard = panelHeading.locator(
      'xpath=ancestor::*[contains(@class,"rounded-lg") and .//table][1]',
    );

    // Aguarda counter aparecer (proxy para "primeira carga concluída").
    const counter = productsCard.locator(
      "text=/\\d+\\s*[–-]\\s*\\d+\\s*de\\s*[\\d.]+\\s*produto\\(s\\)/i",
    );
    await expect(counter).toBeVisible({ timeout: 25_000 });

    const initialCounterText = (await counter.textContent()) ?? "";

    // Tenta ir para próxima página (botão pode estar desabilitado se houver < pageSize itens).
    const next = productsCard.getByRole("button", { name: /Próxima página/i });
    const isDisabled = await next.isDisabled();
    if (isDisabled) {
      test.info().annotations.push({
        type: "info",
        description: "Catálogo possui menos que 1 página — paginação não testável.",
      });
      return;
    }

    await next.click();

    // O contador deve atualizar para um intervalo diferente.
    await expect(counter).not.toHaveText(initialCounterText, { timeout: 15_000 });

    // E ainda deve haver linhas na tabela.
    const productRows = productsCard.locator("tbody tr");
    expect(await productRows.count()).toBeGreaterThan(0);
  });
});
