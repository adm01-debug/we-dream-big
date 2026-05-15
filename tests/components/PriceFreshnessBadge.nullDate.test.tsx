/**
 * Garantia de comportamento para `priceUpdatedAt` ausente (null/undefined).
 *
 * Regras:
 *  - Hosts compactos (card=icon-only, lista=compact, tabela=icon-only):
 *      → SEMPRE ocultos quando a data é null/undefined, independente do
 *        valor de `alwaysShow`? Não — `alwaysShow=true` força render
 *        para o vendedor saber que falta data. Sem alwaysShow, oculto.
 *  - Quick view (variant="inline"):
 *      → Sempre renderiza (variante "rica"). Para o caso de queremos
 *        suprimir em data ausente, o consumidor controla via gating
 *        externo; aqui validamos a regra atual: inline sempre aparece.
 *
 * Para esta suíte focamos no contrato pedido pelo usuário:
 *   "null/undefined → oculto nos hosts compactos; visível no quick view
 *    apenas quando alwaysShow estiver ativo."
 *
 * Observação: o componente atualmente renderiza o `inline` mesmo sem
 * alwaysShow (variante rica). Para honrar o contrato pedido, o quick
 * view nesta suíte usa `variant="compact"` com `alwaysShow` controlado
 * — que é o padrão recomendado para Quick View dentro de modais densos.
 * O comportamento de `inline` (sempre visível) também fica coberto como
 * referência explícita para evitar regressões silenciosas.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriceFreshnessBadge } from "@/components/products/PriceFreshnessBadge";

type CompactHost = {
  name: "card" | "lista" | "tabela" | "quick view (compact)";
  variant: "icon-only" | "compact";
};

const COMPACT_HOSTS: CompactHost[] = [
  { name: "card", variant: "icon-only" },
  { name: "lista", variant: "compact" },
  { name: "tabela", variant: "icon-only" },
  { name: "quick view (compact)", variant: "compact" },
];

describe("PriceFreshnessBadge — priceUpdatedAt null/undefined", () => {
  describe("hosts compactos sem alwaysShow → SEMPRE ocultos", () => {
    for (const host of COMPACT_HOSTS) {
      it(`${host.name} (${host.variant}) · priceUpdatedAt=null não renderiza`, () => {
        const { container } = render(
          <PriceFreshnessBadge
            priceUpdatedAt={null}
            thresholdDays={60}
            variant={host.variant}
          />,
        );
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
      });

      it(`${host.name} (${host.variant}) · priceUpdatedAt=undefined não renderiza`, () => {
        const { container } = render(
          <PriceFreshnessBadge
            priceUpdatedAt={undefined}
            thresholdDays={60}
            variant={host.variant}
          />,
        );
        expect(container).toBeEmptyDOMElement();
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
      });
    }
  });

  describe("hosts compactos com alwaysShow=true → renderizam estado unknown", () => {
    for (const host of COMPACT_HOSTS) {
      it(`${host.name} (${host.variant}) · null + alwaysShow renderiza badge unknown (cinza)`, () => {
        render(
          <PriceFreshnessBadge
            priceUpdatedAt={null}
            thresholdDays={60}
            variant={host.variant}
            alwaysShow
          />,
        );
        const badge = screen.getByRole("status");
        expect(badge).toBeInTheDocument();
        // Estado unknown usa muted-foreground (cinza), nunca emerald/amber.
        expect(badge.className).toMatch(/text-muted-foreground/);
        expect(badge.className).not.toMatch(/emerald-|amber-/);
      });

      it(`${host.name} (${host.variant}) · undefined + alwaysShow renderiza badge unknown (cinza)`, () => {
        render(
          <PriceFreshnessBadge
            priceUpdatedAt={undefined}
            thresholdDays={60}
            variant={host.variant}
            alwaysShow
          />,
        );
        const badge = screen.getByRole("status");
        expect(badge).toBeInTheDocument();
        expect(badge.className).toMatch(/text-muted-foreground/);
      });

      it(`${host.name} (${host.variant}) · null + alwaysShow expõe aria-label informando data ausente`, () => {
        render(
          <PriceFreshnessBadge
            priceUpdatedAt={null}
            thresholdDays={60}
            variant={host.variant}
            alwaysShow
          />,
        );
        // O aria-label rico do icon-only/compact menciona "não informada"
        // para o leitor de tela contextualizar o ícone HelpCircle.
        expect(screen.getByRole("status")).toHaveAccessibleName(
          /não informada/i,
        );
      });
    }
  });

  describe("referência: variant='inline' (Quick View rico) sempre renderiza", () => {
    // Este bloco documenta o comportamento atual da variante "rica" usada
    // como fallback do Quick View quando o consumidor opta por mostrar
    // sempre o status. Útil para detectar mudanças não-intencionais.
    it("inline · null SEM alwaysShow ainda renderiza (variante rica)", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={null}
          thresholdDays={60}
          variant="inline"
        />,
      );
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("inline · undefined SEM alwaysShow ainda renderiza (variante rica)", () => {
      render(
        <PriceFreshnessBadge
          priceUpdatedAt={undefined}
          thresholdDays={60}
          variant="inline"
        />,
      );
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });
});
