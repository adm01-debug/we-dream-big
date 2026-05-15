/**
 * Tests for src/hooks/simulator/useUndoRedo.ts
 */
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUndoableReducer } from "@/hooks/simulator/useUndoRedo";

interface TestState {
  value: string;
  count: number;
}

type TestAction =
  | { type: "SELECT_PRODUCT"; value: string }
  | { type: "SET_QUANTITY"; count: number }
  | { type: "UI_TOGGLE" }; // non-tracked

function testReducer(state: TestState, action: TestAction): TestState {
  switch (action.type) {
    case "SELECT_PRODUCT":
      return { ...state, value: action.value };
    case "SET_QUANTITY":
      return { ...state, count: action.count };
    case "UI_TOGGLE":
      return { ...state, value: state.value + "!" };
    default:
      return state;
  }
}

const initial: TestState = { value: "init", count: 0 };

describe("useUndoableReducer", () => {
  it("starts with initial state", () => {
    const { result } = renderHook(() => useUndoableReducer(testReducer, initial));
    expect(result.current.state).toEqual(initial);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it("dispatches tracked actions and enables undo", () => {
    const { result } = renderHook(() => useUndoableReducer(testReducer, initial));

    act(() => result.current.dispatch({ type: "SELECT_PRODUCT", value: "A" }));
    expect(result.current.state.value).toBe("A");
    expect(result.current.canUndo).toBe(true);
  });

  it("undo restores previous state", () => {
    const { result } = renderHook(() => useUndoableReducer(testReducer, initial));

    act(() => result.current.dispatch({ type: "SELECT_PRODUCT", value: "A" }));
    act(() => result.current.undo());

    expect(result.current.state.value).toBe("init");
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it("redo restores undone state", () => {
    const { result } = renderHook(() => useUndoableReducer(testReducer, initial));

    act(() => result.current.dispatch({ type: "SELECT_PRODUCT", value: "A" }));
    act(() => result.current.undo());
    act(() => result.current.redo());

    expect(result.current.state.value).toBe("A");
    expect(result.current.canRedo).toBe(false);
  });

  it("new tracked action clears future", () => {
    const { result } = renderHook(() => useUndoableReducer(testReducer, initial));

    act(() => result.current.dispatch({ type: "SELECT_PRODUCT", value: "A" }));
    act(() => result.current.undo());
    act(() => result.current.dispatch({ type: "SET_QUANTITY", count: 5 }));

    expect(result.current.canRedo).toBe(false);
    expect(result.current.state.count).toBe(5);
  });

  it("non-tracked actions update state without creating history", () => {
    const { result } = renderHook(() => useUndoableReducer(testReducer, initial));

    act(() => result.current.dispatch({ type: "UI_TOGGLE" } as any));
    expect(result.current.state.value).toBe("init!");
    expect(result.current.canUndo).toBe(false); // no history entry
  });

  it("undo is no-op when history is empty", () => {
    const { result } = renderHook(() => useUndoableReducer(testReducer, initial));
    act(() => result.current.undo());
    expect(result.current.state).toEqual(initial);
  });

  it("redo is no-op when future is empty", () => {
    const { result } = renderHook(() => useUndoableReducer(testReducer, initial));
    act(() => result.current.redo());
    expect(result.current.state).toEqual(initial);
  });

  it("supports initializer function", () => {
    const { result } = renderHook(() =>
      useUndoableReducer(testReducer, initial, (s) => ({ ...s, count: 99 }))
    );
    expect(result.current.state.count).toBe(99);
  });

  it("tracks history length", () => {
    const { result } = renderHook(() => useUndoableReducer(testReducer, initial));

    act(() => result.current.dispatch({ type: "SELECT_PRODUCT", value: "A" }));
    act(() => result.current.dispatch({ type: "SET_QUANTITY", count: 1 }));
    act(() => result.current.dispatch({ type: "SELECT_PRODUCT", value: "B" }));

    expect(result.current.historyLength).toBe(3);
  });
});
