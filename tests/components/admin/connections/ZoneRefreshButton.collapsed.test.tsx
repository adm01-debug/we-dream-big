/**
 * Testes de integração — ZoneRefreshButton continua funcional quando a zona está colapsada.
 *
 * Garante que:
 *  1. O botão permanece clicável dentro do header (que segue visível mesmo
 *     com a zona colapsada — o atributo `hidden` afeta apenas o wrapper de conteúdo).
 *  2. O clique invalida as queryKeys mesmo com `collapsed=true`.
 *  3. O spinner aparece (label muda para "Atualizando…") durante o refresh.
 *  4. O callback `onRefresh` dispara normalmente.
 *  5. As actions do header NÃO recebem o atributo `hidden` (ficam acessíveis).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Activity } from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ZoneSection } from "@/components/admin/connections/ZoneSection";
import { ZoneRefreshButton } from "@/components/admin/connections/ZoneRefreshButton";

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

function setup(opts: {
  collapsed: boolean;
  onRefresh?: () => void;
}) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(qc, "invalidateQueries");

  const utils = render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <ZoneSection
          id="zone-test"
          icon={Activity}
          title="Zona Teste"
          collapsed={opts.collapsed}
          onToggleCollapse={() => {}}
          actions={
            <ZoneRefreshButton
              label="Atualizar zona Teste"
              successMessage="Atualizada"
              queryKeys={[["zone-test-data"]]}
              onRefresh={opts.onRefresh}
            />
          }
        >
          <div data-testid="zone-content">conteúdo pesado</div>
        </ZoneSection>
      </TooltipProvider>
    </QueryClientProvider>,
  );

  return { ...utils, qc, invalidateSpy };
}

describe("ZoneRefreshButton — interação com zona colapsada", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("o botão de refresh permanece visível e clicável quando a zona está colapsada", () => {
    setup({ collapsed: true });

    const refreshBtn = screen.getByRole("button", { name: /atualizar zona teste/i });
    expect(refreshBtn).toBeVisible();
    expect(refreshBtn).not.toBeDisabled();

    // Sanity: o conteúdo da zona está oculto, mas o botão (que vive no header) não.
    const content = screen.getByTestId("zone-content");
    expect(content.parentElement).toHaveAttribute("hidden");
  });

  it("invalida queryKeys mesmo com a zona colapsada", async () => {
    const { invalidateSpy } = setup({ collapsed: true });

    fireEvent.click(screen.getByRole("button", { name: /atualizar zona teste/i }));

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["zone-test-data"] });
    });
  });

  it("exibe estado de loading (texto + spinner) durante o refresh com zona colapsada", async () => {
    setup({ collapsed: true });

    const btn = screen.getByRole("button", { name: /atualizar zona teste/i });
    fireEvent.click(btn);

    // Imediatamente após o clique, label vira "Atualizando…" e botão fica disabled.
    await waitFor(() => {
      expect(btn).toBeDisabled();
      expect(btn.textContent).toMatch(/Atualizando/i);
    });

    // O ícone recebe a classe animate-spin.
    const spinner = btn.querySelector("svg");
    expect(spinner?.getAttribute("class")).toMatch(/animate-spin/);

    // Eventualmente volta ao estado idle.
    await waitFor(
      () => {
        expect(btn).not.toBeDisabled();
        expect(btn.textContent).toMatch(/Atualizar(?!ndo)/i);
      },
      { timeout: 1500 },
    );
  });

  it("dispara o callback onRefresh mesmo com a zona colapsada", async () => {
    const onRefresh = vi.fn();
    setup({ collapsed: true, onRefresh });

    fireEvent.click(screen.getByRole("button", { name: /atualizar zona teste/i }));

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it("o container de actions do header NÃO herda o atributo hidden da zona colapsada", () => {
    setup({ collapsed: true });

    const refreshBtn = screen.getByRole("button", { name: /atualizar zona teste/i });
    // Sobe a árvore procurando algum ancestral com `hidden`. Não deve haver.
    let node: HTMLElement | null = refreshBtn;
    while (node && node !== document.body) {
      expect(node.hasAttribute("hidden")).toBe(false);
      node = node.parentElement;
    }
  });

  it("comportamento idêntico quando a zona está expandida (regressão)", async () => {
    const onRefresh = vi.fn();
    const { invalidateSpy } = setup({ collapsed: false, onRefresh });

    const btn = screen.getByRole("button", { name: /atualizar zona teste/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["zone-test-data"] });
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });
  });
});
