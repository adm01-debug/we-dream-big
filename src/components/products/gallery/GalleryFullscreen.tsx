/**
 * GalleryFullscreen — Dialog fullscreen com zoom e navegação
 */

import { Play, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getCdnUrl } from "@/utils/image-utils";

interface GalleryFullscreenProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allMedia: string[];
  selectedIndex: number;
  productName: string;
  imageCount: number;
  isVideo: (index: number) => boolean;
  zoom: number;
  pan: { x: number; y: number };
  isPanning: boolean;
  isImageLoading: boolean;
  isAnimating: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onGoNext: () => void;
  onGoPrevious: () => void;
  onSelectIndex: (index: number) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onWheel: (e: React.WheelEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function GalleryFullscreen({
  open, onOpenChange, allMedia, selectedIndex, productName, imageCount,
  isVideo, zoom, pan, isPanning, isImageLoading, isAnimating,
  onZoomIn, onZoomOut, onResetZoom, onGoNext, onGoPrevious, onSelectIndex,
  onMouseDown, onMouseMove, onMouseUp, onWheel, onKeyDown,
}: GalleryFullscreenProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onOpenChange(false); onResetZoom(); } }}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden" onKeyDown={onKeyDown}>
        <div
          className="relative bg-white w-full h-full overflow-hidden"
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
        >
          {!isVideo(selectedIndex) && <div className="absolute inset-0 bg-white" />}
          {isVideo(selectedIndex) ? (
            <video src={allMedia[selectedIndex]} controls className="w-full h-full object-contain animate-fade-in" />
          ) : (
            <img
              src={allMedia[selectedIndex]}
              alt={`${productName} - Imagem ${selectedIndex + 1}`}
              className={cn(
                "w-full h-full object-contain transition-all duration-700 ease-out",
                zoom > 1 && "cursor-grab",
                isPanning && "cursor-grabbing",
                isAnimating && "scale-95 opacity-80",
                isImageLoading ? "opacity-40 blur-md scale-105" : "opacity-100 blur-0 scale-100"
              )}
              style={{ transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)` }}
              draggable={false}
            />
          )}

          {/* Navigation */}
          {allMedia.length > 1 && (
            <>
              <Button variant="secondary" size="icon"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/90 backdrop-blur-md shadow-lg border border-border/50 hover:bg-card hover:scale-110 transition-all duration-200"
                onClick={onGoPrevious} aria-label="Voltar"
              ><ChevronLeft className="h-5 w-5" /></Button>
              <Button variant="secondary" size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-card/90 backdrop-blur-md shadow-lg border border-border/50 hover:bg-card hover:scale-110 transition-all duration-200"
                onClick={onGoNext} aria-label="Avançar"
              ><ChevronRight className="h-5 w-5" /></Button>
            </>
          )}

          {/* Counter */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur-md shadow-lg border border-border/50">
            <span className="text-xs font-semibold">{selectedIndex + 1} / {allMedia.length}</span>
            <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${((selectedIndex + 1) / allMedia.length) * 100}%` }} />
            </div>
          </div>

          {/* Zoom controls */}
          {!isVideo(selectedIndex) && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
              <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-card/90 backdrop-blur-md shadow-lg border border-border/50 hover:bg-card transition-all duration-200"
                onClick={onZoomOut} disabled={zoom <= 1} aria-label="Reduzir"
              ><ZoomOut className="h-3.5 w-3.5" /></Button>
              {zoom > 1 && (
                <span className="text-[10px] font-semibold text-foreground px-1.5 py-0.5 rounded bg-card/90 backdrop-blur-md border border-border/50">
                  {Math.round(zoom * 100)}%
                </span>
              )}
              <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full bg-card/90 backdrop-blur-md shadow-lg border border-border/50 hover:bg-card transition-all duration-200"
                onClick={onZoomIn} disabled={zoom >= 4} aria-label="Ampliar"
              ><ZoomIn className="h-3.5 w-3.5" /></Button>
            </div>
          )}
        </div>

        {/* Thumbnails strip */}
        {allMedia.length > 1 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto scrollbar-thin border-t border-border/40">
            {allMedia.map((media, index) => (
              <button
                key={index}
                onClick={() => onSelectIndex(index)}
                className={cn(
                  "relative shrink-0 w-14 h-14 rounded-lg overflow-hidden transition-all duration-200",
                  selectedIndex === index
                    ? "ring-2 ring-primary ring-offset-1 ring-offset-card"
                    : "opacity-50 hover:opacity-100"
                )}
              >
                {isVideo(index) ? (
                  <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
                    <Play className="h-4 w-4 text-foreground" />
                  </div>
                ) : (
                  <img src={getCdnUrl(media, 'thumbnail')} alt={`${productName} - ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
                )}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
