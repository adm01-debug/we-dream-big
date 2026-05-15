import { toast } from "sonner";
import { CheckCircle2, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MockupSuccessToastProps {
  mockupUrl: string;
  productName?: string;
  techniqueName?: string;
  onDownload: () => void;
}

export function showMockupSuccessToast({
  mockupUrl,
  productName,
  techniqueName,
  onDownload,
}: MockupSuccessToastProps) {
  toast.custom(
    (t) => (
      <div className="w-full max-w-sm bg-card border rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-300">
        {/* Preview Header */}
        <div className="relative h-32 bg-gradient-to-br from-success/20 to-primary/10">
          <img
            src={mockupUrl}
            alt="Mockup gerado"
            className="absolute inset-0 w-full h-full object-contain p-2" loading="lazy" />
          <div className="absolute top-2 right-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/90 text-success-foreground text-xs font-medium">
              <CheckCircle2 className="h-3 w-3" />
              Criado!
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div>
            <h4 className="font-semibold text-foreground">
              Mockup gerado com sucesso! 🎉
            </h4>
            {productName && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {productName}
                {techniqueName && ` • ${techniqueName}`}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                onDownload();
                toast.dismiss(t);
              }}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Baixar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                window.open(mockupUrl, "_blank");
                toast.dismiss(t);
              }}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    ),
    {
      duration: 8000,
      position: "top-right",
    }
  );
}
