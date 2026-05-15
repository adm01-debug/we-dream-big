/**
 * ClientHealthHero — primeiro card no topo do BI.
 * Score 0-100 + tier semântico + insight cross-zona + chips de ação + CTA principal.
 */
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Activity,
  Sparkles,
  ArrowRight,
  Phone,
  CalendarClock,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Info,
  Star,
  Target as TargetIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientHealthScore } from "@/hooks/bi/useClientHealthScore";
import { useClientAffinity } from "@/hooks/bi/useClientAffinity";
import { useIndustryTrends } from "@/hooks/bi/useIndustryTrends";
import { useClientCategoryAffinity } from "@/hooks/bi/useClientCategoryAffinity";
import { useIndustryCategoryTrends } from "@/hooks/bi/useIndustryCategoryTrends";
import { ConfirmQuoteSuggestionsModal, type SuggestionItem } from "./ConfirmQuoteSuggestionsModal";

interface Props {
  clientId: string;
  ramoAtividade: string | null;
  clientName: string;
}

const TIER_STYLES = {
  healthy: {
    ring: "ring-emerald-500/40",
    bgGradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
    badgeBg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    scoreText: "text-emerald-600 dark:text-emerald-400",
    progressBar: "[&>div]:bg-emerald-500",
    icon: CheckCircle2,
    label: "Saudável",
  },
  attention: {
    ring: "ring-amber-500/40",
    bgGradient: "from-amber-500/10 via-amber-500/5 to-transparent",
    badgeBg: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    scoreText: "text-amber-600 dark:text-amber-400",
    progressBar: "[&>div]:bg-amber-500",
    icon: AlertTriangle,
    label: "Atenção",
  },
  risk: {
    ring: "ring-red-500/40",
    bgGradient: "from-red-500/10 via-red-500/5 to-transparent",
    badgeBg: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
    scoreText: "text-red-600 dark:text-red-400",
    progressBar: "[&>div]:bg-red-500",
    icon: AlertTriangle,
    label: "Risco",
  },
  unknown: {
    ring: "ring-muted",
    bgGradient: "from-muted/30 to-transparent",
    badgeBg: "bg-muted text-muted-foreground border-border",
    scoreText: "text-muted-foreground",
    progressBar: "",
    icon: Info,
    label: "Calculando",
  },
};

