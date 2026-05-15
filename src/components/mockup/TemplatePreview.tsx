import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TemplateArea {
  name: string;
  positionX: number;
  positionY: number;
  logoWidth: number;
  logoHeight: number;
}

interface TemplatePreviewProps {
  areas: TemplateArea[];
  className?: string;
  showTooltips?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeConfig = {
  sm: { container: "w-16 h-16", dot: { min: 6, max: 14 }, text: "text-[6px]", label: "text-[6px]" },
  md: { container: "w-20 h-20", dot: { min: 8, max: 20 }, text: "text-[8px]", label: "text-[8px]" },
  lg: { container: "w-28 h-28", dot: { min: 10, max: 24 }, text: "text-[10px]", label: "text-[9px]" },
};

export function TemplatePreview({ 
  areas, 
  className,
  showTooltips = true,
  size = "md"
}: TemplatePreviewProps) {
  const config = sizeConfig[size];
  const maxSize = Math.max(...areas.map(a => Math.max(a.logoWidth, a.logoHeight)), 1);

  const renderAreaMarker = (area: TemplateArea, index: number) => {
    const normalizedSize = config.dot.min + 
      ((Math.max(area.logoWidth, area.logoHeight) / maxSize) * (config.dot.max - config.dot.min));

    const marker = (
      <div
        className={cn(
          "absolute transform -translate-x-1/2 -translate-y-1/2",
          "flex items-center justify-center rounded-full",
          "bg-primary text-primary-foreground font-bold",
          "shadow-sm border border-primary-foreground/20",
          "transition-transform duration-200 hover:scale-110",
          config.text
        )}
        style={{
          left: `${area.positionX}%`,
          top: `${area.positionY}%`,
          width: `${normalizedSize}px`,
          height: `${normalizedSize}px`,
        }}
        aria-label={`Área ${index + 1}: ${area.name}`}
      >
        {index + 1}
      </div>
    );

    if (!showTooltips) return <div key={index}>{marker}</div>;

    return (
      <TooltipProvider key={index} delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            {marker}
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="space-y-1">
              <p className="font-medium">{area.name}</p>
              <p className="text-muted-foreground">
                {area.logoWidth}×{area.logoHeight} cm
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div
      className={cn(
        "relative rounded-md border border-border bg-muted/50",
        "transition-all duration-200",
        config.container,
        className
      )}
      role="img"
      aria-label={`Template com ${areas.length} ${areas.length === 1 ? "área" : "áreas"} de personalização`}
    >
      {/* Grid lines for visual reference */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" aria-hidden="true">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-border" />
      </div>

      {/* Area markers */}
      {areas.map((area, index) => renderAreaMarker(area, index))}

      {/* Legend */}
      <div className="absolute -bottom-1 left-0 right-0 flex justify-center" aria-hidden="true">
        <span className={cn(
          "text-muted-foreground bg-background px-1 rounded",
          config.label
        )}>
          {areas.length} {areas.length === 1 ? "área" : "áreas"}
        </span>
      </div>
    </div>
  );
}

// Versão expandida para visualização detalhada
interface TemplatePreviewExpandedProps extends TemplatePreviewProps {
  productImage?: string;
  onAreaClick?: (index: number, area: TemplateArea) => void;
}

export function TemplatePreviewExpanded({
  areas,
  className,
  productImage,
  onAreaClick,
}: TemplatePreviewExpandedProps) {
  return (
    <div 
      className={cn(
        "relative w-full aspect-square rounded-lg border border-border overflow-hidden bg-muted/30",
        className
      )}
    >
      {productImage && (
        <img loading="lazy" src={productImage} 
          alt="Produto" 
          className="absolute inset-0 w-full h-full object-contain opacity-30"
         loading="lazy"/>
      )}
      
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" aria-hidden="true">
        <div className="absolute left-1/4 top-0 bottom-0 w-px bg-border" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
        <div className="absolute left-3/4 top-0 bottom-0 w-px bg-border" />
        <div className="absolute top-1/4 left-0 right-0 h-px bg-border" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-border" />
        <div className="absolute top-3/4 left-0 right-0 h-px bg-border" />
      </div>

      {/* Area markers */}
      {areas.map((area, index) => (
        <TooltipProvider key={index} delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onAreaClick?.(index, area)}
                className={cn(
                  "absolute transform -translate-x-1/2 -translate-y-1/2",
                  "flex items-center justify-center rounded-full",
                  "bg-primary text-primary-foreground text-sm font-bold",
                  "shadow-lg border-2 border-primary-foreground/30",
                  "transition-all duration-200",
                  "hover:scale-110 hover:shadow-xl",
                  onAreaClick && "cursor-pointer"
                )}
                style={{
                  left: `${area.positionX}%`,
                  top: `${area.positionY}%`,
                  width: '32px',
                  height: '32px',
                }}
                aria-label={`Selecionar área ${index + 1}: ${area.name}`}
              >
                {index + 1}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <div className="space-y-1">
                <p className="font-medium">{area.name}</p>
                <p className="text-xs text-muted-foreground">
                  Tamanho: {area.logoWidth}×{area.logoHeight} cm
                </p>
                <p className="text-xs text-muted-foreground">
                  Posição: {area.positionX}%, {area.positionY}%
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
}
