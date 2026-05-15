import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MaskedSuffixBadge } from "@/components/admin/connections/MaskedSuffixBadge";

function renderBadge(props: React.ComponentProps<typeof MaskedSuffixBadge>) {
  return render(
    <TooltipProvider>
      <MaskedSuffixBadge {...props} />
    </TooltipProvider>,
  );
}

describe("MaskedSuffixBadge — UI por tamanho de sufixo", () => {
  it("0 chars (missing) sem length → mostra '••••????' + label 'Sufixo ausente' + aria com instrução de re-salvar", () => {
    renderBadge({ suffix: null, secretName: "MY_SECRET" });
    expect(screen.getByText("••••????")).toBeInTheDocument();
    expect(screen.getByText(/Sufixo ausente/)).toBeInTheDocument();
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-label")).toContain("Atualizar credencial");
    expect(status.getAttribute("aria-label")).toContain('"MY_SECRET"');
    // Indicador de fallback aparece quando suffix está ausente
    expect(screen.getByText("fallback")).toBeInTheDocument();
  });

  it("0 chars + length=12 → mostra placeholder derivado '••••L=12'", () => {
    renderBadge({ suffix: null, length: 12 });
    expect(screen.getByText("••••L=12")).toBeInTheDocument();
    expect(screen.getByText("fallback")).toBeInTheDocument();
  });

  it("0 chars + length=5 → '••••L=05' (padding zero)", () => {
    renderBadge({ suffix: "", length: 5 });
    expect(screen.getByText("••••L=05")).toBeInTheDocument();
  });

  it("0 chars + length=200 → '••••L99+' (abreviação para >=100)", () => {
    renderBadge({ suffix: null, length: 200 });
    expect(screen.getByText("••••L99+")).toBeInTheDocument();
  });

  it("1 char (short) → '••••••••a' equivalente, label '(1/4)'", () => {
    renderBadge({ suffix: "a" });
    expect(screen.getByText("••••" + "•••a")).toBeInTheDocument();
    expect(screen.getByText(/Sufixo curto \(1\/4\)/)).toBeInTheDocument();
    // Não é fallback derivado — temos info real (1 char)
    expect(screen.queryByText("fallback")).not.toBeInTheDocument();
  });

  it("2 chars (short) → '••••••ab' + label '(2/4)' + aria com '2 caracteres' (plural)", () => {
    renderBadge({ suffix: "ab" });
    expect(screen.getByText("••••••ab")).toBeInTheDocument();
    expect(screen.getByText(/Sufixo curto \(2\/4\)/)).toBeInTheDocument();
    const aria = screen.getByRole("status").getAttribute("aria-label") ?? "";
    expect(aria).toContain("2 caracteres");
    expect(aria).not.toContain("2 caractere ");
  });

  it("3 chars (short) → '•••••abc' + label '(3/4)'", () => {
    renderBadge({ suffix: "abc" });
    expect(screen.getByText("•••••abc")).toBeInTheDocument();
    expect(screen.getByText(/Sufixo curto \(3\/4\)/)).toBeInTheDocument();
  });

  it("4 chars (valid) → renderiza só o sufixo sem chip de aviso", () => {
    const { container } = renderBadge({ suffix: "abcd" });
    expect(screen.getByText("••••abcd")).toBeInTheDocument();
    // Sem role="status" porque é o caminho "limpo"
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(screen.queryByText(/Sufixo curto/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sufixo ausente/)).not.toBeInTheDocument();
  });

  it(">4 chars (valid) → mostra apenas os últimos 4: '••••efgh'", () => {
    renderBadge({ suffix: "abcdefgh" });
    expect(screen.getByText("••••efgh")).toBeInTheDocument();
  });

  it("4 chars (valid) com showWhenValid → mostra chip verde com 'Sufixo OK'", () => {
    renderBadge({ suffix: "abcd", showWhenValid: true });
    expect(screen.getByText(/Sufixo OK/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("showSuffix=false oculta o sufixo no caminho válido", () => {
    const { container } = renderBadge({ suffix: "abcd", showSuffix: false });
    expect(container.textContent).toBe("");
  });
});
