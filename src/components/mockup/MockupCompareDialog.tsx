/**
 * MockupCompareDialog — Side-by-side comparison of selected mockups from history
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface CompareMockup {
  id: string;
  product_name: string;
  technique_name: string;
  mockup_url: string;
  layout_url?: string | null;
  created_at: string;
  bitrix_clients?: { name: string } | null;
}

interface MockupCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mockups: CompareMockup[];
  onDownload: (url: string) => void;
}

export function MockupCompareDialog({
  open,
  onOpenChange,
  mockups,
  onDownload,
}: MockupCompareDialogProps) {
  if (mockups.length === 0) return null;

  const gridCols = mockups.length === 2 ? "grid-cols-2" : mockups.length === 3 ? "grid-cols-3" : "grid-cols-2 lg:grid-cols-4";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-auto p-0 border-0 bg-background/95 backdrop-blur-xl [&>button]:hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-semibold">Comparação de Mockups</h2>
              <Badge variant="secondary">{mockups.length} selecionados</Badge>
            </div>
            <Button variant="ghost" size="icon" aria-label="Fechar" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Grid */}
          <div className={`grid ${gridCols} gap-4 p-4 overflow-auto`}>
            {mockups.map((mockup) => (
              <div key={mockup.id} className="flex flex-col gap-2 border rounded-xl overflow-hidden bg-card">
                <div className="aspect-square bg-muted/30 overflow-hidden">
                  <img
                    src={mockup.layout_url || mockup.mockup_url}
                    alt={mockup.product_name}
                    className="w-full h-full object-contain" loading="lazy" />
                </div>
                <div className="p-3 space-y-1">
                  <p className="font-medium text-sm truncate">{mockup.product_name}</p>
                  <Badge variant="secondary" className="text-[10px]">{mockup.technique_name}</Badge>
                  {mockup.bitrix_clients?.name && (
                    <p className="text-xs text-primary">👤 {mockup.bitrix_clients.name}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(mockup.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                  <Button size="sm" variant="outline" className="w-full mt-1" onClick={() => onDownload(mockup.layout_url || mockup.mockup_url)}>
                    <Download className="h-3.5 w-3.5 mr-1" /> Baixar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
