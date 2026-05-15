/**
 * WizardMockupPreview - Visual preview of engraving on product
 * 
 * Adapted from MockupPreview for the wizard's Personalization type.
 * Shows product image with an overlay representing the engraving area.
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import {
  Eye,
  Image as ImageIcon,
  Palette,
  Move,
  ZoomIn,
  Package,
} from 'lucide-react';
import type { Personalization, SelectedProduct } from '@/types/domain/simulator-wizard';

interface WizardMockupPreviewProps {
  personalization: Personalization;
  product: SelectedProduct;
  clientLogoUrl?: string | null;
}

export function WizardMockupPreview({
  personalization,
  product,
  clientLogoUrl,
}: WizardMockupPreviewProps) {
  const [open, setOpen] = useState(false);
  const [logoScale, setLogoScale] = useState([100]);
  const [logoPosition, setLogoPosition] = useState({ x: 50, y: 45 });

  const logoDimensions = useMemo(() => {
    const scale = logoScale[0] / 100;
    return {
      width: personalization.specs.width * 10 * scale,
      height: personalization.specs.height * 10 * scale,
    };
  }, [personalization.specs, logoScale]);

  const techniqueFilter = useMemo(() => {
    const code = personalization.technique.code.toUpperCase();
    if (code.includes('BORD')) return { filter: 'contrast(1.1)', mixBlendMode: 'multiply' as const };
    if (code.includes('SILK') || code.includes('SERI')) return { opacity: 0.95, filter: 'saturate(1.2)' };
    if (code.includes('SUB') || code.includes('DTF')) return { filter: 'brightness(1.05) saturate(1.1)' };
    if (code.includes('LASER')) return { filter: 'grayscale(0.5) contrast(1.2)' };
    return {};
  }, [personalization.technique.code]);

  if (!product.imageUrl) {
    return (
      <Button variant="ghost" size="sm" disabled className="gap-1.5 opacity-50">
        <ImageIcon className="h-4 w-4" />
        Preview
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Eye className="h-4 w-4" />
          Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Preview da Gravação
          </DialogTitle>
          <DialogDescription>
            Visualização aproximada — {personalization.technique.name} em {personalization.location.locationName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mockup */}
          <div className="relative aspect-square rounded-xl bg-muted/30 border overflow-hidden">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-contain"
             loading="lazy"/>

            {clientLogoUrl ? (
              <div
                className="absolute pointer-events-none transition-all duration-200"
                style={{
                  left: `${logoPosition.x}%`,
                  top: `${logoPosition.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: `${logoDimensions.width}px`,
                  height: `${logoDimensions.height}px`,
                  ...techniqueFilter,
                }}
              >
                
<img src={clientLogoUrl} alt="Logo" className="w-full h-full object-contain"  loading="lazy"/>
              </div>
            ) : (
              <div
                className="absolute border-2 border-dashed border-primary/50 rounded-lg bg-primary/10 flex items-center justify-center"
                style={{
                  left: `${logoPosition.x}%`,
                  top: `${logoPosition.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: `${logoDimensions.width}px`,
                  height: `${logoDimensions.height}px`,
                }}
              >
                <div className="text-center p-2">
                  <Palette className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-[10px] text-primary font-medium">
                    {personalization.specs.width}×{personalization.specs.height}cm
                  </p>
                </div>
              </div>
            )}

            <Badge className="absolute top-2 left-2 text-xs" variant="secondary">
              {personalization.technique.name}
            </Badge>
            <Badge className="absolute top-2 right-2 text-xs bg-black/70 text-primary-foreground border-white/20 backdrop-blur-sm" variant="outline">
              {personalization.location.locationName}
            </Badge>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl border space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Package className="h-4 w-4 text-primary" />
                {product.name}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground text-xs">Área</p>
                  <p className="font-semibold">{personalization.specs.width}×{personalization.specs.height}cm</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground text-xs">Cores</p>
                  <p className="font-semibold">{personalization.specs.colors}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl border space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <ZoomIn className="h-4 w-4" />
                    Escala
                  </label>
                  <span className="text-sm text-muted-foreground">{logoScale[0]}%</span>
                </div>
                <Slider value={logoScale} onValueChange={setLogoScale} min={50} max={150} step={5} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Move className="h-3 w-3" /> Posição X
                  </label>
                  <Slider
                    value={[logoPosition.x]}
                    onValueChange={([x]) => setLogoPosition(p => ({ ...p, x }))}
                    min={10} max={90} step={5}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Move className="h-3 w-3" /> Posição Y
                  </label>
                  <Slider
                    value={[logoPosition.y]}
                    onValueChange={([y]) => setLogoPosition(p => ({ ...p, y }))}
                    min={10} max={90} step={5}
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              * Preview ilustrativo. O resultado final pode variar.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
