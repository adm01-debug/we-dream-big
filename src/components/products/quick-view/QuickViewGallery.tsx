/**
 * Image gallery section for ProductQuickView — extracted for modularity
 */
import { useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles, Layers, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCdnUrl, getSrcSet, type ProductImageMeta } from "@/utils/image-utils";

interface QuickViewGalleryProps {
  productName: string;
  images: string[];
  displayImages: ProductImageMeta[];
  currentImageIndex: number;
  onIndexChange: (index: number) => void;
  featured?: boolean;
  newArrival?: boolean;
  isKit?: boolean;
}

export function QuickViewGallery({
  productName, images, displayImages, currentImageIndex, onIndexChange,
  featured, newArrival, isKit,
}: QuickViewGalleryProps) {
  const [imageError, setImageError] = useState(false);

  const currentImage = displayImages[currentImageIndex] || displayImages[0];
  const currentImageUrl = currentImage ? getCdnUrl(currentImage.url_cdn, 'large') : '/placeholder.svg';
  const currentImageSrcSet = currentImage ? getSrcSet(currentImage.url_cdn) : undefined;
  const currentAlt = currentImage?.alt_text || `${productName} - Imagem ${currentImageIndex + 1}`;

  const handlePrev = () => {
    setImageError(false);
    onIndexChange(currentImageIndex === 0 ? displayImages.length - 1 : currentImageIndex - 1);
  };

  const handleNext = () => {
    setImageError(false);
    onIndexChange(currentImageIndex === displayImages.length - 1 ? 0 : currentImageIndex + 1);
  };

  return (
    <div className="relative bg-white aspect-square md:aspect-auto md:min-h-[500px]">
      {/* Badges */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        {featured && (
          <Badge className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-lg">
            <Sparkles className="h-3 w-3 mr-1" />Destaque
          </Badge>
        )}
        {newArrival && (
          <Badge className="bg-gradient-to-r from-info to-info/80 text-info-foreground shadow-md">Novidade</Badge>
        )}
        {isKit && (
          <Badge className="bg-gradient-to-r from-warning to-warning/80 text-warning-foreground shadow-md">
            <Layers className="h-3 w-3 mr-1" />KIT
          </Badge>
        )}
      </div>

      {/* Main Image */}
      <div className="relative w-full h-full flex items-center justify-center">
        {(imageError || currentImageUrl === '/placeholder.svg') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted/30">
            <ImageOff className="h-16 w-16 mb-2 opacity-50" />
            <p className="text-sm">Imagem não disponível</p>
          </div>
        )}
        {currentImageUrl !== '/placeholder.svg' && (
          <img
            key={`${currentImageIndex}`}
            src={currentImageUrl}
            srcSet={currentImageSrcSet}
            sizes="(max-width: 768px) 100vw, 50vw"
            alt={currentAlt}
            title={currentImage?.title_text || productName}
            className="w-full h-full object-contain p-8 animate-fade-in"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.dataset.fallback && currentImage?.url_original) {
                img.dataset.fallback = '1'; img.srcset = ''; img.src = currentImage.url_original;
              } else if (!img.dataset.fallback2) {
                img.dataset.fallback2 = '1';
                const legacyImg = images[currentImageIndex] || images[0];
                if (legacyImg) { img.srcset = ''; img.src = legacyImg; } else setImageError(true);
              } else setImageError(true);
            }}
          />
        )}
      </div>

      {/* Navigation */}
      {displayImages.length > 1 && (
        <>
          <Button variant="secondary" size="icon" aria-label="Voltar"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/90 backdrop-blur-md shadow-lg hover:bg-card"
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="secondary" size="icon" aria-label="Avançar"
            className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/90 backdrop-blur-md shadow-lg hover:bg-card"
            onClick={(e) => { e.stopPropagation(); handleNext(); }}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </>
      )}

      {/* Dots */}
      {displayImages.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {displayImages.map((_, idx) => (
            <button type="button" key={idx}
              className={cn("w-2.5 h-2.5 rounded-full transition-all duration-200",
                idx === currentImageIndex ? "bg-primary scale-110" : "bg-muted-foreground/30 hover:bg-muted-foreground/50")}
              onClick={(e) => { e.stopPropagation(); setImageError(false); onIndexChange(idx); }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
