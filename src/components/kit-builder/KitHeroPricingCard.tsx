/**
 * Kit Hero Pricing Card — premium sidebar topper
 * Giant unit price with tabular-nums + total + health micro-badge.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/kit-builder';
import { cn } from '@/lib/utils';

interface KitHeroPricingCardProps {
  unitPrice: number;
  total: number;
  kitQuantity: number;
  isValid: boolean;
  hasContent: boolean;
}

export function KitHeroPricingCard({ unitPrice, total, kitQuantity, isValid, hasContent }: KitHeroPricingCardProps) {
  if (!hasContent) {
    return (
      <Card className="border-dashed border-2 border-border/60 bg-gradient-to-br from-muted/30 to-transparent">
        <CardContent className="p-5 text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-display font-semibold">Comece seu kit</p>
          <p className="text-xs text-muted-foreground">Selecione uma caixa para ver o preço</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'overflow-hidden border-primary/20 dark:border-primary/30 relative',
        'bg-gradient-to-br from-card via-card to-primary/[0.04] dark:to-primary/[0.10]',
        'shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.25)] dark:shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.35)]',
      )}
    >
      {/* Subtle decorative glow */}
      <div
        className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
        aria-hidden
      />
      <CardContent className="p-5 relative space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Preço por kit</p>
          {isValid && (
            <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/20 text-[10px] h-5 gap-1">
              <TrendingUp className="h-2.5 w-2.5" /> Pronto
            </Badge>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-display text-4xl font-bold tabular-nums tracking-tight">
            {formatCurrency(unitPrice)}
          </span>
        </div>
        <div className="pt-3 border-t border-border/40 space-y-1.5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">Total ({kitQuantity}x)</span>
            <span className="font-display font-bold text-base tabular-nums text-primary">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
