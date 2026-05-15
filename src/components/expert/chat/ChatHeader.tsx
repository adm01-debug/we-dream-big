import { Bot, X, Sparkles, History, Plus, Filter } from "lucide-react";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type FlowFilterState, getActiveFilterLabels } from "../FlowFilterPanel";

interface ChatHeaderProps {
  clientName?: string;
  activeFiltersCount: number;
  flowFilters: FlowFilterState;
  setFlowFilters: (fn: (prev: FlowFilterState) => FlowFilterState) => void;
  showHistory: boolean;
  onToggleHistory: () => void;
  onNewConversation: () => void;
  onOpenFilters: () => void;
  onClose: () => void;
}

export function ChatHeader({
  clientName, activeFiltersCount, flowFilters, setFlowFilters,
  showHistory, onToggleHistory, onNewConversation, onOpenFilters, onClose,
}: ChatHeaderProps) {
  return (
    <DialogHeader className="px-5 pt-4 pb-3 border-b border-border/30 flex-shrink-0 bg-gradient-to-b from-primary/[0.03] to-transparent">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-success border-[1.5px] border-background" />
          </div>
          <div>
            <DialogTitle className="text-base font-display font-semibold tracking-tight flex items-center gap-1.5">
              Flow
              <Sparkles className="h-3.5 w-3.5 text-primary/60" />
            </DialogTitle>
            <DialogDescription className="text-[11px] text-muted-foreground/70 leading-none mt-0.5">
              Assistente pessoal de vendas
            </DialogDescription>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm"
            className={cn("h-8 w-8 p-0 rounded-xl relative", activeFiltersCount > 0 && "text-primary bg-primary/10")}
            onClick={onOpenFilters} title="Filtros">
            <Filter className="h-4 w-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={onToggleHistory}
            className="h-8 w-8 p-0 rounded-xl" title={showHistory ? "Voltar ao chat" : "Histórico"} aria-label="Histórico">
            <History className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onNewConversation}
            className="h-8 w-8 p-0 rounded-xl" title="Nova conversa" aria-label="Nova conversa">
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}
            className="h-8 w-8 p-0 rounded-xl" title="Fechar" aria-label="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {getActiveFilterLabels(flowFilters).map(({ label, key, value }) => (
            <Badge key={`${key}-${value || label}`} variant="secondary"
              className="text-[9px] rounded-md px-1.5 py-0.5 gap-0.5 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={() => {
                if (key === "price") {
                  setFlowFilters(prev => ({ ...prev, priceMin: "", priceMax: "" }));
                } else if (value && Array.isArray(flowFilters[key as keyof FlowFilterState])) {
                  setFlowFilters(prev => ({
                    ...prev,
                    [key]: (prev[key as keyof FlowFilterState] as string[]).filter(v => v !== value),
                  }));
                } else {
                  setFlowFilters(prev => ({ ...prev, [key]: false }));
                }
              }}
            >
              {label}
              <X className="h-2 w-2" />
            </Badge>
          ))}
        </div>
      )}

      {clientName && (
        <div className="mt-2">
          <Badge variant="outline" className="text-[10px] rounded-lg font-normal text-muted-foreground">
            Cliente: {clientName}
          </Badge>
        </div>
      )}
    </DialogHeader>
  );
}
