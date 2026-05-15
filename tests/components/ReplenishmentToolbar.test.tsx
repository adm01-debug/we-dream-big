import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "./render-helpers";
import { ReplenishmentToolbar } from "@/components/replenishments/ReplenishmentToolbar";

// Mock LayoutPopover (depends on complex UI)
vi.mock("@/components/products/LayoutPopover", () => ({
  LayoutPopover: () => <div data-testid="layout-popover" />,
}));

const baseProps = {
  totalCount: 200,
  filteredCount: 150,
  isLoading: false,
  loadingProgress: 0,
  searchQuery: "",
  onSearchChange: vi.fn(),
  selectedSupplier: "all",
  onSupplierChange: vi.fn(),
  suppliers: [
    { id: "s1", name: "Fornecedor A", count: 80 },
    { id: "s2", name: "Fornecedor B", count: 120 },
  ],
  selectedCategory: "all",
  onCategoryChange: vi.fn(),
  categories: [
    { id: "c1", name: "Canetas", count: 50 },
    { id: "c2", name: "Cadernos", count: 100 },
  ],
  sortMode: "name" as const,
  onSortChange: vi.fn(),
  hasActiveFilters: false,
  onClearFilters: vi.fn(),
  viewMode: "grid" as const,
  setViewMode: vi.fn(),
  gridColumns: "4" as const,
  setGridColumns: vi.fn(),
  selectionMode: false,
  onToggleSelectionMode: vi.fn(),
};

describe("ReplenishmentToolbar", () => {
  it("renders title and count badge", () => {
    renderWithProviders(<ReplenishmentToolbar {...baseProps} />);
    expect(screen.getByText("Reposição")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
  });

  it("shows loading state when isLoading with zero total", () => {
    renderWithProviders(
      <ReplenishmentToolbar {...baseProps} isLoading totalCount={0} />
    );
    expect(screen.getByText("carregando…")).toBeInTheDocument();
  });

  it("shows filtered/total when hasActiveFilters", () => {
    renderWithProviders(
      <ReplenishmentToolbar {...baseProps} hasActiveFilters />
    );
    expect(screen.getByText("/200")).toBeInTheDocument();
  });

  it("shows progress bar when loading with progress", () => {
    renderWithProviders(
      <ReplenishmentToolbar {...baseProps} isLoading loadingProgress={45} />
    );
    expect(screen.getByText("45%")).toBeInTheDocument();
  });

  it("toggles selection mode on button click", () => {
    const onToggle = vi.fn();
    renderWithProviders(
      <ReplenishmentToolbar {...baseProps} onToggleSelectionMode={onToggle} />
    );
    const btn = screen.getByRole("button", { pressed: false });
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("shows 'Cancelar' when selectionMode is true", () => {
    renderWithProviders(
      <ReplenishmentToolbar {...baseProps} selectionMode />
    );
    expect(screen.getByText("Cancelar")).toBeInTheDocument();
  });

  it("calls onSearchChange when typing in search", () => {
    const onSearch = vi.fn();
    renderWithProviders(
      <ReplenishmentToolbar {...baseProps} onSearchChange={onSearch} />
    );
    const inputs = screen.getAllByLabelText("Buscar reposições");
    fireEvent.change(inputs[0], { target: { value: "caneta" } });
    expect(onSearch).toHaveBeenCalledWith("caneta");
  });

  it("shows clear button when search has value", () => {
    renderWithProviders(
      <ReplenishmentToolbar {...baseProps} searchQuery="teste" hasActiveFilters />
    );
    expect(screen.getAllByLabelText("Limpar busca").length).toBeGreaterThan(0);
  });

  it("clears search on clear button click", () => {
    const onSearch = vi.fn();
    renderWithProviders(
      <ReplenishmentToolbar {...baseProps} searchQuery="teste" onSearchChange={onSearch} hasActiveFilters />
    );
    fireEvent.click(screen.getAllByLabelText("Limpar busca")[0]);
    expect(onSearch).toHaveBeenCalledWith("");
  });

  it("shows Limpar filters button when hasActiveFilters", () => {
    renderWithProviders(
      <ReplenishmentToolbar {...baseProps} hasActiveFilters />
    );
    expect(screen.getByLabelText("Limpar todos os filtros")).toBeInTheDocument();
  });

  it("calls onClearFilters on Limpar click", () => {
    const onClear = vi.fn();
    renderWithProviders(
      <ReplenishmentToolbar {...baseProps} hasActiveFilters onClearFilters={onClear} />
    );
    fireEvent.click(screen.getByLabelText("Limpar todos os filtros"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("shows active filter chips for search query", () => {
    renderWithProviders(
      <ReplenishmentToolbar {...baseProps} searchQuery="caneta" hasActiveFilters />
    );
    expect(screen.getByLabelText('Remover filtro: caneta')).toBeInTheDocument();
  });

  it("shows active filter chip for supplier", () => {
    renderWithProviders(
      <ReplenishmentToolbar {...baseProps} selectedSupplier="s1" hasActiveFilters />
    );
    expect(screen.getByLabelText("Remover filtro de fornecedor")).toBeInTheDocument();
    expect(screen.getByText("Fornecedor A")).toBeInTheDocument();
  });

  it("shows active filter chip for category", () => {
    renderWithProviders(
      <ReplenishmentToolbar {...baseProps} selectedCategory="c1" hasActiveFilters />
    );
    expect(screen.getByLabelText("Remover filtro de categoria")).toBeInTheDocument();
    expect(screen.getByText("Canetas")).toBeInTheDocument();
  });

  it("clears supplier chip on click", () => {
    const onSupplier = vi.fn();
    renderWithProviders(
      <ReplenishmentToolbar {...baseProps} selectedSupplier="s1" hasActiveFilters onSupplierChange={onSupplier} />
    );
    fireEvent.click(screen.getByLabelText("Remover filtro de fornecedor"));
    expect(onSupplier).toHaveBeenCalledWith("all");
  });

  it("clears category chip on click", () => {
    const onCategory = vi.fn();
    renderWithProviders(
      <ReplenishmentToolbar {...baseProps} selectedCategory="c1" hasActiveFilters onCategoryChange={onCategory} />
    );
    fireEvent.click(screen.getByLabelText("Remover filtro de categoria"));
    expect(onCategory).toHaveBeenCalledWith("all");
  });

  it("has correct aria roles for filter toolbar", () => {
    renderWithProviders(<ReplenishmentToolbar {...baseProps} />);
    expect(screen.getByRole("toolbar", { name: "Filtros de reposição" })).toBeInTheDocument();
  });

  it("has aria-label on filter selects", () => {
    renderWithProviders(<ReplenishmentToolbar {...baseProps} />);
    expect(screen.getByLabelText("Filtrar por fornecedor")).toBeInTheDocument();
    expect(screen.getByLabelText("Filtrar por categoria")).toBeInTheDocument();
    expect(screen.getByLabelText("Ordenar produtos")).toBeInTheDocument();
  });
});
