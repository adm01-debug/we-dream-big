import { configureAxe } from "jest-axe";

/**
 * axe runner pré-configurado para WCAG 2.1 AA.
 *
 * - `color-contrast` desabilitado: jsdom não aplica CSS do Tailwind, então o
 *   axe não consegue calcular contraste real. Contraste é coberto por testes
 *   de classe (`disabled:bg-muted`, `disabled:opacity-100`, etc.) em
 *   `tests/components/magic-up-onda5.test.tsx`.
 * - Mantém ativas regras estruturais: button-name, aria-*, label,
 *   focus-order-semantics, nested-interactive, role-*.
 */
export const axe = configureAxe({
  runOnly: {
    type: "tag",
    values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
  },
  rules: {
    "color-contrast": { enabled: false },
    // region/landmark rules são ruidosas em fragmentos isolados de UI
    region: { enabled: false },
  },
});
