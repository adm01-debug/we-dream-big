import { describe, it, expect } from "vitest";
import { render, screen, type RenderOptions } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LastTestLine } from "@/components/admin/connections/LastTestLine";
import {
  makeTimeoutResult,
  makeNetworkResult,
  makeAuthResult,
  makeHttpResult,
  makeOkResult,
  toLastTestInfo,
} from "../_helpers/connection-fixtures";

// LastTestLine usa <Tooltip> interno que exige TooltipProvider acima.
// Embrulhamos o render para todos os casos do arquivo.
function renderWithProviders(ui: React.ReactElement, options?: RenderOptions) {
  return render(<TooltipProvider>{ui}</TooltipProvider>, options);
}

describe("LastTestLine", () => {
  it("Sucesso: mostra 'Verificado' e não exibe hint de erro", () => {
    renderWithProviders(<LastTestLine info={toLastTestInfo(makeOkResult())} />);
    expect(screen.getByText(/Verificado/)).toBeInTheDocument();
    expect(screen.queryByText(/Tempo esgotado/)).not.toBeInTheDocument();
  });

  it("Nunca verificado quando info é null", () => {
    renderWithProviders(<LastTestLine info={null} />);
    expect(screen.getByText(/Nunca verificado/)).toBeInTheDocument();
  });

  it("Timeout com timeout_ms exibe título, hint com '12000ms' e linha técnica", () => {
    renderWithProviders(<LastTestLine info={toLastTestInfo(makeTimeoutResult())} />);
    expect(screen.getByText(/Tempo esgotado/)).toBeInTheDocument();
    expect(screen.getAllByText(/12000ms/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/timeout 12000ms/)).toBeInTheDocument();
  });

  it("Network legacy (sem error_kind): infere e mostra 'Sem conexão'", () => {
    const info = toLastTestInfo(makeNetworkResult());
    info.error_kind = null;
    renderWithProviders(<LastTestLine info={info} />);
    expect(screen.getByText(/Sem conexão com o serviço/)).toBeInTheDocument();
  });

  it("Auth 401 legacy (sem error_kind): infere e mostra 'Credenciais rejeitadas'", () => {
    const info = toLastTestInfo(makeAuthResult());
    info.error_kind = null;
    renderWithProviders(<LastTestLine info={info} />);
    expect(screen.getByText(/Credenciais rejeitadas/)).toBeInTheDocument();
  });

  it("HTTP 504: title contém '504'", () => {
    renderWithProviders(<LastTestLine info={toLastTestInfo(makeHttpResult(504))} />);
    expect(screen.getByText(/Erro HTTP 504/)).toBeInTheDocument();
  });

  it("Tooltip: header tem title com detalhe técnico (HTTP + message)", () => {
    const { container } = renderWithProviders(<LastTestLine info={toLastTestInfo(makeHttpResult(504))} />);
    const titled = container.querySelector("span[title]");
    expect(titled).not.toBeNull();
    expect(titled!.getAttribute("title")).toContain("504");
  });
});
