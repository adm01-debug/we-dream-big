/**
 * MockupLightbox — Dialog de visualização ampliada de mockup
 * Extraído de MockupHistoryPanel.tsx
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Download, RotateCcw, Clock, X, MapPin, ZoomIn, ZoomOut,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ShareMenu } from "./ShareMenu";
import type { GeneratedMockup } from "@/hooks/mockup/mockupGenerationService";

// GeneratedMockup importado de @/hooks/mockup/mockupGenerationService (SSOT)

interface MockupLightboxProps {
  mockup: GeneratedMockup | null;
  onClose: () => void;
  onLoadFromHistory: (mockup: GeneratedMockup) => void;
  onDownload: (url: string) => void;
}

export function MockupLightbox({ mockup, onClose, onLoadFromHistory, onDownload }: MockupLightboxProps) {
  const [zoom, setZoom] = useState(1);

  const handleClose = () => {
    setZoom(1);
    onClose();
  };

  return (
    <Dialog open={!!mockup} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto h-auto p-0 border-0 bg-black [&>button]:hidden">
        {mockup && (
          <div className="relative flex flex-col w-full h-full">
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-card border-b border-border shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-primary-foreground truncate">{mockup.product_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {mockup.product_sku && <span className="text-[10px] text-muted-foreground font-mono">{mockup.product_sku}</span>}
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{mockup.technique_name}</Badge>
                    {mockup.location_name && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <MapPin className="h-2.5 w-2.5" /> {mockup.location_name}
                      </span>
                    )}
                  </div>
                </div>
                {mockup.client_name && (
                  <Badge variant="outline" className="text-[10px] border-primary/40 text-primary shrink-0">👤 {mockup.client_name}</Badge>
                )}
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(mockup.created_at), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-4">
                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs border-border bg-muted text-foreground hover:bg-muted"
                  onClick={() => onLoadFromHistory(mockup)}><RotateCcw className="h-3.5 w-3.5" /> Regenerar</Button>
                <ShareMenu mockupUrl={mockup.mockup_url} productName={mockup.product_name} techniqueName={mockup.technique_name} />
                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs border-border bg-muted text-foreground hover:bg-muted"
                  onClick={() => onDownload(mockup.layout_url || mockup.mockup_url)}><Download className="h-3.5 w-3.5" /> Baixar PDF</Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary-foreground hover:bg-muted"
                  onClick={handleClose} aria-label="Fechar"><X className="h-4 w-4" /></Button>
              </div>
            </div>

            {/* Image */}
            <div className="flex-1 overflow-auto flex items-center justify-center"
              style={{ cursor: zoom > 1 ? "grab" : "default", minHeight: "70vh" }}>
              <img src={mockup.layout_url || mockup.mockup_url} alt={`Mockup de ${mockup.product_name}`}
                className="max-h-[82vh] object-contain select-none"
                style={{ transform: `scale(${zoom})`, transition: "transform 0.15s ease-out", imageRendering: zoom > 1.5 ? "auto" : undefined }}
                draggable={false} />
            </div>

            {/* Zoom bar */}
            <div className="flex items-center justify-center py-2 bg-card border-t border-border shrink-0">
              <div className="flex items-center gap-1">
                <Button size="icon" aria-label="Reduzir" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary-foreground hover:bg-muted"
                  onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))} disabled={zoom <= 0.25}><ZoomOut className="h-3.5 w-3.5" /></Button>
                <span className="text-xs font-medium w-12 text-center text-muted-foreground">{Math.round(zoom * 100)}%</span>
                <Button size="icon" aria-label="Ampliar" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary-foreground hover:bg-muted"
                  onClick={() => setZoom(z => Math.min(z + 0.25, 5))}><ZoomIn className="h-3.5 w-3.5" /></Button>
                <Button size="icon" aria-label="Resetar zoom" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary-foreground hover:bg-muted"
                  onClick={() => setZoom(1)}><RotateCcw className="h-3 w-3" /></Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
