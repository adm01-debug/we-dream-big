/**
 * Testes para useFocusContext — persistência do último foco (zona + incidente).
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useFocusContext,
  readFocusContextOnce,
  __TEST__,
} from "@/components/admin/connections/useFocusContext";

const { STORAGE_KEY, TTL_MS } = __TEST__;

describe("useFocusContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-25T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("estado inicial vazio quando localStorage está limpo", () => {
    const { result } = renderHook(() => useFocusContext());
    expect(result.current.context).toEqual({
      lastZone: null,
      lastIncidentId: null,
      savedAt: 0,
    });
  });

  it("setZone atualiza lastZone e savedAt e persiste em localStorage", () => {
    const { result } = renderHook(() => useFocusContext());
    act(() => result.current.setZone("operation"));

    expect(result.current.context.lastZone).toBe("operation");
    expect(result.current.context.savedAt).toBeGreaterThan(0);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.lastZone).toBe("operation");
  });

  it("setIncident atualiza lastIncidentId sem afetar lastZone", () => {
    const { result } = renderHook(() => useFocusContext());
    act(() => result.current.setZone("health"));
    act(() => result.current.setIncident("inc-123"));

    expect(result.current.context.lastZone).toBe("health");
    expect(result.current.context.lastIncidentId).toBe("inc-123");
  });

  it("clear zera todo o contexto", () => {
    const { result } = renderHook(() => useFocusContext());
    act(() => result.current.setZone("connections"));
    act(() => result.current.setIncident("inc-x"));
    act(() => result.current.clear());

    expect(result.current.context).toEqual({
      lastZone: null,
      lastIncidentId: null,
      savedAt: 0,
    });
  });

  it("restaura contexto persistido em uma nova instância", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        lastZone: "operation",
        lastIncidentId: "inc-abc",
        savedAt: Date.now(),
      }),
    );
    const { result } = renderHook(() => useFocusContext());
    expect(result.current.context.lastZone).toBe("operation");
    expect(result.current.context.lastIncidentId).toBe("inc-abc");
  });

  it("contexto expira após TTL (30 min) — descarta lastZone/lastIncidentId", () => {
    const old = Date.now() - TTL_MS - 1000;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        lastZone: "operation",
        lastIncidentId: "inc-old",
        savedAt: old,
      }),
    );
    const { result } = renderHook(() => useFocusContext());
    expect(result.current.context.lastZone).toBeNull();
    expect(result.current.context.lastIncidentId).toBeNull();
  });

  it("contexto dentro do TTL é mantido", () => {
    const recent = Date.now() - 5 * 60 * 1000; // 5 min atrás
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        lastZone: "health",
        lastIncidentId: null,
        savedAt: recent,
      }),
    );
    const { result } = renderHook(() => useFocusContext());
    expect(result.current.context.lastZone).toBe("health");
  });

  it("é resiliente a JSON inválido em localStorage", () => {
    localStorage.setItem(STORAGE_KEY, "{{not-json");
    const { result } = renderHook(() => useFocusContext());
    expect(result.current.context).toEqual({
      lastZone: null,
      lastIncidentId: null,
      savedAt: 0,
    });
  });

  it("readFocusContextOnce retorna estado atual sem reagir", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        lastZone: "connections",
        lastIncidentId: "x1",
        savedAt: Date.now(),
      }),
    );
    const ctx = readFocusContextOnce();
    expect(ctx.lastZone).toBe("connections");
    expect(ctx.lastIncidentId).toBe("x1");
  });

  it("setZone(null) limpa apenas a zona", () => {
    const { result } = renderHook(() => useFocusContext());
    act(() => result.current.setZone("health"));
    act(() => result.current.setIncident("inc-1"));
    act(() => result.current.setZone(null));

    expect(result.current.context.lastZone).toBeNull();
    expect(result.current.context.lastIncidentId).toBe("inc-1");
  });
});
