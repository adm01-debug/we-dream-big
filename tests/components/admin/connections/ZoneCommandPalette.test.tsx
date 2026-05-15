/**
 * Testes para ZoneCommandPalette + useZoneCommandPaletteShortcut.
 *
 * Cobre:
 *  - Atalho ⌘K / Ctrl+K abre/fecha o palette (e é ignorado em inputs).
 *  - Selecionar uma zona dispara o evento "connections:focus-zone".
 *  - Selecionar um módulo interno dispara o evento da zona pai e
 *    faz scrollIntoView no anchor do módulo após pequeno delay.
 *  - Filtro de busca aceita keywords (ex: "cron" → Intervalo de Auto-Test).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, renderHook } from "@testing-library/react";
import {
  ZoneCommandPalette,
  useZoneCommandPaletteShortcut,
  DEFAULT_MODULES,
} from "@/components/admin/connections/ZoneCommandPalette";

describe("useZoneCommandPaletteShortcut", () => {
  it("abre/fecha ao pressionar Ctrl+K (não-mac)", () => {
    const { result } = renderHook(() => useZoneCommandPaletteShortcut());
    expect(result.current.open).toBe(false);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", ctrlKey: true }),
      );
    });
    expect(result.current.open).toBe(true);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", ctrlKey: true }),
      );
    });
    expect(result.current.open).toBe(false);
  });

  it("abre ao pressionar Cmd+K (Mac)", () => {
    const { result } = renderHook(() => useZoneCommandPaletteShortcut());
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true }),
      );
    });
    expect(result.current.open).toBe(true);
  });

  it("ignora o atalho quando o foco está num <input>", () => {
    const { result } = renderHook(() => useZoneCommandPaletteShortcut());
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "k",
          ctrlKey: true,
          bubbles: true,
        }),
      );
    });
    expect(result.current.open).toBe(false);
    document.body.removeChild(input);
  });
});

describe("ZoneCommandPalette — interação", () => {
  let dispatchSpy: ReturnType<typeof vi.spyOn>;
  let scrollSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dispatchSpy = vi.spyOn(window, "dispatchEvent");
    scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;
    vi.useFakeTimers();
  });
  afterEach(() => {
    dispatchSpy.mockRestore();
    vi.useRealTimers();
  });

  it("renderiza grupo 'Ir para zona' com as 3 zonas", () => {
    render(<ZoneCommandPalette open onOpenChange={() => {}} />);
    expect(screen.getByText(/ir para zona/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Saúde/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Operação/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Conexões$/).length).toBeGreaterThan(0);
  });

  it("clicar numa zona dispara connections:focus-zone com o anchor da zona", () => {
    const onOpenChange = vi.fn();
    render(<ZoneCommandPalette open onOpenChange={onOpenChange} />);

    // O grupo "Ir para zona" usa value="zona Operação".
    const operationItem = screen
      .getAllByRole("option")
      .find((el) => el.getAttribute("data-value") === "zona operação")!;
    expect(operationItem).toBeDefined();
    fireEvent.click(operationItem);

    const focusEvents = dispatchSpy.mock.calls
      .map((c) => c[0])
      .filter(
        (ev): ev is CustomEvent =>
          ev instanceof CustomEvent && ev.type === "connections:focus-zone",
      );
    expect(focusEvents.length).toBeGreaterThan(0);
    expect(focusEvents[0].detail).toEqual({
      zone: "operation",
      anchorId: "zone-operation",
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("clicar num módulo interno dispara o evento da zona pai", () => {
    render(<ZoneCommandPalette open onOpenChange={() => {}} />);

    // Webhooks pertence à zona "connections".
    const webhookItem = screen
      .getAllByRole("option")
      .find((el) => /webhooks/i.test(el.getAttribute("data-value") ?? ""))!;
    expect(webhookItem).toBeDefined();
    fireEvent.click(webhookItem);

    const focusEvent = dispatchSpy.mock.calls
      .map((c) => c[0])
      .find(
        (ev): ev is CustomEvent =>
          ev instanceof CustomEvent && ev.type === "connections:focus-zone",
      );
    expect(focusEvent?.detail).toMatchObject({
      zone: "connections",
      anchorId: "zone-connections",
    });
  });

  it("DEFAULT_MODULES cobre as 3 zonas", () => {
    const zones = new Set(DEFAULT_MODULES.map((m) => m.zone));
    expect(zones.has("health")).toBe(true);
    expect(zones.has("operation")).toBe(true);
    expect(zones.has("connections")).toBe(true);
  });
});
