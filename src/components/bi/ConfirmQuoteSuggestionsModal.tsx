/**
 * ConfirmQuoteSuggestionsModal — modal antes de criar orçamento.
 * Vendedor revisa quais produtos sugeridos quer levar para o Quote Builder.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Heart, TrendingUp, Package, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { isDemoClient } from "@/lib/bi/demoClient";
import { toast } from "sonner";

export interface SuggestionItem {
  name: string;
  priceFrom: number;
  priceTo: number;
  reason: string;
  productId: string | null;
  imageUrl: string | null;
  source: "affinity" | "industry";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  suggestions: SuggestionItem[];
}

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function ConfirmQuoteSuggestionsModal({
  open,
  onOpenChange,
  clientId,
  clientName,
  suggestions,
}: Props) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      setSelected(new Set(suggestions.map((s) => s.name)));
    }
  }, [open, suggestions]);

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleCreate = () => {
    if (selected.size === 0) {
      toast.error("Selecione ao menos 1 produto.");
      return;
    }

    if (isDemoClient(clientId)) {
      toast.info("Modo demo — em produção, abriria o Quote Builder com os itens selecionados.");
      onOpenChange(false);
      return;
    }

    const selectedItems = suggestions.filter((s) => selected.has(s.name));
    const productIds = selectedItems.map((s) => s.productId).filter(Boolean) as string[];

    const params = new URLSearchParams();
    params.set("clientId", clientId);
    if (productIds.length > 0) {
      params.set("productIds", productIds.join(","));
    }
    params.set("source", "bi-suggestions");

    onOpenChange(false);
    navigate(`/orcamentos/novo?${params.toString()}`);
  };

  const totalEstimateMin = suggestions
    .filter((s) => selected.has(s.name))
    .reduce((acc, s) => acc + s.priceFrom * 50, 0); // estimativa volume mínimo
  const totalEstimateMax = suggestions
    .filter((s) => selected.has(s.name))
    .reduce((acc, s) => acc + s.priceTo * 100, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Sparkles className="h-5 w-5 text-violet-500" />
            Orçamento sugerido para {clientName}
          </DialogTitle>
          <DialogDescription>
            Revise os {suggestions.length} produtos sugeridos pela IA do BI. Selecione os que você
            quer levar para o Criador de Orçamentos.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2 py-2">
            {suggestions.map((s) => {
              const isSelected = selected.has(s.name);
              const SourceIcon = s.source === "affinity" ? Heart : TrendingUp;
              return (
                <label
                  key={s.name}
                  htmlFor={`sug-${s.name}`}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border-[1.5px] cursor-pointer transition-all",
                    isSelected
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:border-primary/20 hover:bg-muted/40",
                  )}
                >
                  <Checkbox
                    id={`sug-${s.name}`}
                    checked={isSelected}
                    onCheckedChange={() => toggle(s.name)}
                  />
                  {s.imageUrl ? (
                    <div className="h-12 w-12 rounded-md overflow-hidden bg-muted shrink-0 border">
                      <img
                        src={s.imageUrl}
                        alt={s.name}
                        loading="lazy"
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  ) : (
                    <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{s.name}</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1 text-[10px] border-0",
                          s.source === "affinity"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                        )}
                      >
                        <SourceIcon className="h-3 w-3" />
                        {s.source === "affinity" ? "Afinidade" : "Tendência setor"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{s.reason}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground">unitário</div>
                    <div className="font-semibold text-sm tabular-nums">
                      {fmtBRL(s.priceFrom)}–{fmtBRL(s.priceTo)}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </ScrollArea>

        <div className="border-t pt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {selected.size} de {suggestions.length} selecionados
          </span>
          {selected.size > 0 && (
            <span className="font-medium text-foreground">
              Estimativa: {fmtBRL(totalEstimateMin)} – {fmtBRL(totalEstimateMax)}
            </span>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={selected.size === 0}
            className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
          >
            Criar orçamento com {selected.size} {selected.size === 1 ? "item" : "itens"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
