/**
 * Tests for NoveltyGridCard — covers the PR text label change:
 *   "Vendas no Fornecedor 30d" → "Vendas 30d"
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../render-helpers";
import React from "react";

// ── Mocks for heavy child components ────────────────────────────

vi.mock("@/components/products/ProductSparkline", () => ({
  ProductSparkline: () => <div data-testid="sparkline-stub" />,
}));

vi.mock("@/components/products/NoveltyBadge", () => ({
  NoveltyBadge: () => null,
}));

vi.mock("@/components/common/SelectionCheckbox", () => ({
  SelectionCheckbox: () => null,
}));

// ── Test fixtures ────────────────────────────────────────────────

const baseProduct = {
  product_id: "np-1",
  id: "np-1",
  // Componente usa product_name (não 'name'). Mantemos ambos por compat.
  product_name: "Copo Personalizado",
  name: "Copo Personalizado",
  product_image: null,
  product_sku: null,
  base_price: 12.99,
  price: 12.99,
  stock_quantity: 80,
  stock_status: "in-stock" as const,
  detected_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  category_name: "Copos",
  supplier_name: "FornecedorX",
  days_remaining: 0,
  images: [],
  og_image_url: null,
};

const baseCardProps = {
  product: baseProduct as any,
  onClick: vi.fn(),
  selectionMode: false,
  isSelected: false,
  onToggleSelect: vi.fn(),
};

describe("NoveltyGridCard — label changes (PR)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'Vendas 30d' label (updated text)", async () => {
    const { NoveltyGridCard } = await import("@/components/novelties/NoveltyCards");
    renderWithProviders(<NoveltyGridCard {...baseCardProps} />);
    expect(screen.getByText("Vendas 30d")).toBeInTheDocument();
  });

  it("does NOT render the old 'Vendas no Fornecedor 30d' label", async () => {
    const { NoveltyGridCard } = await import("@/components/novelties/NoveltyCards");
    renderWithProviders(<NoveltyGridCard {...baseCardProps} />);
    expect(screen.queryByText(/Vendas no Fornecedor 30d/i)).not.toBeInTheDocument();
  });

  it("renders the ProductSparkline for the product", async () => {
    const { NoveltyGridCard } = await import("@/components/novelties/NoveltyCards");
    renderWithProviders(<NoveltyGridCard {...baseCardProps} />);
    expect(screen.getByTestId("sparkline-stub")).toBeInTheDocument();
  });

  it("renders product name", async () => {
    const { NoveltyGridCard } = await import("@/components/novelties/NoveltyCards");
    renderWithProviders(<NoveltyGridCard {...baseCardProps} />);
    expect(screen.getByText("Copo Personalizado")).toBeInTheDocument();
  });

  it("renders category name when present", async () => {
    const { NoveltyGridCard } = await import("@/components/novelties/NoveltyCards");
    renderWithProviders(<NoveltyGridCard {...baseCardProps} />);
    expect(screen.getByText("Copos")).toBeInTheDocument();
  });

  it("does not render category badge when category_name is absent", async () => {
    const { NoveltyGridCard } = await import("@/components/novelties/NoveltyCards");
    const productNoCat = { ...baseProduct, category_name: undefined };
    renderWithProviders(
      <NoveltyGridCard {...baseCardProps} product={productNoCat as any} />
    );
    // "Copos" should not appear
    expect(screen.queryByText("Copos")).not.toBeInTheDocument();
  });

  // Regression: ensure the old label stays absent even if product name contains "Fornecedor"
  it("does not show 'Vendas no Fornecedor' when product name contains 'Fornecedor'", async () => {
    const { NoveltyGridCard } = await import("@/components/novelties/NoveltyCards");
    const productWithFornecedorName = {
      ...baseProduct,
      name: "Brinde do Fornecedor Premium",
    };
    renderWithProviders(
      <NoveltyGridCard {...baseCardProps} product={productWithFornecedorName as any} />
    );
    // The sparkline label should still be "Vendas 30d"
    expect(screen.getByText("Vendas 30d")).toBeInTheDocument();
    // The old label should not appear as the section header
    const allText = document.body.textContent ?? "";
    expect(allText).not.toMatch(/Vendas no Fornecedor 30d/i);
  });
});