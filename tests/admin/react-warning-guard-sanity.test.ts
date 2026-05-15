/**
 * Sanity check do guard: garante que o helper `installReactWarningGuard`
 * realmente detecta o warning canônico do React. Sem este teste, um bug
 * silencioso no guard tornaria o resto da suíte falsamente verde.
 */
import { describe, it, expect, afterEach } from "vitest";
import { installReactWarningGuard } from "../helpers/react-warning-guard";

describe("react-warning-guard — sanity", () => {
  let guard: ReturnType<typeof installReactWarningGuard>;
  afterEach(() => guard?.dispose());

  it("captura o warning canônico de ref em function component", () => {
    guard = installReactWarningGuard();
    // Simula exatamente como o React loga (template + nome do componente)
    console.error(
      "Warning: Function components cannot be given refs. " +
        "Attempts to access this ref will fail. Did you mean to use React.forwardRef()?%s",
      "\n    in MyComp",
    );
    expect(() => guard.expectNoRefWarning()).toThrow(/ref warning/i);
    expect(guard.refWarnings.length).toBeGreaterThan(0);
  });

  it("não falha quando não há warnings", () => {
    guard = installReactWarningGuard();
    expect(() => guard.expectNoRefWarning()).not.toThrow();
  });

  it("não falha por 'Attempts to access this ref will fail' isolado (contexto, não trigger)", () => {
    guard = installReactWarningGuard();
    console.error("Warning: Attempts to access this ref will fail.");
    expect(() => guard.expectNoRefWarning()).not.toThrow();
    expect(guard.refWarnings).toHaveLength(0);
  });

  it("ignora ruído conhecido da allowlist (act warning, router future flag, dialog title)", () => {
    guard = installReactWarningGuard();
    console.error("Warning: An update to Foo inside a test was not wrapped in act(...)");
    console.warn("React Router Future Flag Warning: v7_startTransition");
    console.error("`DialogContent` requires a `DialogTitle` for accessibility");
    expect(() => guard.expectNoRefWarning()).not.toThrow();
    expect(() => guard.expectNoRelevantWarnings()).not.toThrow();
    expect(guard.messages).toHaveLength(0);
    expect(guard.suppressed.length).toBeGreaterThanOrEqual(3);
  });

  it("não falha por warnings de key/DOM nesting no modo padrão (apenas no estrito)", () => {
    guard = installReactWarningGuard();
    console.error('Warning: Each child in a list should have a unique "key" prop.');
    console.error("Warning: validateDOMNesting(...): <div> cannot appear as a descendant of <p>.");
    expect(() => guard.expectNoRefWarning()).not.toThrow();
    expect(() => guard.expectNoRelevantWarnings()).toThrow(/warnings detectados/i);
    expect(guard.refWarnings).toHaveLength(0);
    expect(guard.otherWarnings).toHaveLength(2);
  });
});
