import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, MapPin, Upload, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PersonalizationArea } from "./MultiAreaManager";

interface AreaCardProps {
  area: PersonalizationArea;
  index: number;
  isActive: boolean;
  isReadOnly: boolean;
  canRemove: boolean;
  onSelect: () => void;
  onNameChange: (name: string) => void;
  onLogoUpload: (file: File) => void;
  onLogoRemove: () => void;
  onRemove: () => void;
}

export const AreaCard = memo(({
  area,
  index,
  isActive,
  isReadOnly,
  canRemove,
  onSelect,
  onNameChange,
  onLogoUpload,
  onLogoRemove,
  onRemove,
}: AreaCardProps) => {
  

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      onLogoUpload(file);
    }
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2.5 rounded-lg border transition-all duration-200 cursor-pointer group",
        isActive
          ? "border-primary/60 bg-primary/5 shadow-sm shadow-primary/10"
          : "border-border/30 hover:border-primary/40 hover:bg-muted/50"
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      data-testid={`mockup-area-card-${area.id}`}
      aria-pressed={isActive}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
    >
      {/* Step number */}
      <div className={cn(
        "flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all duration-200",
        isActive
          ? "bg-primary text-primary-foreground scale-110"
          : "bg-primary/10 text-primary"
      )}>
        {index + 1}
      </div>
      
      {/* Area name */}
      <div className="flex-1 min-w-0">
        {isReadOnly ? (
          <>
            <span className={cn("text-sm block truncate", isActive && "font-medium")}>
              {area.name}
            </span>
            {(area.maxWidthCm || area.maxHeightCm || area.techniquesAvailable) && (
              <span className="text-[10px] text-muted-foreground block truncate">
                {area.maxWidthCm && area.maxHeightCm && (
                  <>{area.maxWidthCm}×{area.maxHeightCm}cm</>
                )}
                {area.techniquesAvailable ? (
                  <> · {area.techniquesAvailable} {area.techniquesAvailable === 1 ? 'técnica' : 'técnicas'}</>
                ) : null}
                {area.maxColors ? <> · até {area.maxColors} cor{area.maxColors > 1 ? 'es' : ''}</> : null}
                {area.isCurved ? <> · curvo</> : null}
              </span>
            )}
          </>
        ) : (
          <Input
            value={area.name}
            onChange={(e) => {
              e.stopPropagation();
              onNameChange(e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0",
              isActive && "font-medium"
            )}
            placeholder="Nome da área"
            aria-label={`Nome da área ${index + 1}`}
          />
        )}
      </div>

      {/* Logo indicator / upload button */}
      {area.logoPreview ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Logo thumbnail */}
          <div className="relative h-7 w-7 rounded border border-border/30 bg-background overflow-hidden">
            
<img src={area.logoPreview} alt="Logo" className="w-full h-full object-contain"  loading="lazy" />
          </div>

          {/* Replace button */}
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              aria-label={`Substituir logo de ${area.name}`}
            />
            <Button
              variant="ghost"
              size="icon" aria-label="Atualizar"
              className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 pointer-events-none"
              title="Substituir logo"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Remove logo button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              onLogoRemove();
            }}
            title="Remover logo"
            aria-label={`Remover logo de ${area.name}`}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <>
          {/* Position indicator - before upload button */}
          <div className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
            <MapPin className="h-3 w-3" />
            <span>{area.positionX}%</span>
            <span>×</span>
            <span>{area.positionY}%</span>
          </div>

          {/* Upload button - far right */}
          <div className="relative flex-shrink-0">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              id={`logo-upload-${area.id}`}
              data-testid={`mockup-logo-upload-input-${area.id}`}
              aria-label={`Upload logo para ${area.name}`}
            />
            <Button
              variant="default"
              size="sm"
              className="h-7 px-3 text-xs font-semibold gap-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm pointer-events-none"
            >
              <Upload className="h-3 w-3" />
              Adicionar Logo
            </Button>
          </div>
        </>
      )}

      {/* Remove area button */}
      {!isReadOnly && canRemove && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity",
            "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remover área ${area.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
});
