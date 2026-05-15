import { AlertCircle, AlertTriangle, XCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { StockAlert } from "@/types/stock";

const severityStyles = {
  info: 'border-primary/30 bg-primary/5 hover:bg-primary/8',
  warning: 'border-warning/30 bg-warning/5 hover:bg-warning/8',
  error: 'border-destructive/30 bg-destructive/5 hover:bg-destructive/8',
};

const severityIcons = {
  info: <AlertCircle className="h-4 w-4 text-primary shrink-0" />,
  warning: <AlertTriangle className="h-4 w-4 text-warning shrink-0" />,
  error: <XCircle className="h-4 w-4 text-destructive shrink-0" />,
};

export function AlertCard({ alert, onDismiss }: { alert: StockAlert; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-all duration-200",
        severityStyles[alert.severity],
      )}
      role="alert"
    >
      <div className="mt-0.5">{severityIcons[alert.severity]}</div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{alert.productName}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1 rounded">
            {alert.productSku}
          </span>
          {alert.suggestedAction && (
            <span className="text-[10px] text-primary font-medium">
              → {alert.suggestedAction}
            </span>
          )}
        </div>
      </div>
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-60 hover:opacity-100" onClick={onDismiss} aria-label={`Dispensar alerta de ${alert.productName}`}>
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
