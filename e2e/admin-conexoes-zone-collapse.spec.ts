/**
 * E2E: Colapso/expansão das zonas em /admin/conexoes
 *
 * Cobre:
 *  1. Colapsar individualmente Saúde, Operação e Conexões
 *  2. Expandir cada uma de volta
 *  3. Persistência via localStorage após F5 (reload)
 *  4. Auto-expand + highlight ao receber `connections:focus-zone`
 *     (evento que a Incident Strip dispara ao clicar num incidente)
 *
 * Notas:
 *  - A rota é protegida (admin). Se o app redirecionar para /login,
 *    o teste é marcado como `skip` para não falhar sem credenciais válidas.
 *  - O evento de deep-link é simulado via `page.evaluate` para evitar
 *    dependência de incidentes reais na Strip (que dependem de seed/live data).
 */
import { test, expect, type Page } from '@playwright/test';

const ROUTE = '/admin/conexoes';
const STORAGE_KEY = 'connections.zone-collapse.v1';

type ZoneId = 'health' | 'operation' | 'connections';

const ZONES: Array<{
  id: ZoneId;
  anchor: string;
  title: RegExp;
  /** aria-label do botão de toggle no header */
  toggleLabel: RegExp;
}> = [
  { id: 'health', anchor: 'zone-health', title: /^Saúde$/, toggleLabel: /Saúde/i },
  { id: 'operation', anchor: 'zone-operation', title: /^Operação$/, toggleLabel: /Operação/i },
  { id: 'connections', anchor: 'zone-connections', title: /^Conexões$/, toggleLabel: /Conexões/i },
];

async function gotoOrSkip(page: Page) {
  await page.goto(ROUTE);
  // Se a guarda de admin redirecionar para /login, pulamos.
  await page.waitForLoadState('domcontentloaded');
  const url = page.url();
  if (/\/login/i.test(url)) {
    test.skip(true, 'Rota protegida — necessário login admin para o E2E.');
  }
  // Limpa qualquer estado anterior antes de cada teste.
  await page.evaluate((key) => localStorage.removeItem(key), STORAGE_KEY);
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  if (/\/login/i.test(page.url())) {
    test.skip(true, 'Sessão admin não disponível.');
  }
}

async function getToggleButton(page: Page, zone: (typeof ZONES)[number]) {
  // O aria-label é "Colapsar {title}" ou "Expandir {title}".
  return page.locator(
    `#${zone.anchor} button[aria-controls="${zone.anchor}-content"]`,
  );
}

async function getContentWrapper(page: Page, zone: (typeof ZONES)[number]) {
  return page.locator(`#${zone.anchor}-content`);
}

test.describe('Admin Conexões — Colapso/Expansão de Zonas (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await gotoOrSkip(page);
    // Aguarda ao menos a primeira zona aparecer.
    await expect(page.locator('#zone-health')).toBeVisible({ timeout: 10_000 });
  });

  test('colapsa e expande individualmente cada uma das 3 zonas', async ({ page }) => {
    for (const zone of ZONES) {
      const toggle = await getToggleButton(page, zone);
      const content = await getContentWrapper(page, zone);

      // Estado inicial: expandida.
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(content).not.toHaveAttribute('hidden', /.*/);

      // Colapsa.
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
      await expect(content).toHaveAttribute('hidden', /.*/);

      // Header continua visível (heading h2 com o título da zona).
      await expect(
        page.locator(`#${zone.anchor} h2`).filter({ hasText: zone.title }),
      ).toBeVisible();

      // Expande de volta.
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await expect(content).not.toHaveAttribute('hidden', /.*/);
    }
  });

  test('persiste o estado colapsado após reload (F5)', async ({ page }) => {
    // Colapsa Saúde e Operação; deixa Conexões expandida.
    for (const zone of ['health', 'operation'] as const) {
      const z = ZONES.find((x) => x.id === zone)!;
      const toggle = await getToggleButton(page, z);
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    }

    // Confirma que localStorage foi gravado com o estado correto.
    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      STORAGE_KEY,
    );
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toMatchObject({
      health: true,
      operation: true,
      connections: false,
    });

    // Reload e verifica que o estado foi restaurado.
    await page.reload();
    await expect(page.locator('#zone-health')).toBeVisible({ timeout: 10_000 });

    const healthToggle = await getToggleButton(page, ZONES[0]);
    const operationToggle = await getToggleButton(page, ZONES[1]);
    const connectionsToggle = await getToggleButton(page, ZONES[2]);

    await expect(healthToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(operationToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(connectionsToggle).toHaveAttribute('aria-expanded', 'true');

    // Conteúdos refletem o estado.
    await expect(await getContentWrapper(page, ZONES[0])).toHaveAttribute('hidden', /.*/);
    await expect(await getContentWrapper(page, ZONES[1])).toHaveAttribute('hidden', /.*/);
    await expect(await getContentWrapper(page, ZONES[2])).not.toHaveAttribute('hidden', /.*/);
  });

  test('deep-link de incidente expande zona colapsada e aplica highlight', async ({ page }) => {
    // Colapsa Saúde manualmente para simular cenário em que incidente
    // chega para uma zona oculta pelo usuário.
    const healthZone = ZONES[0];
    const toggle = await getToggleButton(page, healthZone);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    // Dispara o evento que a Incident Strip emite ao clicar num incidente.
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('connections:focus-zone', {
          detail: { zone: 'health', anchorId: 'zone-health' },
        }),
      );
    });

    // A zona deve auto-expandir.
    await expect(toggle).toHaveAttribute('aria-expanded', 'true', { timeout: 3000 });
    await expect(await getContentWrapper(page, healthZone)).not.toHaveAttribute('hidden', /.*/);

    // O highlight é aplicado via classe `ring-2` no <section> por ~1.8s.
    const section = page.locator('#zone-health');
    await expect(section).toHaveClass(/ring-2/, { timeout: 1000 });

    // Após ~1.8s, o highlight deve sumir.
    await page.waitForTimeout(2200);
    await expect(section).not.toHaveClass(/ring-2/);
  });

  test('deep-link funciona também quando a zona já está expandida (no-op de expand)', async ({ page }) => {
    const operationZone = ZONES[1];
    const toggle = await getToggleButton(page, operationZone);
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('connections:focus-zone', {
          detail: { zone: 'operation', anchorId: 'zone-operation' },
        }),
      );
    });

    // Continua expandida e ganha highlight temporário.
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const section = page.locator('#zone-operation');
    await expect(section).toHaveClass(/ring-2/, { timeout: 1000 });
  });
});
