/**
 * QuoteProductCustomization — Personalização de produto dentro do orçamento
 * 
 * Usa ProductCustomizationOptions v6 com o novo fluxo:
 * Local → Técnica → Dimensões/Cores → Preço → AUTO-CONFIRMA
 * 
 * A personalização é confirmada automaticamente quando o preço é calculado,
 * sem necessidade de clicar em "Adicionar" — evitando perda de dados.
 */

import { useCallback, useEffect, useRef } from "react";
import { CheckCircle2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCustomizationOptions } from "@/components/products/ProductCustomizationOptions";
import type { QuoteItemPersonalization } from "@/hooks/useQuotes";
import type { PersonalizationItem } from "@/types/customization";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface QuoteProductCustomizationProps {
  productId: string;
  quantity: number;
  existingPersonalizations?: QuoteItemPersonalization[];
  onPersonalizationsChange: (personalizations: QuoteItemPersonalization[]) => void;
}

export function QuoteProductCustomization({
  productId,
  quantity,
  existingPersonalizations = [],
  onPersonalizationsChange,
}: QuoteProductCustomizationProps) {
  // Use ref to hold current personalizations to avoid stale closures
  const personalizationsRef = useRef<QuoteItemPersonalization[]>(existingPersonalizations);

  // Keep ref in sync if parent changes existingPersonalizations (e.g. on load)
  useEffect(() => {
    personalizationsRef.current = existingPersonalizations;
  }, [existingPersonalizations]);

  // Auto-confirm: whenever a price is calculated, update the personalization map immediately
  const handleSelectionChange = useCallback((items: PersonalizationItem[]) => {
    const updated = [...personalizationsRef.current];

    items.forEach(item => {
      if (!item.price?.success) return;

      const newP: QuoteItemPersonalization = {
        technique_id: item.techniqueId,
        technique_name: item.techniqueName,
        colors_count: item.numberOfColors,
        positions_count: 1,
        width_cm: item.width,
        height_cm: item.height,
        personalized_quantity: quantity,
        setup_cost: item.price.setup_total,
        unit_cost: item.price.preco_unitario,
        total_cost: item.price.total_cobrado,
        notes: item.width && item.height
          ? `${item.locationName} — ${item.codigoTabela} | ${item.width}×${item.height}cm`
          : `${item.locationName} — ${item.codigoTabela}`,
      };

      // Replace existing by same locationCode (notes key) or techniqueId
      const key = newP.notes!;
      const existingIdx = updated.findIndex(m => m.notes === key || m.technique_id === newP.technique_id);
      if (existingIdx >= 0) {
        updated[existingIdx] = newP;
      } else {
        updated.push(newP);
      }
    });

    personalizationsRef.current = updated;
    onPersonalizationsChange(updated);
  }, [quantity, onPersonalizationsChange]);

  const handleRemove = useCallback((idx: number) => {
    const updated = personalizationsRef.current.filter((_, i) => i !== idx);
    personalizationsRef.current = updated;
    onPersonalizationsChange(updated);
  }, [onPersonalizationsChange]);

  if (!productId) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Selecione um produto para ver as opções de personalização
      </div>
    );
  }

  const confirmed = existingPersonalizations;
  const confirmedTotal = confirmed.reduce((s, p) => s + (p.total_cost || 0), 0);

  return (
    <div className="space-y-4">
      {/* Already-confirmed personalizations summary */}
      {confirmed.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Gravações adicionadas
          </p>
          {confirmed.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-primary block truncate">{p.technique_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {p.width_cm && p.height_cm ? `${p.width_cm}×${p.height_cm}cm · ` : ""}
                    {p.colors_count || 1} cor{(p.colors_count || 1) > 1 ? "es" : ""}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className="text-xs font-semibold">
                  {fmt(p.total_cost || 0)}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon" aria-label="Excluir"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(i)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
          <div className="flex justify-between text-xs text-muted-foreground pt-1 px-1">
            <span>Total gravação:</span>
            <span className="font-semibold text-primary">{fmt(confirmedTotal)}</span>
          </div>
        </div>
      )}

      {/* Configurador — auto-confirms on price calculation */}
      <ProductCustomizationOptions
        productId={productId}
        quantity={quantity}
        onSelectionChange={handleSelectionChange}
      />

      {confirmed.length === 0 && (
        <p className="text-xs text-center text-muted-foreground/70 pt-1">
          Configure a técnica acima — o preço será adicionado automaticamente ao orçamento.
        </p>
      )}
    </div>
  );
}

