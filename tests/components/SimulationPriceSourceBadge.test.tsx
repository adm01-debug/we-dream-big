/**
 * SimulationPriceSourceBadge — testes
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SimulationPriceSourceBadge } from "@/components/simulator/SimulationPriceSourceBadge";

const ISO = "2026-04-24T15:30:00.000Z";

describe("SimulationPriceSourceBadge", () => {
  it("renders official pill (rpc) with time", () => {
    render(
      <SimulationPriceSourceBadge priceSource="rpc" calculatedAt={ISO} />,
    );
    const el = screen.getByRole("status");
    expect(el).toBeTruthy();
    expect(el.className).toMatch(/emerald/);
    expect(el.textContent).toMatch(/Cálculo oficial/);
    // time format HH:mm pt-BR
    expect(el.textContent).toMatch(/\d{2}:\d{2}/);
  });

  it("renders amber fallback block with reason and CTA", () => {
    render(
      <SimulationPriceSourceBadge
        priceSource="legacy-fallback"
        calculatedAt={ISO}
        fallbackReason="RPC timeout"
      />,
    );
    const el = screen.getByRole("status");
    expect(el.className).toMatch(/amber/);
    expect(el.textContent).toMatch(/Estimativa/);
    expect(el.textContent).toMatch(/cálculo oficial indisponível/i);
    expect(el.textContent).toMatch(/RPC timeout/);
    expect(el.textContent).toMatch(/Confirme o valor antes de fechar o orçamento/);
    expect(el.textContent).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("renders nothing for unavailable", () => {
    const { container } = render(
      <SimulationPriceSourceBadge priceSource="unavailable" calculatedAt={ISO} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for rpc without calculatedAt unless alwaysShowOfficial", () => {
    const { container, rerender } = render(
      <SimulationPriceSourceBadge priceSource="rpc" />,
    );
    expect(container.firstChild).toBeNull();
    rerender(<SimulationPriceSourceBadge priceSource="rpc" alwaysShowOfficial />);
    expect(screen.getByRole("status")).toBeTruthy();
  });
});