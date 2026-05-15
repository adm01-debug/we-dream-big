import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, Grid3X3, Share2, Download, X } from "lucide-react";

interface GalleryToolbarProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRotate: () => void;
  onReset: () => void;
  onClose: () => void;
  onShare?: () => void;
  onDownload?: () => void;
}

export function GalleryToolbar({
  zoom, onZoomIn, onZoomOut, onRotate, onReset, onClose, onShare, onDownload,
}: GalleryToolbarProps) {
  return (
    <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-background/80 to-transparent">
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full bg-card/90 shadow-lg" onClick={onZoomOut} disabled={zoom <= 1} aria-label="Reduzir">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="px-3 py-1.5 rounded-full bg-card/90 text-sm font-medium min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </div>
        <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full bg-card/90 shadow-lg" onClick={onZoomIn} disabled={zoom >= 5} aria-label="Ampliar">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full bg-card/90 shadow-lg" onClick={onRotate} aria-label="Rotacionar">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full bg-card/90 shadow-lg" onClick={onReset} aria-label="Reset">
          <Grid3X3 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        {onShare && (
          <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full bg-card/90 shadow-lg" onClick={onShare} aria-label="Compartilhar">
            <Share2 className="h-4 w-4" />
          </Button>
        )}
        {onDownload && (
          <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full bg-card/90 shadow-lg" onClick={onDownload} aria-label="Download">
            <Download className="h-4 w-4" />
          </Button>
        )}
        <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full bg-card/90 shadow-lg" onClick={onClose} aria-label="Fechar">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
