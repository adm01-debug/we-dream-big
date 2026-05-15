import { Download, Loader2, MessageCircle, RefreshCw, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuoteMobileActionBarProps {
  onDownloadPDF: () => void;
  onWhatsApp: () => void;
  onShare: () => void;
  onSync?: () => void;
  isGeneratingPDF: boolean;
  isSyncing?: boolean;
}

export function QuoteMobileActionBar({ onDownloadPDF, onWhatsApp, onShare, onSync, isGeneratingPDF, isSyncing }: QuoteMobileActionBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-md border-t px-4 py-3 flex items-center gap-2 print:hidden">
      <Button
        variant="outline"
        size="sm"
        onClick={onWhatsApp}
        className="flex-1 gap-2 text-primary border-primary/30 dark:text-primary dark:border-primary/30"
      >
        <MessageCircle className="h-4 w-4" />
        WhatsApp
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onShare}
        className="gap-2 shrink-0"
      >
        <Share2 className="h-4 w-4" />
      </Button>
      {onSync && (
        <Button
          size="sm"
          onClick={onSync}
          disabled={isSyncing}
          className="flex-1 gap-1 bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
        >
          {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {isSyncing ? "..." : "Sincronizar"}
        </Button>
      )}
      <Button
        size="sm"
        onClick={onDownloadPDF}
        disabled={isGeneratingPDF}
        className="flex-1 gap-2"
      >
        {isGeneratingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        PDF
      </Button>
    </div>
  );
}
