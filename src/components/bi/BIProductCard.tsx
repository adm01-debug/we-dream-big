/**
 * BIProductCard — card unificado para sugestão de produto no BI.
 * Suporta imagem real do catálogo e link para a página do produto quando disponível.
 */
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Package, ExternalLink } from "lucide-react";

interface Props {
  name: string;
  category?: string;
  priceFrom?: number;
  priceTo?: number;
  reason?: string;
  variant?: "affinity" | "trend" | "expert";
  clientId?: string;
  imageUrl?: string | null;
  productId?: string | null;
}

const variantConfig = {
  affinity: { label: "Cliente já compra", className: "bg-primary/10 text-primary border-primary/30" },
  trend: { label: "Tendência do setor", className: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30" },
  expert: { label: "Sugestão do especialista", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" },
};

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

export function BIProductCard({
  name,
  category,
  priceFrom,
  priceTo,
  reason,
  variant = "affinity",
  clientId,
  imageUrl,
  productId,
}: Props) {
  const navigate = useNavigate();
  const cfg = variantConfig[variant];

  return (
    <Card className="border-[1.5px] hover:shadow-md hover:border-primary/40 transition-all group overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          {imageUrl ? (
            <div className="h-14 w-14 rounded-lg bg-muted/40 overflow-hidden shrink-0 border">
              <img
                src={imageUrl}
                alt={name}
                loading="lazy"
                className="h-full w-full object-contain group-hover:scale-105 transition-transform"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          ) : (
            <div className="h-12 w-12 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.className}`}>
              {cfg.label}
            </Badge>
            <h4 className="font-medium text-sm mt-1 leading-tight line-clamp-2">{name}</h4>
            {category && <div className="text-xs text-muted-foreground mt-0.5">{category}</div>}
          </div>
        </div>

        {reason && (
          <p className="text-xs text-muted-foreground italic leading-snug border-l-2 border-primary/30 pl-2">
            {reason}
          </p>
        )}

        {priceFrom !== undefined && priceTo !== undefined && priceFrom > 0 && (
          <div className="text-sm font-display font-semibold">
            {fmtBRL(priceFrom)} <span className="text-muted-foreground font-normal text-xs">a</span> {fmtBRL(priceTo)}
          </div>
        )}

        <div className="flex gap-2">
          {productId && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs px-2"
              onClick={() => navigate(`/produto/${productId}`)}
              aria-label="Ver detalhes do produto"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs"
            onClick={() => {
              const params = new URLSearchParams();
              if (clientId) params.set("clientId", clientId);
              if (productId) params.set("productId", productId);
              navigate(`/orcamentos/novo${params.toString() ? `?${params}` : ""}`);
            }}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            Adicionar a Orçamento
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
