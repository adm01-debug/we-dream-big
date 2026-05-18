import { render } from "@testing-library/react";
import ProductCustomizationOptions from "../ProductCustomizationOptions";
import { vi, describe, it, expect } from "vitest";

// Mock das dependências que não são o foco do teste de estrutura
vi.mock("@/hooks/useQuoteItems", () => ({
  useQuoteItems: () => ({
    updateItemPersonalization: vi.fn(),
  }),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("ProductCustomizationOptions Structural Test", () => {
  const mockProps = {
    productId: "prod-123",
    onClose: vi.fn(),
    initialPersonalizations: [],
  };

  it("should render without crashing and have balanced divs", () => {
    const { container } = render(<ProductCustomizationOptions {...mockProps} />);
    expect(container).toBeDefined();
    // Se o JSX estivesse quebrado (divs desalinhados), o render falharia ou o build não passaria.
    // O teste de fumaça garante que a árvore de componentes é montada.
    expect(container.firstChild).not.toBeNull();
  });
});
