import { Badge } from "@/components/ui/badge";
import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TechniqueFilter } from "./logoTechniqueFilters";
import type { TechniqueColorConfig } from "../techniqueColorUtils";

interface LogoPreviewCanvasProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  productImageUrl: string;
  logoPreview: string | null;
  logoDisplay: { widthPx: number; heightPx: number } | null;
  positionX: number;
  positionY: number;
  logoRotation: number;
  userScaleFactor: number;
  processedLogoUrl: string | null;
  techniqueFilter: TechniqueFilter;
  colorConfigFilter: { filter: string; opacity: number } | null;
  techniqueColorConfig?: TechniqueColorConfig | null;
  techniqueName?: string;
  onPointerDown: (e: React.PointerEvent) => void;
  onColorConfigClick?: () => void;
}

export function LogoPreviewCanvas({
  containerRef,
  productImageUrl,
  logoPreview,
  logoDisplay,
  positionX,
  positionY,
  logoRotation,
  userScaleFactor,
  processedLogoUrl,
  techniqueFilter,
  colorConfigFilter,
  techniqueColorConfig,
  techniqueName,
  onPointerDown,
  onColorConfigClick,
}: LogoPreviewCanvasProps) {
  const isCanvasProcessed =
    processedLogoUrl &&
    (techniqueColorConfig?.category === "laser" || techniqueColorConfig?.category === "serigrafia");

  return (
    <>
      {/* Technique preview indicator */}
      {techniqueName && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
          <div
            className="w-4 h-4 rounded-full border-2 border-primary"
            style={{
              background: techniqueFilter.filter.includes("grayscale")
                ? "linear-gradient(135deg, hsl(var(--muted-foreground)), hsl(var(--muted)))"
                : techniqueFilter.filter.includes("sepia")
                  ? "linear-gradient(135deg, hsl(var(--warning)), hsl(var(--warning) / 0.65))"
                  : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
            }}
          />
          <span className="text-xs text-muted-foreground">
            Simulando: <span className="font-medium text-foreground">{techniqueName}</span>
          </span>
          <Badge variant="secondary" className="text-[10px] ml-auto">
            {techniqueFilter.description}
          </Badge>
        </div>
      )}

      {/* Preview area */}
      <div
        ref={containerRef}
        className="relative rounded-lg border overflow-hidden bg-muted/30 aspect-square"
      >
        <img
          src={productImageUrl}
          alt="Imagem do produto para preview de personalização"
          className="absolute inset-0 w-full h-full object-contain"
          loading="lazy"
          onError={(e) => {
            const t = e.currentTarget;
            const currentSrc = t.src;
            if (currentSrc.includes("/thumbnail")) {
              t.src = currentSrc.replace("/thumbnail", "");
            } else if (!currentSrc.endsWith("/placeholder.svg") && !t.dataset.fallback) {
              t.dataset.fallback = "1";
              t.src = "/placeholder.svg";
            }
          }}
        />

        {logoPreview && logoDisplay ? (
          <div
            className={cn(
              "absolute select-none touch-none overflow-hidden",
              "cursor-grab active:cursor-grabbing",
              "ring-2 ring-primary/30 rounded-sm"
            )}
            onPointerDown={onPointerDown}
            style={{
              left: `${positionX}%`,
              top: `${positionY}%`,
              width: `${logoDisplay.widthPx}px`,
              height: `${logoDisplay.heightPx}px`,
              transform: `translate(-50%, -50%)`,
            }}
          >
            <img
              src={isCanvasProcessed ? processedLogoUrl : logoPreview!}
              alt="Logo para personalização"
              className="absolute inset-0 w-full h-full object-contain"
              style={{
                transform: `rotate(${logoRotation}deg) scale(${userScaleFactor})`,
                opacity: isCanvasProcessed
                  ? 0.92
                  : (colorConfigFilter?.opacity ?? techniqueFilter.opacity),
                filter: !isCanvasProcessed
                  ? (colorConfigFilter?.filter ?? techniqueFilter.filter)
                  : "none",
                mixBlendMode: techniqueFilter.blend as React.CSSProperties["mixBlendMode"],
              }}
              draggable={false}
              loading="lazy"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <p className="text-sm text-muted-foreground text-center px-4">
              Faça upload do logo para posicioná-lo
            </p>
          </div>
        )}

        {/* Live preview badge + Color config badge */}
        {logoPreview && (
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm text-[10px] gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Preview em tempo real
            </Badge>
            {techniqueColorConfig && (
              <Badge
                variant="outline"
                className="bg-background/90 backdrop-blur-sm text-[10px] gap-1 cursor-pointer hover:bg-accent"
                onClick={onColorConfigClick}
              >
                <Palette className="h-3 w-3" />
                {techniqueColorConfig.category === "laser"
                  ? `Laser ${techniqueColorConfig.laserTone === "claro" ? "Claro" : "Escuro"}`
                  : techniqueColorConfig.category === "serigrafia"
                    ? `${techniqueColorConfig.colorCount || 1} cor${(techniqueColorConfig.colorCount || 1) > 1 ? "es" : ""}`
                    : "Policromia"}
              </Badge>
            )}
          </div>
        )}
      </div>
    </>
  );
}
