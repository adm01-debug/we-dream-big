/**
 * Testes para ZoneSection — colapso, acessibilidade e integração com actions.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Activity } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ZoneSection } from "@/components/admin/connections/ZoneSection";

function renderZone(props: Partial<React.ComponentProps<typeof ZoneSection>> = {}) {
  return render(
    <TooltipProvider>
      <ZoneSection
        id="zone-test"
        icon={Activity}
        title="Zona Teste"
        description="Descrição da zona"
        {...props}
      >
        <div data-testid="zone-content">Conteúdo interno</div>
      </ZoneSection>
    </TooltipProvider>,
  );
}

describe("ZoneSection — colapso", () => {
  it("renderiza conteúdo visível quando expandido (default)", () => {
    renderZone();
    const content = screen.getByTestId("zone-content");
    expect(content).toBeInTheDocument();
    const wrapper = content.parentElement!;
    expect(wrapper).not.toHaveAttribute("hidden");
  });

  it("oculta conteúdo via atributo hidden quando collapsed=true", () => {
    renderZone({ collapsed: true, onToggleCollapse: () => {} });
    const content = screen.getByTestId("zone-content");
    const wrapper = content.parentElement!;
    expect(wrapper).toHaveAttribute("hidden");
    expect(wrapper).toHaveAttribute("id", "zone-test-content");
  });

  it("não renderiza botão de toggle se onToggleCollapse não for fornecido", () => {
    renderZone();
    expect(
      screen.queryByRole("button", { name: /colapsar|expandir/i }),
    ).not.toBeInTheDocument();
  });

  it("aria-expanded reflete o estado (true expandido / false colapsado)", () => {
    const { rerender } = renderZone({
      collapsed: false,
      onToggleCollapse: () => {},
    });
    let btn = screen.getByRole("button", { name: /colapsar zona teste/i });
    expect(btn).toHaveAttribute("aria-expanded", "true");

    rerender(
      <TooltipProvider>
        <ZoneSection
          id="zone-test"
          icon={Activity}
          title="Zona Teste"
          collapsed
          onToggleCollapse={() => {}}
        >
          <div data-testid="zone-content">x</div>
        </ZoneSection>
      </TooltipProvider>,
    );
    btn = screen.getByRole("button", { name: /expandir zona teste/i });
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("aria-controls aponta para o id do wrapper de conteúdo", () => {
    renderZone({ collapsed: false, onToggleCollapse: () => {} });
    const btn = screen.getByRole("button", { name: /colapsar zona teste/i });
    expect(btn).toHaveAttribute("aria-controls", "zone-test-content");
  });

  it("dispara onToggleCollapse ao clicar no botão", () => {
    const onToggle = vi.fn();
    renderZone({ collapsed: false, onToggleCollapse: onToggle });
    fireEvent.click(screen.getByRole("button", { name: /colapsar zona teste/i }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("mantém header (título) visível mesmo quando colapsada", () => {
    renderZone({ collapsed: true, onToggleCollapse: () => {} });
    expect(screen.getByRole("heading", { name: "Zona Teste" })).toBeVisible();
  });

  it("renderiza actions junto do botão de toggle sem conflito", () => {
    renderZone({
      collapsed: false,
      onToggleCollapse: () => {},
      actions: <button type="button">Refresh</button>,
    });
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /colapsar zona teste/i }),
    ).toBeInTheDocument();
  });

  it("aplica classes de highlight quando highlight=true", () => {
    const { container } = renderZone({ highlight: true });
    const section = container.querySelector("section#zone-test")!;
    expect(section.className).toContain("ring-2");
  });
});
