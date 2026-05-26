import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ColumnSelector, STORAGE_KEY } from "./ColumnSelector";
import { TooltipProvider } from "@/components/ui/tooltip";

// Mock screen width
const setScreenWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
};

describe("ColumnSelector", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    setScreenWidth(1600); // Desktop size with all options
  });

  const renderSelector = (value: any = 5, onChange = vi.fn()) => {
    return render(
      <TooltipProvider>
        <ColumnSelector value={value} onChange={onChange} />
      </TooltipProvider>
    );
  };

  it("renders all column options on desktop", () => {
    renderSelector();
    expect(screen.getByLabelText("3 colunas")).toBeInTheDocument();
    expect(screen.getByLabelText("4 colunas")).toBeInTheDocument();
    expect(screen.getByLabelText("5 colunas")).toBeInTheDocument();
    expect(screen.getByLabelText("6 colunas")).toBeInTheDocument();
    expect(screen.getByLabelText("8 colunas")).toBeInTheDocument();
  });

  it("calls onChange and updates localStorage when an option is clicked", () => {
    const onChange = vi.fn();
    renderSelector(5, onChange);

    const button3 = screen.getByLabelText("3 colunas");
    fireEvent.click(button3);

    expect(onChange).toHaveBeenCalledWith(3);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("3");
  });

  it("persists selection in localStorage across re-renders", () => {
    const { rerender } = renderSelector(5);
    const button8 = screen.getByLabelText("8 colunas");
    
    fireEvent.click(button8);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("8");

    rerender(
      <TooltipProvider>
        <ColumnSelector value={8} onChange={vi.fn()} />
      </TooltipProvider>
    );
    
    expect(screen.getByLabelText("8 colunas")).toHaveAttribute("aria-pressed", "true");
  });

  it("filters options based on screen width", () => {
    // Tablet size
    setScreenWidth(800); 
    const { rerender } = renderSelector(3);
    
    // At 800px, only 3 and 4 columns should be available (minWidth: 0 and 768)
    expect(screen.getByLabelText("3 colunas")).toBeInTheDocument();
    expect(screen.getByLabelText("4 colunas")).toBeInTheDocument();
    expect(screen.queryByLabelText("5 colunas")).not.toBeInTheDocument();

    // Mobile size
    setScreenWidth(375);
    rerender(
      <TooltipProvider>
        <ColumnSelector value={3} onChange={vi.fn()} />
      </TooltipProvider>
    );
    
    // Only 1 option available (3 columns) -> should return null
    expect(screen.queryByLabelText("3 colunas")).not.toBeInTheDocument();
  });

  it("automatically clamps value if screen size shrinks", async () => {
    const onChange = vi.fn();
    const { rerender } = renderSelector(8, onChange);

    // Shrink to tablet (max 4 columns)
    setScreenWidth(800);
    
    rerender(
      <TooltipProvider>
        <ColumnSelector value={8} onChange={onChange} />
      </TooltipProvider>
    );

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(4);
    });
  });
});
