/**
 * Testes para useZoneCollapse — colapso/expansão por zona com persistência em localStorage.
 *
 * Atualizado para incluir a 4ª zona "ai-router" (Onda 14 + AI Router).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useZoneCollapse } from "@/components/admin/connections/useZoneCollapse";

const STORAGE_KEY = "connections.zone-collapse.v1";

describe("useZoneCollapse", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("inicia com todas as zonas expandidas (collapsed=false) por padrão", () => {
    const { result } = renderHook(() => useZoneCollapse());
    expect(result.current.collapsed).toEqual({
      health: false,
      operation: false,
      connections: false,
      "ai-router": false,
    });
  });

  it("toggle alterna o estado de uma zona específica sem afetar as outras", () => {
    const { result } = renderHook(() => useZoneCollapse());
    act(() => result.current.toggle("health"));
    expect(result.current.collapsed.health).toBe(true);
    expect(result.current.collapsed.operation).toBe(false);
    expect(result.current.collapsed.connections).toBe(false);
    expect(result.current.collapsed["ai-router"]).toBe(false);

    act(() => result.current.toggle("health"));
    expect(result.current.collapsed.health).toBe(false);
  });

  it("expand reabre uma zona colapsada e é no-op se já expandida (preserva referência)", () => {
    const { result } = renderHook(() => useZoneCollapse());
    act(() => result.current.toggle("operation"));
    expect(result.current.collapsed.operation).toBe(true);

    act(() => result.current.expand("operation"));
    expect(result.current.collapsed.operation).toBe(false);

    const prev = result.current.collapsed;
    act(() => result.current.expand("operation"));
    expect(result.current.collapsed).toBe(prev);
  });

  it("collapseAll colapsa todas; expandAll reabre todas", () => {
    const { result } = renderHook(() => useZoneCollapse());
    act(() => result.current.collapseAll());
    expect(result.current.collapsed).toEqual({
      health: true,
      operation: true,
      connections: true,
      "ai-router": true,
    });

    act(() => result.current.expandAll());
    expect(result.current.collapsed).toEqual({
      health: false,
      operation: false,
      connections: false,
      "ai-router": false,
    });
  });

  it("persiste o estado em localStorage após cada mudança", () => {
    const { result } = renderHook(() => useZoneCollapse());
    act(() => result.current.toggle("connections"));

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual({
      health: false,
      operation: false,
      connections: true,
      "ai-router": false,
    });
  });

  it("recupera o estado persistido em uma nova instância (volta com mesmo layout)", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        health: true,
        operation: false,
        connections: true,
        "ai-router": false,
      }),
    );
    const { result } = renderHook(() => useZoneCollapse());
    expect(result.current.collapsed).toEqual({
      health: true,
      operation: false,
      connections: true,
      "ai-router": false,
    });
  });

  it("é resiliente a JSON inválido em localStorage (fallback para todas expandidas)", () => {
    localStorage.setItem(STORAGE_KEY, "not-json{{");
    const { result } = renderHook(() => useZoneCollapse());
    expect(result.current.collapsed).toEqual({
      health: false,
      operation: false,
      connections: false,
      "ai-router": false,
    });
  });

  it("merge correto quando o JSON persistido tem apenas chaves parciais", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ health: true }));
    const { result } = renderHook(() => useZoneCollapse());
    expect(result.current.collapsed).toEqual({
      health: true,
      operation: false,
      connections: false,
      "ai-router": false,
    });
  });

  it("permite colapsar TODAS simultaneamente (sem guarda, diferente de visibility)", () => {
    const { result } = renderHook(() => useZoneCollapse());
    act(() => {
      result.current.toggle("health");
      result.current.toggle("operation");
      result.current.toggle("connections");
      result.current.toggle("ai-router");
    });
    expect(Object.values(result.current.collapsed).every(Boolean)).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({
      health: true,
      operation: true,
      connections: true,
      "ai-router": true,
    });
  });
});
