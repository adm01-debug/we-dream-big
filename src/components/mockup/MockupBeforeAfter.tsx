/**
 * MockupBeforeAfter — Slider comparison between positioning preview and AI result
 */

import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight } from "lucide-react";

interface MockupBeforeAfterProps {
  beforeImage: string; // Product image with logo overlay (positioning preview)
  afterImage: string;  // AI-generated mockup
  className?: string;
}

export function MockupBeforeAfter({
  beforeImage,
  afterImage,
  className,
}: MockupBeforeAfterProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.max(2, Math.min(98, x)));
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative rounded-xl overflow-hidden border-2 border-primary/20 select-none touch-none cursor-col-resize",
        "aspect-square bg-muted/30",
        className
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* After image (full background) */}
      <img
        src={afterImage}
        alt="Mockup gerado pela IA"
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false} loading="lazy" />

      {/* Before image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <img
          src={beforeImage}
          alt="Preview de posicionamento"
          className="absolute top-0 left-0 h-full object-contain"
          style={{ width: `${(1 / (sliderPosition / 100)) * 100}%`, maxWidth: 'none' }}
          draggable={false} loading="lazy" />
      </div>

      {/* Slider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-primary shadow-lg shadow-primary/50 z-10"
        style={{ left: `${sliderPosition}%` }}
      >
        {/* Handle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
          <ArrowLeftRight className="h-5 w-5" />
        </div>
      </div>

      {/* Labels */}
      <Badge
        variant="secondary"
        className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-[10px] z-20"
      >
        Posicionamento
      </Badge>
      <Badge
        variant="secondary"
        className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm text-[10px] z-20"
      >
        IA Gerada
      </Badge>
    </div>
  );
}
