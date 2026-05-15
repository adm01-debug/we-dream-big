/**
 * PriceSparkline — mini gráfico de linha (60×24) sem eixos, com badge de variação 30d.
 * Consulta tabela `price_history` do Supabase para um produto.
 */
import { useEffect, useState } from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  productId: string;
  className?: string;
}

interface PricePoint {
  date: string;
  price: number;
}

export function PriceSparkline({ productId, className }: Props) {
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: rows } = await supabase
          .from("price_history")
          .select("recorded_at,price")
          .eq("product_id", productId)
          .gte("recorded_at", since)
          .order("recorded_at", { ascending: true })
          .limit(60);
        if (cancelled) return;
        const points = (rows ?? []).map((r: Record<string, unknown>) => ({
          date: r.recorded_at as string,
          price: Number(r.price ?? 0),
        }));
        setData(points);
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [productId]);

  if (loading) {
    return <div className={cn("h-6 w-16 bg-muted/50 rounded animate-pulse", className)} />;
  }

  if (data.length < 2) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-[10px] text-muted-foreground", className)}>
        <Minus className="h-3 w-3" /> sem histórico
      </span>
    );
  }

  const first = data[0].price;
  const last = data[data.length - 1].price;
  const pct = first > 0 ? ((last - first) / first) * 100 : 0;
  const down = pct < -0.5;
  const up = pct > 0.5;

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <div className="w-[60px] h-6">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
            <Line
              type="monotone"
              dataKey="price"
              stroke={down ? "hsl(var(--success))" : up ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))"}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <span
        className={cn(
          "text-[10px] font-medium tabular-nums inline-flex items-center gap-0.5",
          down && "text-success",
          up && "text-destructive",
          !down && !up && "text-muted-foreground"
        )}
      >
        {down && <TrendingDown className="h-3 w-3" />}
        {up && <TrendingUp className="h-3 w-3" />}
        {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
      </span>
    </div>
  );
}
