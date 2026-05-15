/**
 * Kit Presentable Preview — client-facing proposal view
 * Renders the kit as a visual presentation card with narrative, items grid,
 * and pricing summary.
 */
import { useMemo } from "react";
import { Sparkles, Calendar, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, type KitState } from "@/lib/kit-builder";

interface KitPresentablePreviewProps {
  kitState: KitState;
  kitQuantity: number;
  kitName: string;
  currentKitId?: string;
}

function buildNarrative(kitState: KitState, kitName: string): string {
  const itemCount = kitState.items.length;
  const totalUnits = kitState.items.reduce((s, i) => s + i.quantity, 0);
  const personalized = Object.values(kitState.personalization.items).filter((p) => p.enabled).length
    + (kitState.personalization.box.enabled ? 1 : 0);
  const label = kitName?.trim() || "Este kit";
  const personalizationLine = personalized > 0
    ? ` Conta com ${personalized} ponto(s) de personalização para reforçar a identidade da sua marca.`
    : "";
  const boxLine = kitState.box ? ` Apresentado em ${kitState.box.name.toLowerCase()},` : "";
  return `${label} foi pensado para gerar conexão e gratidão.${boxLine} reúne ${itemCount} produto(s) selecionado(s) (${totalUnits} unidade(s) no total) que combinam utilidade, design e qualidade.${personalizationLine}`;
}

export function KitPresentablePreview({
  kitState,
  kitQuantity,
  kitName,
}: KitPresentablePreviewProps) {
  const narrative = useMemo(() => buildNarrative(kitState, kitName), [kitState, kitName]);
  const grandTotal = kitState.totalPrice * kitQuantity;
  const validityDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toLocaleDateString("pt-BR");
  }, []);

  if (!kitState.box && kitState.items.length === 0) return null;

  return (
    <Card className="border-[1.5px] border-primary/20 overflow-hidden">
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 border-b">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider text-primary">
              Apresentação para o cliente
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] gap-1">
            <Calendar className="h-3 w-3" /> Válido até {validityDate}
          </Badge>
        </div>
        <h3 className="text-2xl font-display font-bold leading-tight">
          {kitName?.trim() || "Kit Personalizado"}
        </h3>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{narrative}</p>
      </div>

      <CardContent className="p-6 space-y-5">
        {/* Items grid */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            Composição
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {kitState.box && (
              <div className="rounded-lg border bg-card p-2 space-y-2">
                <div className="aspect-square rounded-md bg-muted/40 flex items-center justify-center overflow-hidden">
                  {kitState.box.imageUrl ? (
                    <img
                      src={kitState.box.imageUrl}
                      alt={kitState.box.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <Badge variant="secondary" className="text-[9px] mb-1">Embalagem</Badge>
                  <p className="text-xs font-medium leading-tight line-clamp-2">{kitState.box.name}</p>
                </div>
              </div>
            )}
            {kitState.items.map((item) => (
              <div key={item.id} className="rounded-lg border bg-card p-2 space-y-2">
                <div className="aspect-square rounded-md bg-muted/40 flex items-center justify-center overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  {item.quantity > 1 && (
                    <Badge variant="outline" className="text-[9px] mb-1">{item.quantity}x</Badge>
                  )}
                  <p className="text-xs font-medium leading-tight line-clamp-2">{item.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Pricing block */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Quantidade</p>
            <p className="text-lg font-bold font-display">{kitQuantity}<span className="text-xs font-normal text-muted-foreground"> kits</span></p>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Por kit</p>
            <p className="text-lg font-bold font-display">{formatCurrency(kitState.totalPrice)}</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-3 border border-primary/20">
            <p className="text-[10px] uppercase tracking-wider text-primary">Investimento</p>
            <p className="text-lg font-bold font-display text-primary">{formatCurrency(grandTotal)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
