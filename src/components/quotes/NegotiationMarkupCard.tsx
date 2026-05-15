/**
 * NegotiationMarkupCard — Estratégia de Negociação (uso interno)
 *
 * Permite ao vendedor inflar o subtotal apresentado ao cliente para criar
 * margem psicológica de desconto, mantendo o desconto REAL dentro da alçada.
 *
 * REGRAS:
 *  - 0–50% de markup
 *  - subtotal_apresentado = subtotal_real * (1 + markup/100)
 *  - desconto_real = desconto efetivo vs subtotal_real (validado pela alçada)
 *  - NUNCA aparece no PDF / quote pública / e-mail do cliente
 */
import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EyeOff, Sparkles, Info, AlertTriangle, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

interface Props {
  /** Markup atual em % (0–50) */
  value: number;
  onChange: (v: number) => void;
  /** Subtotal real (sem markup) — base para os cálculos */
  realSubtotal: number;
  /** % de desconto APARENTE que o cliente verá */
  apparentDiscountPercent: number;
  /** Desconto REAL calculado (já considera markup) */
  realDiscountPercent: number;
  /** Limite de desconto do vendedor; null = sem limite definido */
  maxDiscountPercent: number | null;
  className?: string;
}

const MAX_MARKUP = 50;

export function NegotiationMarkupCard({
  value, onChange, realSubtotal, apparentDiscountPercent,
  realDiscountPercent, maxDiscountPercent, className,
}: Props) {
  const [enabled, setEnabled] = useState(value > 0);

  const presentedSubtotal = realSubtotal * (1 + value / 100);
  const finalPrice = presentedSubtotal * (1 - apparentDiscountPercent / 100);
  const isOverLimit = maxDiscountPercent !== null && realDiscountPercent > maxDiscountPercent;
  const realFitsLimit = maxDiscountPercent !== null && realDiscountPercent <= maxDiscountPercent;

  const handleToggle = (next: boolean) => {
    setEnabled(next);
    if (!next) onChange(0);
    else if (value === 0) onChange(10);
  };

  return (
    <TooltipProvider>
      <div className={cn(
        "rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/20 p-3 space-y-3",
        className
      )}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-semibold leading-tight">Margem de Negociação</h4>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" aria-label="Sobre margem de negociação">
                      <Info className="h-3 w-3 text-muted-foreground/60" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[280px] text-xs">
                    Infla o subtotal apresentado ao cliente para criar a sensação de
                    um desconto maior, mantendo o desconto real dentro da sua alçada.
                    Não aparece no PDF, e-mail ou link público.
                  </TooltipContent>
                </Tooltip>
              </div>
              <Badge variant="outline" className="mt-1 gap-1 text-[9px] h-4 bg-warning/10 text-warning border-warning/30">
                <EyeOff className="h-2.5 w-2.5" /> Uso interno
              </Badge>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} aria-label="Ativar margem de negociação" />
        </div>

        {enabled && (
          <>
            {/* Slider */}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] text-muted-foreground">Acréscimo no preço apresentado</span>
                <span className="text-sm font-bold text-primary tabular-nums">+{value.toFixed(0)}%</span>
              </div>
              <Slider
                value={[value]}
                min={0}
                max={MAX_MARKUP}
                step={1}
                onValueChange={(v) => onChange(v[0] ?? 0)}
                aria-label="Margem de negociação em porcentagem"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground/60">
                <span>0%</span>
                <span>{MAX_MARKUP}%</span>
              </div>
            </div>

            {/* Comparison preview */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40">
              {/* Real (interno) */}
              <div className="rounded-lg bg-muted/40 p-2 space-y-1">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <ShieldCheck className="h-2.5 w-2.5" /> Real (interno)
                </p>
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium tabular-nums">{formatCurrency(realSubtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Desconto:</span>
                    <span className={cn(
                      "font-bold tabular-nums",
                      isOverLimit ? "text-warning" : "text-success"
                    )}>
                      {realDiscountPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Cliente vê */}
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-2 space-y-1">
                <p className="text-[9px] font-semibold uppercase tracking-wider text-primary">Cliente vê</p>
                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium tabular-nums">{formatCurrency(presentedSubtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Desconto:</span>
                    <span className="font-bold text-primary tabular-nums">{apparentDiscountPercent.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Final price + status */}
            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <span className="text-[11px] text-muted-foreground">Preço final (cliente paga)</span>
              <span className="text-sm font-bold tabular-nums">{formatCurrency(finalPrice)}</span>
            </div>

            {/* Status badge */}
            {maxDiscountPercent !== null && (
              isOverLimit ? (
                <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/30 px-2.5 py-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                  <p className="text-[10px] text-warning leading-snug">
                    Mesmo com markup, o desconto real ({realDiscountPercent.toFixed(1)}%) excede sua alçada de {maxDiscountPercent}%.
                    Será necessária aprovação do administrador.
                  </p>
                </div>
              ) : realFitsLimit && apparentDiscountPercent > maxDiscountPercent ? (
                <div className="flex items-start gap-2 rounded-lg bg-success/10 border border-success/30 px-2.5 py-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                  <p className="text-[10px] text-success leading-snug">
                    Cliente percebe <strong>{apparentDiscountPercent.toFixed(1)}%</strong> de desconto, mas o real é
                    apenas <strong>{realDiscountPercent.toFixed(1)}%</strong> — dentro da sua alçada de {maxDiscountPercent}%.
                  </p>
                </div>
              ) : null
            )}
          </>
        )}

        {!enabled && (
          <p className="text-[10px] text-muted-foreground leading-snug">
            Ative para inflar o subtotal apresentado ao cliente e dar margem psicológica
            de desconto sem exceder sua alçada real.
          </p>
        )}
      </div>
    </TooltipProvider>
  );
}
