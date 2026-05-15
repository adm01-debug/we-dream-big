import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * 🚀 PREFETCH CORE CHUNKS: Warm up the next predicted routes for instant feel.
 *
 * Triggers eager `import()` on contextually likely-next pages based on
 * current pathname. Has no DOM output — returns null.
 */
export function RoutePrefetcher() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Only prefetch if we're not on a mobile connection or low power mode if detectable
    if (pathname === "/login") {
      // Prefetch index/produtos right after login screen loads
      import("@/pages/Index");
      import("@/pages/FiltersPage");
    } else if (pathname === "/") {
      // On dashboard, prefetch products and quotes
      import("@/pages/FiltersPage");
      import("@/pages/QuotesListPage");
      import("@/pages/ClientsPage");
    } else if (pathname === "/produtos") {
      // On products page, prefetch detailed product view and tools
      import("@/pages/ProductDetail");
      import("@/pages/MockupGenerator");
      import("@/pages/PriceSimulatorPage");
    }

    // Low priority prefetch for common tools
    const timeoutId = setTimeout(() => {
      if (pathname !== "/orcamentos/novo") import("@/pages/QuoteBuilderPage");
      if (pathname !== "/novidades") import("@/pages/NoveltiesPage");
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [pathname]);

  return null;
}
