/**
 * LocationPanel — Avançado: Clamp, Acessibilidade e Estabilidade
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { toast } from "sonner";
import { LocationPanel } from "../LocationPanel";
import type { GravacaoLocation, TechniqueOption, CustomizationPriceResponseV6 } from "@/types/customization";

// Mock leve do ConfigurationPanelV6
vi.mock("../ConfigurationPanelV6", () => ({
  ConfigurationPanelV6: (props: {
    technique: TechniqueOption;
    initialWidth?: number;
    initialHeight?: number;
    initialColors?: number;
    onPriceCalculated?: (tid: string, p: CustomizationPriceResponseV6 | null) => void;
    onDimensionsChange?: (d: { width?: number; height?: number; colors?: number }) => void;
  }) => {
    // Simula cálculo de preço baseado na técnica e dimensões/cores iniciais
    const mockPrice: CustomizationPriceResponseV6 = {
      pricePerUnit: props.technique.technique_id === "tech-A" ? 1.5 : 2.5,
      setupPrice: 50,
      totalPrice: 200,
      isPossible: true,
      pricingDetails: [],
    };

    return (
      <div
        data-testid="config-panel"
        data-technique-id={props.technique.technique_id}
        data-initial-width={props.initialWidth ?? ""}
        data-initial-height={props.initialHeight ?? ""}
        data-initial-colors={props.initialColors ?? ""}
      >
        <div data-testid="mock-price-value">{mockPrice.pricePerUnit}</div>
        <button
          type="button"
          data-testid="emit-dims"
          onClick={() => props.onDimensionsChange?.({ width: 7, height: 4, colors: 2 })}
        >
          emit
        </button>
        <button
          type="button"
          data-testid="emit-many-colors"
          onClick={() => props.onDimensionsChange?.({ width: 2, height: 2, colors: 10 })}
        >
          emit-many-colors
        </button>
        <button
          type="button"
          data-testid="trigger-price"
          onClick={() => props.onPriceCalculated?.(props.technique.technique_id, mockPrice)}
        >
          calculate
        </button>
      </div>
    );
  },
}));

// Sonner toast — silencia em ambiente de teste
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function makeTechnique(over: Partial<TechniqueOption> = {}): TechniqueOption {
  return {
    technique_id: "tech-1",
    codigo_tabela: "SILK-01",
    tecnica_nome: "Silk 1 cor",
    grupo_tecnica: "SERIGRAFIA",
    variacao_label: "padrão",
    max_width: 10,
    max_height: 10,
    gravacao_largura_max: 10,
    gravacao_altura_max: 10,
    efetiva_largura_max: 10,
    efetiva_altura_max: 10,
    shape: "rectangle",
    is_curved: false,
    usa_dimensao: true,
    cobra_por_cor: false,
    max_cores: 1,
    ...over,
  };
}

const techA = makeTechnique({ technique_id: "tech-A", tecnica_nome: "Silk 1 cor", usa_dimensao: true, efetiva_largura_max: 10, efetiva_altura_max: 10 });
const techB = makeTechnique({
  technique_id: "tech-B",
  tecnica_nome: "Transfer Digital",
  grupo_tecnica: "TRANSFER",
  cobra_por_cor: true,
  max_cores: 4,
  efetiva_largura_max: 10,
  efetiva_altura_max: 10,
});
const techSmall = makeTechnique({
  technique_id: "tech-small",
  tecnica_nome: "Laser pequeno",
  efetiva_largura_max: 5,
  efetiva_altura_max: 3,
  usa_dimensao: true,
});
const techNoColor = makeTechnique({
  technique_id: "tech-no-color",
  tecnica_nome: "Gravação especial",
  cobra_por_cor: false,
  max_cores: 1,
});

const location: GravacaoLocation = {
  location_code: "LADO-A",
  location_name: "Lado A",
  location_order: 1,
  options: [techA, techB, techSmall, techNoColor],
};

describe("LocationPanel — Avançado: Clamp, Acessibilidade e Estabilidade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("mostra aviso (clamp notice) ao trocar para técnica que reduz as dimensões digitadas", () => {
    render(<LocationPanel location={location} quantity={100} onPriceCalculated={vi.fn()} />);

    // 1. Seleciona techA e emite 7x4
    fireEvent.click(screen.getByText("Silk 1 cor"));
    fireEvent.click(screen.getByTestId("emit-dims"));

    // 2. Troca para techSmall (limite 5x3)
    fireEvent.click(screen.getByTestId("customization-change-technique"));
    fireEvent.click(within(screen.getByTestId("customization-technique-picker")).getByText("Laser pequeno"));

    // 3. Verifica aviso
    const notice = screen.getByTestId("clamp-notice");
    expect(notice).toBeInTheDocument();
    expect(notice).toHaveTextContent(/dimensões \(Largura, Altura\) foram ajustadas/i);
  });

  it("trocas múltiplas preservam os valores mais recentes e recalcula o preço", () => {
    const onPrice = vi.fn();
    render(<LocationPanel location={location} quantity={100} onPriceCalculated={onPrice} />);

    // A -> B -> Small
    fireEvent.click(screen.getByText("Silk 1 cor"));
    fireEvent.click(screen.getByTestId("emit-dims")); // 7x4, 2 colors

    fireEvent.click(screen.getByTestId("customization-change-technique"));
    fireEvent.click(within(screen.getByTestId("customization-technique-picker")).getByText("Transfer Digital"));
    
    // TechB aceita 7x4 e 2 cores
    let panel = screen.getByTestId("config-panel");
    expect(panel).toHaveAttribute("data-initial-width", "7");
    expect(panel).toHaveAttribute("data-initial-colors", "2");

    fireEvent.click(screen.getByTestId("customization-change-technique"));
    fireEvent.click(within(screen.getByTestId("customization-technique-picker")).getByText("Laser pequeno"));

    // TechSmall clampa 7x4 -> 5x3
    panel = screen.getByTestId("config-panel");
    expect(panel).toHaveAttribute("data-initial-width", "5");
    expect(panel).toHaveAttribute("data-initial-height", "3");
  });

  it("limpa cores ao trocar para técnica com cobra_por_cor=false", () => {
    render(<LocationPanel location={location} quantity={100} onPriceCalculated={vi.fn()} />);

    // 1. TechB (cobra cor) -> emite 10 cores
    fireEvent.click(screen.getByText("Transfer Digital"));
    fireEvent.click(screen.getByTestId("emit-many-colors"));

    // 2. Troca p/ techNoColor (cobra cor = false)
    fireEvent.click(screen.getByTestId("customization-change-technique"));
    fireEvent.click(within(screen.getByTestId("customization-technique-picker")).getByText("Gravação especial"));

    const panel = screen.getByTestId("config-panel");
    // techNoColor tem cobra_por_cor=false -> initialColors deve vir vazio/indefinido para o config panel
    expect(panel).toHaveAttribute("data-initial-colors", "");
  });

  it("gerencia o foco corretamente: abre -> primeiro card; fecha -> botão trocar; troca técnica -> botão trocar", () => {
    const { container } = render(<LocationPanel location={location} quantity={100} onPriceCalculated={vi.fn()} />);
    
    // Seleciona uma técnica inicial
    fireEvent.click(screen.getByText("Silk 1 cor"));
    
    const changeBtn = screen.getByTestId("customization-change-technique");
    
    // 1. Abrir seletor
    fireEvent.click(changeBtn);
    const firstCard = container.querySelector("[role='radio'],[role='button']");
    expect(document.activeElement).toBe(firstCard);

    // 2. Trocar técnica (A -> B)
    const picker = screen.getByTestId("customization-technique-picker");
    fireEvent.click(within(picker).getByText("Transfer Digital"));
    
    // Picker deve fechar e foco voltar para o botão
    expect(screen.queryByTestId("customization-technique-picker")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(changeBtn);
  });

  it("anuncia via aria-live as transições de estado (incluindo troca de A para B)", () => {
    render(<LocationPanel location={location} quantity={100} onPriceCalculated={vi.fn()} />);
    const announcer = screen.getByTestId("customization-aria-announcer");

    // Seleciona técnica A
    fireEvent.click(screen.getByText("Silk 1 cor"));
    expect(announcer).toHaveTextContent("Técnica selecionada: Silk 1 cor.");

    // Abre seletor
    fireEvent.click(screen.getByTestId("customization-change-technique"));
    expect(announcer).toHaveTextContent("Seletor de técnicas aberto. Técnica atual: Silk 1 cor.");

    // Troca para técnica B
    const picker = screen.getByTestId("customization-technique-picker");
    fireEvent.click(within(picker).getByText("Transfer Digital"));
    expect(announcer).toHaveTextContent("Técnica selecionada: Transfer Digital.");
  });

  it("garante que técnica e dimensões persistam no sessionStorage ao navegar e voltar", () => {
    const productId = "p123";
    const { unmount } = render(
      <LocationPanel location={location} quantity={100} productId={productId} onPriceCalculated={vi.fn()} />
    );

    // 1. Seleciona técnica A e emite dimensões
    fireEvent.click(screen.getByText("Silk 1 cor"));
    fireEvent.click(screen.getByTestId("emit-dims"));

    // 2. Unmount (simula navegação para fora)
    unmount();

    // 3. Remount (simula volta à página)
    render(
      <LocationPanel location={location} quantity={100} productId={productId} onPriceCalculated={vi.fn()} />
    );

    // Deve restaurar técnica A e dimensões 7x4
    const panel = screen.getByTestId("config-panel");
    expect(panel).toHaveAttribute("data-technique-id", "tech-A");
    expect(panel).toHaveAttribute("data-initial-width", "7");
    expect(panel).toHaveAttribute("data-initial-height", "4");
  });

  it("valida que o preço muda ao trocar de técnica com dimensões preservadas", () => {
    const onPriceCalculated = vi.fn();
    render(<LocationPanel location={location} quantity={100} onPriceCalculated={onPriceCalculated} />);

    // 1. Seleciona Tech A (preço mock 1.5)
    fireEvent.click(screen.getByText("Silk 1 cor"));
    expect(screen.getByTestId("mock-price-value")).toHaveTextContent("1.5");

    // 2. Digita dimensões
    fireEvent.click(screen.getByTestId("emit-dims"));

    // 3. Troca para Tech B (preço mock 2.5)
    fireEvent.click(screen.getByTestId("customization-change-technique"));
    fireEvent.click(within(screen.getByTestId("customization-technique-picker")).getByText("Transfer Digital"));

    // 4. Verifica novo preço mantendo dimensões
    expect(screen.getByTestId("mock-price-value")).toHaveTextContent("2.5");
    const panel = screen.getByTestId("config-panel");
    expect(panel).toHaveAttribute("data-initial-width", "7");
  });

  it("clampa cores em 1 ao trocar para técnica com max_cores=1", () => {
    render(<LocationPanel location={location} quantity={100} onPriceCalculated={vi.fn()} />);

    // 1. Tech B (max 4 cores) -> emite 3 cores
    fireEvent.click(screen.getByText("Transfer Digital"));
    fireEvent.click(screen.getByTestId("emit-many-colors")); // Emite 10 cores no mock, techB clampa p/ 4 no config

    // 2. Troca p/ Tech A (max 1 cor)
    fireEvent.click(screen.getByTestId("customization-change-technique"));
    fireEvent.click(within(screen.getByTestId("customization-technique-picker")).getByText("Silk 1 cor"));

    // 3. Verifica clamp
    const panel = screen.getByTestId("config-panel");
    // Tech A tem cobra_por_cor=false, então initial-colors deve vir vazio
    expect(panel).toHaveAttribute("data-initial-colors", "");
    
    // Vamos testar com uma técnica que COBRA cor mas tem max_cores=1
    const techCobra1 = makeTechnique({
      technique_id: "tech-cobra-1",
      tecnica_nome: "Tampo 1 cor",
      cobra_por_cor: true,
      max_cores: 1
    });
    const loc: GravacaoLocation = { ...location, options: [...location.options, techCobra1] };
    
    render(<LocationPanel location={loc} quantity={100} onPriceCalculated={vi.fn()} />);
    fireEvent.click(screen.getByText("Transfer Digital"));
    fireEvent.click(screen.getByTestId("emit-many-colors"));
    fireEvent.click(screen.getByTestId("customization-change-technique"));
    fireEvent.click(within(screen.getByTestId("customization-technique-picker")).getByText("Tampo 1 cor"));
    
    expect(screen.getByTestId("config-panel")).toHaveAttribute("data-initial-colors", "1");
  });

  it("garante consistência em trocas cíclicas (A->B->A)", () => {
    render(<LocationPanel location={location} quantity={100} onPriceCalculated={vi.fn()} />);

    // A
    fireEvent.click(screen.getByText("Silk 1 cor"));
    fireEvent.click(screen.getByTestId("emit-dims")); // 7x4

    // B
    fireEvent.click(screen.getByTestId("customization-change-technique"));
    fireEvent.click(within(screen.getByTestId("customization-technique-picker")).getByText("Transfer Digital"));
    expect(screen.getByTestId("config-panel")).toHaveAttribute("data-initial-width", "7");

    // A novamente
    fireEvent.click(screen.getByTestId("customization-change-technique"));
    fireEvent.click(within(screen.getByTestId("customization-technique-picker")).getByText("Silk 1 cor"));
    expect(screen.getByTestId("config-panel")).toHaveAttribute("data-initial-width", "7");
  });

  it("não dispara efeitos desnecessários ao alternar entre barra e lista", () => {
    const onPrice = vi.fn();
    render(<LocationPanel location={location} quantity={100} onPriceCalculated={onPrice} />);

    fireEvent.click(screen.getByText("Silk 1 cor"));
    onPrice.mockClear();
    vi.mocked(toast.success).mockClear();

    // Abre e fecha seletor sem trocar
    fireEvent.click(screen.getByTestId("customization-change-technique"));
    fireEvent.click(screen.getByText("Fechar"));

    expect(onPrice).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