export function ClientHealthHero({ clientId, ramoAtividade, clientName }: Props) {
  const health = useClientHealthScore(clientId, ramoAtividade);
  const affinity = useClientAffinity(clientId);
  const trends = useIndustryTrends(ramoAtividade);
  const clientCats = useClientCategoryAffinity(clientId);
  const industryCats = useIndustryCategoryTrends(ramoAtividade);
  const [open, setOpen] = useState(false);

  // Categoria favorita do cliente (top 1 por receita)
  const favoriteCategory = clientCats.favorite;
  // Categoria-oportunidade: setor compra muito, cliente quase nada
  const opportunityCategory = useMemo(() => {
    const clientSlugs = new Set(clientCats.categories.map((c) => c.slug));
    return industryCats.categories
      .filter((ic) => ic.revenueSharePct >= 8 && !clientSlugs.has(ic.slug))
      .sort((a, b) => b.revenueSharePct - a.revenueSharePct)[0] ?? null;
  }, [clientCats.categories, industryCats.categories]);

  const styles = TIER_STYLES[health.tier];
  const Icon = styles.icon;

  // Monta sugestões: top 3 afinidade + top 2 tendência setor
  const suggestions = useMemo<SuggestionItem[]>(() => {
    const list: SuggestionItem[] = [];
    const affList = affinity.data?.categories?.flatMap((c) =>
      c.suggestions.slice(0, 1).map((s) => ({
        name: s.name,
        priceFrom: s.priceFrom,
        priceTo: s.priceTo,
        reason: s.reason,
        productId: s.productId ?? null,
        imageUrl: s.imageUrl ?? null,
        source: "affinity" as const,
      })),
    ) ?? [];
    list.push(...affList.slice(0, 3));

    const trendList = (trends.data?.trends ?? []).slice(0, 5).map((t) => ({
      name: t.productName,
      priceFrom: Math.round(t.avgPrice * 0.9),
      priceTo: Math.round(t.avgPrice * 1.15),
      reason: `Top ${t.category} no setor (${t.unitsSold.toLocaleString("pt-BR")} un)`,
      productId: t.productId ?? null,
      imageUrl: t.imageUrl ?? null,
      source: "industry" as const,
    }));

    const seen = new Set(list.map((i) => i.name.toLowerCase()));
    for (const t of trendList) {
      if (!seen.has(t.name.toLowerCase())) {
        list.push(t);
        seen.add(t.name.toLowerCase());
      }
      if (list.length >= 5) break;
    }
    return list.slice(0, 5);
  }, [affinity.data, trends.data]);

  if (health.isLoading) {
    return (
      <Card className="border-[1.5px]">
        <CardContent className="p-6 space-y-4">
          <div className="flex gap-4">
            <Skeleton className="h-28 w-28 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const breakdownEntries = Object.values(health.breakdown);

  return (
    <>
      <Card
        className={cn(
          "border-[1.5px] ring-1 overflow-hidden bg-gradient-to-br",
          styles.ring,
          styles.bgGradient,
        )}
      >
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">
            {/* Score circular */}
            <div className="flex items-center gap-4 lg:flex-col lg:items-center lg:gap-2 shrink-0">
              <div
                className={cn(
                  "relative h-28 w-28 rounded-2xl flex flex-col items-center justify-center",
                  "bg-background/80 backdrop-blur shadow-sm border-[1.5px]",
                  styles.ring,
                )}
              >
                <span
                  className={cn(
                    "font-display font-bold text-4xl leading-none tabular-nums",
                    styles.scoreText,
                  )}
                >
                  {health.score}
                </span>
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-1">
                  Health Score
                </span>
              </div>
              <Badge
                variant="outline"
                className={cn("gap-1 border", styles.badgeBg, "lg:w-full justify-center")}
              >
                <Icon className="h-3 w-3" />
                {styles.label}
              </Badge>
            </div>

            {/* Conteúdo central */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Diagnóstico do cliente
                    </span>
                  </div>
                  <h2 className="font-display font-bold text-lg sm:text-xl mt-1 truncate max-w-[40ch]">
                    {clientName}
                  </h2>
                </div>
              </div>

              {/* Insight cross-zona */}
              <p className="text-sm leading-relaxed text-foreground/90">
                {health.crossZoneInsight}
              </p>

              {/* Categoria favorita + oportunidade */}
              {(favoriteCategory || opportunityCategory) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {favoriteCategory && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <Star className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                          Categoria favorita
                        </div>
                        <div className="text-xs font-semibold truncate">
                          {favoriteCategory.label}{" "}
                          <span className="text-muted-foreground font-normal">
                            ({favoriteCategory.revenueSharePct.toFixed(0)}% do total)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  {opportunityCategory && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                      <TargetIcon className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[10px] font-medium text-violet-700 dark:text-violet-300 uppercase tracking-wider">
                          Oportunidade no setor
                        </div>
                        <div className="text-xs font-semibold truncate">
                          {opportunityCategory.label}{" "}
                          <span className="text-muted-foreground font-normal">
                            (setor: {opportunityCategory.revenueSharePct.toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Chips: ação · janela · script */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-background/60 border cursor-help">
                        <Phone className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            Próxima ação
                          </div>
                          <div className="text-xs font-semibold truncate">
                            {health.nextActionLabel}
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">{health.nextActionDetail}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-background/60 border cursor-help">
                        <CalendarClock className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            Janela ideal
                          </div>
                          <div className="text-xs font-semibold truncate">
                            {health.windowLabel}
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Baseado no padrão sazonal histórico do cliente nos últimos 24 meses.
                      </p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-background/60 border cursor-help">
                        <MessageSquare className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            Script sugerido
                          </div>
                          <div className="text-xs font-semibold truncate">Ver abertura</div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p className="text-xs leading-relaxed">"{health.scriptHint}"</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Breakdown */}
              <details className="group">
                <summary className="text-xs text-muted-foreground hover:text-foreground cursor-pointer list-none flex items-center gap-1 select-none">
                  <span>Como esse score é calculado?</span>
                  <ArrowRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                </summary>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {breakdownEntries.map((b) => (
                    <div
                      key={b.label}
                      className="p-2 rounded-md bg-background/60 border space-y-1"
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="text-[10px] text-muted-foreground">{b.label}</span>
                        <span className="text-[10px] font-bold tabular-nums">
                          {Math.round(b.score)}
                        </span>
                      </div>
                      <Progress value={b.score} className={cn("h-1", styles.progressBar)} />
                      <div className="text-[9px] text-muted-foreground">peso {b.weight}%</div>
                    </div>
                  ))}
                </div>
              </details>
            </div>

            {/* CTA */}
            <div className="flex flex-col gap-2 lg:w-56 shrink-0 w-full">
              <Button
                size="lg"
                onClick={() => setOpen(true)}
                className={cn(
                  "w-full gap-2 font-semibold shadow-md",
                  health.ctaUrgent
                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
                    : "",
                )}
              >
                <Sparkles className="h-4 w-4" />
                {health.ctaLabel}
                <ArrowRight className="h-4 w-4 ml-auto" />
              </Button>
              <p className="text-[10px] text-muted-foreground text-center px-1 leading-snug">
                Pré-popula orçamento com top 3 afinidade + top 2 tendência setor
              </p>
              {health.shareOfWalletPct > 0 && (
                <div className="rounded-lg border bg-background/60 p-2.5 mt-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
                    <TrendingUp className="h-3 w-3" />
                    Share-of-wallet
                  </div>
                  <div className="font-display font-bold text-lg leading-tight">
                    {health.shareOfWalletPct}%
                  </div>
                  {health.potentialUntappedBRL > 0 && (
                    <div className="text-[10px] text-muted-foreground">
                      Potencial: R$ {health.potentialUntappedBRL.toLocaleString("pt-BR")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmQuoteSuggestionsModal
        open={open}
        onOpenChange={setOpen}
        clientId={clientId}
        clientName={clientName}
        suggestions={suggestions}
      />
    </>
  );
}
