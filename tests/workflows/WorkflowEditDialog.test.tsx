import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WorkflowEditDialog } from "@/components/workflows/WorkflowEditDialog";

const baseStep = {
  id: "1",
  name: "Test Step",
  type: "agent" as const,
  description: "A test step",
  agentModel: "google/gemini-2.5-flash",
  prompt: "Do something",
  config: {},
};

describe("WorkflowEditDialog", () => {
  it("renders nothing when step is null", () => {
    const { container } = render(
      <WorkflowEditDialog
        step={null}
        form={{}}
        onFormChange={vi.fn()}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(container.querySelector("[role='dialog']")).not.toBeInTheDocument();
  });

  it("renders dialog with step data", () => {
    render(
      <WorkflowEditDialog
        step={baseStep}
        form={baseStep}
        onFormChange={vi.fn()}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("Configurar Etapa")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Step")).toBeInTheDocument();
    expect(screen.getByDisplayValue("A test step")).toBeInTheDocument();
  });

  it("shows prompt textarea for agent type", () => {
    render(
      <WorkflowEditDialog
        step={baseStep}
        form={{ ...baseStep, type: "agent" }}
        onFormChange={vi.fn()}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByPlaceholderText("Instruções para o agente...")).toBeInTheDocument();
    expect(screen.getByText("Modelo de IA")).toBeInTheDocument();
  });

  it("hides prompt fields for non-agent types", () => {
    render(
      <WorkflowEditDialog
        step={baseStep}
        form={{ ...baseStep, type: "tool" }}
        onFormChange={vi.fn()}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.queryByPlaceholderText("Instruções para o agente...")).not.toBeInTheDocument();
  });

  it("calls onSave when save button clicked", () => {
    const onSave = vi.fn();
    render(
      <WorkflowEditDialog
        step={baseStep}
        form={baseStep}
        onFormChange={vi.fn()}
        onSave={onSave}
        onClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("Salvar"));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("calls onClose when cancel button clicked", () => {
    const onClose = vi.fn();
    render(
      <WorkflowEditDialog
        step={baseStep}
        form={baseStep}
        onFormChange={vi.fn()}
        onSave={vi.fn()}
        onClose={onClose}
      />
    );
    fireEvent.click(screen.getByText("Cancelar"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onFormChange when name input changes", () => {
    const onFormChange = vi.fn();
    render(
      <WorkflowEditDialog
        step={baseStep}
        form={baseStep}
        onFormChange={onFormChange}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />
    );
    fireEvent.change(screen.getByDisplayValue("Test Step"), { target: { value: "New Name" } });
    expect(onFormChange).toHaveBeenCalled();
  });
});
