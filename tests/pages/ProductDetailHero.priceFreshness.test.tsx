/**
 * Integration-lite test for the PDP price-freshness contract.
 *
 * The full ProductDetailHero is heavily coupled (gallery, quote wizard,
 * favorites, supplier trust, etc.). To keep this test focused on the
 * `priceUpdatedAt → PriceFreshnessBadge variant="pdp"` contract, we render
 * the exact same badge invocation used by ProductDetailHero, feeding it the
 * shape produced by `mapPromobrindToProduct`. This locks the regression at
 * the boundary that matters: a product flowing from the external DB into
 * the PDP price block.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriceFreshnessBadge } from "@/components/products/PriceFreshnessBadge";
import { mapPromobrindToProduct } from "@/utils/product-mapper";

vi.mock("@/lib/external-db", () => ({
  getProductImageUrl: (p: any) => p.images?.[0]?.url || "/placeholder.svg",
  getProductPrice: (p: any) => p.price || 0,
  getProductStock: (p: any) => p.stock ?? 0,
}));

vi.mock("@/utils/product-colors", () => ({
  normalizeColors: () => [],
}));

const FIXED_NOW = new Date("2026-04-24T12:00:00.000Z").getTime();
const daysAgo = (d: number) =>
  new Date(FIXED_NOW - d * 86400000).toISOString();

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

function makeRawProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: "p-1",
    name: "Caneta",
    sku: "CAN-1",
    price: 10,
    stock: 50,
    images: [{ url: "/x.png" }],
    colors: [],
    is_active: true,
    price_updated_at: null,
    price_freshness_threshold_days: 60,
    ...overrides,
  };
}

/** Mirrors exactly the badge call inside ProductDetailHero (variant="pdp", alwaysShow). */
function renderHeroPriceBadge(rawProduct: Record<string, unknown>) {
  const product = mapPromobrindToProduct(rawProduct as any);
  return render(
    <PriceFreshnessBadge
      priceUpdatedAt={product.priceUpdatedAt}
      thresholdDays={product.priceFreshnessThresholdDays}
      variant="pdp"
      alwaysShow
    />,
  );
}

describe("ProductDetailHero — price freshness badge", () => {
  it("renders fresh state with short relative copy when price was updated 5 days ago", () => {
    renderHeroPriceBadge(
      makeRawProduct({ price_updated_at: daysAgo(5) }),
    );
    const badge = screen.getByRole("status");
    // Novo padrão: "Atualizado em DD/MM/AAAA · há N dias" no PDP fresh.
    expect(badge.textContent).toMatch(/atualizado em \d{2}\/\d{2}\/\d{4}/i);
    expect(badge.textContent).toMatch(/há \d+ dias?/i);
  });

  it("renders aging state with amber styling when within 50–100% of threshold", () => {
    renderHeroPriceBadge(
      makeRawProduct({
        price_updated_at: daysAgo(45),
        price_freshness_threshold_days: 60,
      }),
    );
    const badge = screen.getByRole("status");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/amber-(100|300|500)/);
  });

  it("renders stale state with 'defasado' copy and amber styling above threshold", () => {
    renderHeroPriceBadge(
      makeRawProduct({
        price_updated_at: daysAgo(90),
        price_freshness_threshold_days: 60,
      }),
    );
    const badge = screen.getByRole("status");
    expect(badge.textContent).toMatch(/defasado/i);
    expect(badge.className).toMatch(/amber-(100|300|500)/);
  });

  it("renders unknown state when priceUpdatedAt is null", () => {
    renderHeroPriceBadge(makeRawProduct({ price_updated_at: null }));
    const badge = screen.getByRole("status");
    expect(badge.textContent).toMatch(/não informada/i);
  });

  it("uses the per-product threshold coming from the external DB", () => {
    // 40 days with a 30-day threshold ⇒ stale, even though it would still be
    // 'aging' under the default 60-day threshold.
    renderHeroPriceBadge(
      makeRawProduct({
        price_updated_at: daysAgo(40),
        price_freshness_threshold_days: 30,
      }),
    );
    expect(screen.getByRole("status").textContent).toMatch(/defasado/i);
  });
});
