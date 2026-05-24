import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScrollLockFix } from "@/hooks/ui/useScrollLockFix";

afterEach(() => {
  document.body.removeAttribute("data-scroll-locked");
  document.body.removeAttribute("style");
  document.documentElement.removeAttribute("style");
  document.body.innerHTML = "";
});

describe("useScrollLockFix", () => {
  it("self-heals a stuck inert <body> on the next pointerdown", () => {
    renderHook(() => useScrollLockFix());

    // Simulate Radix leaving the body inert after an overlay closed.
    document.body.style.pointerEvents = "none";
    expect(document.body.style.pointerEvents).toBe("none");

    act(() => {
      window.dispatchEvent(new Event("pointerdown"));
    });

    expect(document.body.style.pointerEvents).toBe("");
  });

  it("does not strip the lock while a modal overlay is genuinely open", () => {
    renderHook(() => useScrollLockFix());

    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("data-state", "open");
    document.body.appendChild(dialog);
    document.body.style.pointerEvents = "none";

    act(() => {
      window.dispatchEvent(new Event("pointerdown"));
    });

    expect(document.body.style.pointerEvents).toBe("none");
  });
});
