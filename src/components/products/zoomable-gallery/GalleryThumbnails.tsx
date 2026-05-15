import { useState } from "react";
import { cn } from "@/lib/utils";

interface GalleryThumbnailsProps {
  images: string[];
  currentIndex: number;
  onSelect: (index: number) => void;
  className?: string;
}

function BlurThumb({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        "w-full h-full object-cover transition-all duration-500 ease-out",
        loaded ? "opacity-100 blur-0" : "opacity-40 blur-sm"
      )}
      onLoad={() => setLoaded(true)}
    />
  );
}

export function GalleryThumbnails({ images, currentIndex, onSelect, className }: GalleryThumbnailsProps) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-2 scrollbar-thin", className)}>
      {images.map((image, index) => (
        <button
          key={image || index}
          onClick={() => onSelect(index)}
          className={cn(
            "shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
            index === currentIndex
              ? "border-primary ring-2 ring-primary/30"
              : "border-transparent hover:border-primary/50"
          )}
        >
          <BlurThumb src={image} alt={`Thumbnail ${index + 1}`} />
        </button>
      ))}
    </div>
  );
}

export function FullscreenThumbnails({ images, currentIndex, onSelect }: GalleryThumbnailsProps) {
  return (
    <div className="flex gap-2 justify-center overflow-x-auto">
      {images.map((image, index) => (
        <button
          key={image || index}
          onClick={() => onSelect(index)}
          className={cn(
            "shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
            index === currentIndex
              ? "border-primary ring-2 ring-primary/30"
              : "border-transparent hover:border-primary/50 opacity-60 hover:opacity-100"
          )}
        >
          <BlurThumb src={image} alt={`Thumbnail ${index + 1}`} />
        </button>
      ))}
    </div>
  );
}

export { BlurThumb };
