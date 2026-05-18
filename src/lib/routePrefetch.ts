/**
 * Route prefetching — preloads lazy-loaded page chunks on hover/touch.
 *
 * Maps route paths to their dynamic import functions so that hovering a
 * navigation link triggers the chunk download before the user clicks.
 */

const routeImportMap: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/pages/Index'),
  '/dashboard': () => import('@/pages/CustomizableDashboard'),
  '/filtros': () => import('@/pages/FiltersPage'),
  '/produtos': () => import('@/pages/FiltersPage'),
  '/novidades': () => import('@/pages/NoveltiesPage'),
  '/favoritos': () => import('@/pages/FavoritesPage'),
  '/comparar': () => import('@/pages/ComparePage'),
  '/carrinhos': () => import('@/pages/SellerCartsPage'),
  '/colecoes': () => import('@/pages/CollectionsPage'),
  '/orcamentos': () => import('@/pages/QuotesListPage'),
  '/orcamentos/novo': () => import('@/pages/QuoteBuilderPage'),
  '/orcamentos/kanban': () => import('@/pages/QuotesKanbanPage'),
  '/orcamentos/dashboard': () => import('@/pages/QuotesDashboardPage'),
  '/orcamentos/templates': () => import('@/pages/QuoteTemplatesPage'),
  '/simulador': () => import('@/pages/SimuladorWizard'),
  '/simulador-precos': () => import('@/pages/PriceSimulatorPage'),
  '/estoque': () => import('@/pages/StockDashboardPage'),
  '/mockup-generator': () => import('@/pages/MockupGenerator'),
  '/magic-up': () => import('@/pages/MagicUp'),
  '/montar-kit': () => import('@/pages/KitBuilderPage'),
  '/meus-kits': () => import('@/pages/KitLibraryPage'),
  '/clientes': () => import('@/pages/ClientsPage'),
  '/tendencias': () => import('@/pages/TrendsPage'),
  '/busca-preco': () => import('@/pages/AdvancedPriceSearchPage'),
  '/inteligencia-comercial': () => import('@/pages/CommercialIntelligencePage'),
  '/admin/usuarios': () => import('@/pages/admin/AdminUsuariosPage'),
  '/admin/telemetria': () => import('@/pages/admin/AdminTelemetriaPage'),
  '/admin/cadastros': () => import('@/pages/admin/AdminCadastrosPage'),
  '/admin/conexoes': () => import('@/pages/admin/AdminConexoesStatusPage'),
};

const prefetched = new Set<string>();

/**
 * Prefetch the JS chunk for a given route path.
 * Safe to call multiple times — each route is only fetched once.
 */
export function prefetchRoute(path: string): void {
  if (prefetched.has(path)) return;

  const importer = routeImportMap[path];
  if (!importer) return;

  prefetched.add(path);
  // Use requestIdleCallback when available for non-blocking prefetch
  const schedule = typeof requestIdleCallback === 'function'
    ? requestIdleCallback
    : (fn: () => void) => setTimeout(fn, 0);

  schedule(() => {
    importer().catch(() => {
      // Remove from set so it can be retried
      prefetched.delete(path);
    });
  });
}

/**
 * Props to spread on a link element (or wrapper) to enable prefetch on hover/touch.
 */
export function getPrefetchHandlers(path: string) {
  return {
    onMouseEnter: () => prefetchRoute(path),
    onTouchStart: () => prefetchRoute(path),
  };
}
