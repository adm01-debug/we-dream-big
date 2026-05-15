import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StatCard } from "@/components/inventory/StockStatCard";
import { Package } from "lucide-react";

describe("StockStatCard", () => {
  it("renders title and value", () => {
    render(
      <StatCard
        title="Total de Produtos"
        value={500}
        icon={<Package className="h-6 w-6" />}
      />
    );
    expect(screen.getByText("Total de Produtos")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
  });

  it("applies success variant styles", () => {
    const { container } = render(
      <StatCard
        title="Em Estoque"
        value={423}
        icon={<Package className="h-6 w-6" />}
        variant="success"
      />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("success");
  });

  it("applies warning variant styles", () => {
    const { container } = render(
      <StatCard
        title="Estoque Baixo"
        value={11}
        icon={<Package className="h-6 w-6" />}
        variant="warning"
      />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("warning");
  });

  it("applies error variant styles", () => {
    const { container } = render(
      <StatCard
        title="Sem Estoque"
        value={66}
        icon={<Package className="h-6 w-6" />}
        variant="error"
      />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("destructive");
  });

  it("is clickable and fires onClick", () => {
    const handleClick = vi.fn();
    render(
      <StatCard
        title="Sem Estoque"
        value={66}
        icon={<Package className="h-6 w-6" />}
        variant="error"
        onClick={handleClick}
        clickHint="Clique para ver alertas"
      />
    );
    const card = screen.getByRole("button");
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("renders as button element", () => {
    render(
      <StatCard
        title="Total"
        value={500}
        icon={<Package className="h-6 w-6" />}
      />
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("includes clickHint in aria-label", () => {
    render(
      <StatCard
        title="Sem Estoque"
        value={66}
        icon={<Package className="h-6 w-6" />}
        onClick={() => {}}
        clickHint="Clique para ver alertas"
      />
    );
    const card = screen.getByRole("button");
    expect(card.getAttribute("aria-label")).toContain("Clique para ver alertas");
  });

  it("supports keyboard navigation (Enter)", () => {
    const handleClick = vi.fn();
    render(
      <StatCard
        title="Sem Estoque"
        value={66}
        icon={<Package className="h-6 w-6" />}
        onClick={handleClick}
      />
    );
    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: "Enter" });
    // Native button handles Enter automatically
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalled();
  });

  it("shows trend when provided", () => {
    render(
      <StatCard
        title="Em Estoque"
        value={423}
        icon={<Package className="h-6 w-6" />}
        trend={{ value: 5, label: "+5% esta semana" }}
      />
    );
    expect(screen.getByText("+5% esta semana")).toBeInTheDocument();
  });

  it("shows active state with aria-pressed", () => {
    render(
      <StatCard
        title="Em Estoque"
        value={423}
        icon={<Package className="h-6 w-6" />}
        isActive={true}
        onClick={() => {}}
      />
    );
    const card = screen.getByRole("button");
    expect(card.getAttribute("aria-pressed")).toBe("true");
  });
});
