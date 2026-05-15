import { describe, it, expect, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "./render-helpers";
import { BulkSelectionBar } from "@/components/common/BulkSelectionBar";

const baseProps = {
  isActive: true,
  selectedCount: 3,
  label: "3 produtos selecionados",
  onClear: vi.fn(),
  actions: <button data-testid="bulk-action">Ação</button>,
};

describe("BulkSelectionBar", () => {
  it("renders when isActive is true", () => {
    renderWithProviders(<BulkSelectionBar {...baseProps} />);
    expect(screen.getByText("3 produtos selecionados")).toBeInTheDocument();
  });

  it("does not render when isActive is false", () => {
    renderWithProviders(<BulkSelectionBar {...baseProps} isActive={false} />);
    expect(screen.queryByText("3 produtos selecionados")).not.toBeInTheDocument();
  });

  it("shows selected count badge", () => {
    renderWithProviders(<BulkSelectionBar {...baseProps} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders subtitle when provided", () => {
    renderWithProviders(
      <BulkSelectionBar {...baseProps} subtitle="Itens para reposição" />
    );
    expect(screen.getByText("Itens para reposição")).toBeInTheDocument();
  });

  it("does not render subtitle when not provided", () => {
    renderWithProviders(<BulkSelectionBar {...baseProps} />);
    expect(screen.queryByText("Itens para reposição")).not.toBeInTheDocument();
  });

  it("renders action buttons", () => {
    renderWithProviders(<BulkSelectionBar {...baseProps} />);
    expect(screen.getByTestId("bulk-action")).toBeInTheDocument();
  });

  it("calls onClear when Limpar is clicked", () => {
    const onClear = vi.fn();
    renderWithProviders(<BulkSelectionBar {...baseProps} onClear={onClear} />);
    fireEvent.click(screen.getByText("Limpar"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("shows Selecionar Todos when selectedCount < totalCount", () => {
    const onSelectAll = vi.fn();
    renderWithProviders(
      <BulkSelectionBar
        {...baseProps}
        totalCount={10}
        onSelectAll={onSelectAll}
      />
    );
    expect(screen.getByText("Selecionar Todos")).toBeInTheDocument();
  });

  it("hides Selecionar Todos when all are selected", () => {
    renderWithProviders(
      <BulkSelectionBar
        {...baseProps}
        selectedCount={10}
        totalCount={10}
        onSelectAll={vi.fn()}
      />
    );
    expect(screen.queryByText("Selecionar Todos")).not.toBeInTheDocument();
  });

  it("calls onSelectAll when button is clicked", () => {
    const onSelectAll = vi.fn();
    renderWithProviders(
      <BulkSelectionBar
        {...baseProps}
        totalCount={10}
        onSelectAll={onSelectAll}
      />
    );
    fireEvent.click(screen.getByText("Selecionar Todos"));
    expect(onSelectAll).toHaveBeenCalledTimes(1);
  });

  it("does not show Selecionar Todos without onSelectAll", () => {
    renderWithProviders(
      <BulkSelectionBar {...baseProps} totalCount={10} />
    );
    expect(screen.queryByText("Selecionar Todos")).not.toBeInTheDocument();
  });

  it("does not show Selecionar Todos without totalCount", () => {
    renderWithProviders(
      <BulkSelectionBar {...baseProps} onSelectAll={vi.fn()} />
    );
    expect(screen.queryByText("Selecionar Todos")).not.toBeInTheDocument();
  });

  it("updates count dynamically", () => {
    const { rerender } = renderWithProviders(
      <BulkSelectionBar {...baseProps} selectedCount={1} label="1 produto selecionado" />
    );
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
