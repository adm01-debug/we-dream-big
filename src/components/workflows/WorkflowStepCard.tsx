/**
 * SortableStep — Extracted from WorkflowCanvas
 */
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Trash2, Settings2, ArrowRight, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowStep } from "./WorkflowCanvas";
import { STEP_TYPES, AI_MODELS } from "./workflowConstants";

interface SortableStepProps {
  step: WorkflowStep;
  index: number;
  totalSteps: number;
  onEdit: (step: WorkflowStep) => void;
  onDelete: (id: string) => void;
  onDuplicate: (step: WorkflowStep) => void;
}

export function SortableStep({ step, index, totalSteps, onEdit, onDelete, onDuplicate }: SortableStepProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const typeConfig = STEP_TYPES.find((t) => t.value === step.type) || STEP_TYPES[0];
  const Icon = typeConfig.icon;

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {index < totalSteps - 1 && <div className="absolute left-7 top-full w-0.5 h-6 bg-border z-0" />}
      {index < totalSteps - 1 && (
        <div className="absolute left-[22px] top-[calc(100%+20px)] z-10">
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground -rotate-90" />
        </div>
      )}
      <div className={cn(
        "group flex items-stretch rounded-xl border transition-all duration-200",
        typeConfig.border,
        isDragging ? "shadow-lg opacity-80 scale-[1.02]" : "hover:shadow-md",
        "bg-card"
      )}>
        <div {...attributes} {...listeners} className="flex items-center px-2 cursor-grab active:cursor-grabbing border-r border-border/50 hover:bg-muted/50 rounded-l-xl">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 p-3 flex items-center gap-3">
          <div className={cn("p-2 rounded-lg shrink-0", typeConfig.bg)}>
            <Icon className={cn("h-5 w-5", typeConfig.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{step.name}</span>
              <Badge variant="outline" className="text-[10px] px-1.5 shrink-0">{typeConfig.label}</Badge>
              {step.agentModel && (
                <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">
                  {AI_MODELS.find((m) => m.value === step.agentModel)?.label || step.agentModel}
                </Badge>
              )}
            </div>
            {step.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{step.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" aria-label="Copiar" className="h-7 w-7" onClick={() => onDuplicate(step)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Settings2" className="h-7 w-7" onClick={() => onEdit(step)}>
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Excluir" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(step.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
