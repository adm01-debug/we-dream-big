/**
 * ProductCustomizationOptions — Seletor de personalização v6
 * 
 * Usa fn_get_product_customization_options para obter locais e técnicas.
 * Fluxo: Local (tabs) → Técnica (cards) → Dimensões/Cores → Preço.
 * 
 * Briefing v6 (12/02/2026).
 */

import { useState, useCallback, useRef } from "react";
import { Paintbrush, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useProductCustomizationOptions } from "@/hooks/useProductCustomizationOptions";
import { LocationPanel } from "./customization/LocationPanel";
import type { CustomizationPriceResponseV6, PersonalizationItem } from "@/types/customization";

interface ProductCustomizationOptionsProps {
  productId: string;
  productSku?: string;
  quantity?: number;
  onSelectionChange?: (personalizations: PersonalizationItem[]) => void;
}

export function ProductCustomizationOptions({
  productId,
  quantity = 100,
  onSelectionChange,
}: ProductCustomizationOptionsProps) {
  const { data: options, isLoading } = useProductCustomizationOptions(productId);
  const [activeLocation, setActiveLocation] = useState<string | null>(null);

  // Track prices per location
  const pricesRef = useRef<Map<string, PersonalizationItem>>(new Map());

  const handlePriceCalculated = useCallback((
    locationCode: string,
    techniqueId: string,
    price: CustomizationPriceResponseV6 | null,
    dimensions?: { width?: number; height?: number }
  ) => {
    const location = options?.locations.find(l => l.location_code === locationCode);
    const technique = location?.options.find(t => t.technique_id === techniqueId);

    if (price && technique) {
      pricesRef.current.set(locationCode, {
        locationCode,
        locationName: location?.location_name || locationCode,
        techniqueId,
        techniqueName: technique.tecnica_nome,
        codigoTabela: technique.codigo_tabela,
        grupoTecnica: technique.grupo_tecnica,
        width: dimensions?.width,
        height: dimensions?.height,
        numberOfColors: price.num_cores,
        usaDimensao: technique.usa_dimensao,
        price,
      });
    } else {
      pricesRef.current.delete(locationCode);
    }

    // Notify parent
    const items = Array.from(pricesRef.current.values());
    onSelectionChange?.(items);
  }, [options, onSelectionChange]);

  // Set first location as active when data loads
  if (options?.locations?.length && !activeLocation) {
    setActiveLocation(options.locations[0].location_code);
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!options?.locations?.length) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Este produto não possui opções de personalização configuradas.
      </div>
    );
  }

  const locations = options.locations;
  const currentLocation = locations.find(l => l.location_code === activeLocation);
  const totalSelected = pricesRef.current.size;
  const totalPrice = Array.from(pricesRef.current.values())
    .reduce((sum, p) => sum + (p.price?.total_cobrado ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Paintbrush className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground">
            Personalização
          </h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {locations.length} loca{locations.length !== 1 ? "is" : "l"}
        </Badge>
      </div>

      {/* Location tabs */}
      <div className="flex gap-2 flex-wrap">
        {locations.map((loc) => {
          const isActive = activeLocation === loc.location_code;
          const hasPrice = pricesRef.current.has(loc.location_code);
          return (
            <button
              key={loc.location_code}
              onClick={() => setActiveLocation(loc.location_code)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                isActive
                  ? "bg-primary text-primary-foreground border-primary"
                  : hasPrice
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
              )}
            >
              {loc.location_name}
              {hasPrice && !isActive && (
                <span className="ml-1.5 text-xs">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Current location panel */}
      {currentLocation && (
        <LocationPanel
          key={currentLocation.location_code}
          location={currentLocation}
          quantity={quantity}
          onPriceCalculated={handlePriceCalculated}
        />
      )}

      {/* Summary */}
      {totalSelected > 0 ? (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
          <span className="text-foreground font-medium">
            {totalSelected} loca{totalSelected !== 1 ? "is" : "l"} personalizado{totalSelected !== 1 ? "s" : ""}
          </span>
          <span className="text-primary font-semibold">
            Total gravação: R$ {totalPrice.toFixed(2)}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
          Selecione uma técnica para ver o preço de gravação
        </div>
      )}
    </div>
  );
}
