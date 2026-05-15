// src/components/simulator/ScenarioComparison.tsx
// Comparativo de Cenários A vs B

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  GitCompare, 
  Save, 
  Trash2, 
  ArrowRight,
  Trophy,
  TrendingDown,
  Clock,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/hooks/useSimulation";
import type { SimulationOption, Product } from "@/types/simulation";

export interface SimulationScenario {
  id: string;
  name: string;
  productName: string;
  quantity: number;
  options: SimulationOption[];
  bestOption: SimulationOption | null;
  createdAt: Date;
}

interface ScenarioComparisonProps {
  scenarioA: SimulationScenario | null;
  scenarioB: SimulationScenario | null;
  currentSimulation: {
    options: SimulationOption[];
    product: Product | undefined;
    quantity: number;
    bestOption: SimulationOption | null;
  };
  onSaveAsScenario: (name: 'A' | 'B') => void;
  onClearScenario: (name: 'A' | 'B') => void;
}

export function ScenarioComparison({
  scenarioA,
  scenarioB,
  currentSimulation,
  onSaveAsScenario,
  onClearScenario,
}: ScenarioComparisonProps) {
  const [selectedView, setSelectedView] = useState<'compare' | 'details'>('compare');

  const canSave = currentSimulation.options.length > 0;

  // Calculate comparison metrics
  const comparison = scenarioA && scenarioB ? {
    priceDiff: (scenarioB.bestOption?.grandTotal || 0) - (scenarioA.bestOption?.grandTotal || 0),
    priceDiffPercent: scenarioA.bestOption?.grandTotal 
      ? (((scenarioB.bestOption?.grandTotal || 0) - scenarioA.bestOption.grandTotal) / scenarioA.bestOption.grandTotal) * 100
      : 0,
    daysDiff: (scenarioB.bestOption?.estimatedDays || 0) - (scenarioA.bestOption?.estimatedDays || 0),
    winner: (scenarioA.bestOption?.grandTotal || 0) <= (scenarioB.bestOption?.grandTotal || 0) ? 'A' : 'B',
  } : null;

  return (
    <Card className="border-2 border-dashed border-muted-foreground/30">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              <GitCompare className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Comparar Cenários
                <Badge variant="outline" className="text-xs gap-1">
                  <Sparkles className="h-3 w-3" />
                  Beta
                </Badge>
              </CardTitle>
              <CardDescription>
                Salve simulações para comparar lado a lado
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Save Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">Cenário A</span>
              {scenarioA && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => onClearScenario('A')}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
            {scenarioA ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 rounded-lg bg-primary/10 border border-primary/30"
              >
                <p className="font-medium text-sm truncate">{scenarioA.productName}</p>
                <p className="text-xs text-muted-foreground">{scenarioA.quantity} un</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Melhor:</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(scenarioA.bestOption?.grandTotal || 0)}
                  </span>
                </div>
              </motion.div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-20 border-dashed"
                onClick={() => onSaveAsScenario('A')}
                disabled={!canSave}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar como A
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">Cenário B</span>
              {scenarioB && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={() => onClearScenario('B')}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
            {scenarioB ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 rounded-lg bg-primary/15 border border-primary/25"
              >
                <p className="font-medium text-sm truncate">{scenarioB.productName}</p>
                <p className="text-xs text-muted-foreground">{scenarioB.quantity} un</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Melhor:</span>
                  <span className="font-bold text-primary/80">
                    {formatCurrency(scenarioB.bestOption?.grandTotal || 0)}
                  </span>
                </div>
              </motion.div>
            ) : (
              <Button
                variant="outline"
                className="w-full h-20 border-dashed"
                onClick={() => onSaveAsScenario('B')}
                disabled={!canSave}
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar como B
              </Button>
            )}
          </div>
        </div>

        {/* Comparison Result */}
        <AnimatePresence>
          {comparison && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-xl bg-gradient-to-br from-success/10 to-primary/10 border border-success/30">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="h-5 w-5 text-success" />
                  <span className="font-semibold">Resultado da Comparação</span>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  {/* Scenario A */}
                  <div className={cn(
                    "p-3 rounded-lg transition-all",
                    comparison.winner === 'A' && "bg-success/20 ring-2 ring-success"
                  )}>
                    <p className="text-xs text-muted-foreground mb-1">Cenário A</p>
                    <p className="font-bold text-lg">
                      {formatCurrency(scenarioA?.bestOption?.grandTotal || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {scenarioA?.bestOption?.estimatedDays}d
                    </p>
                    {comparison.winner === 'A' && (
                      <Badge className="mt-2 bg-success text-success-foreground">
                        <Trophy className="h-3 w-3 mr-1" />
                        Vencedor
                      </Badge>
                    )}
                  </div>

                  {/* Comparison */}
                  <div className="flex flex-col items-center justify-center">
                    <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    <div className={cn(
                      "mt-2 px-3 py-1 rounded-full text-sm font-medium",
                      comparison.priceDiff > 0 ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                    )}>
                      {comparison.priceDiff > 0 ? (
                        <>
                          <TrendingDown className="h-3 w-3 inline mr-1" />
                          A é {Math.abs(comparison.priceDiffPercent).toFixed(1)}% mais barato
                        </>
                      ) : comparison.priceDiff < 0 ? (
                        <>
                          <TrendingDown className="h-3 w-3 inline mr-1" />
                          B é {Math.abs(comparison.priceDiffPercent).toFixed(1)}% mais barato
                        </>
                      ) : (
                        "Mesmo preço"
                      )}
                    </div>
                    {comparison.daysDiff !== 0 && (
                      <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {comparison.daysDiff > 0 ? `A é ${comparison.daysDiff}d mais rápido` : `B é ${Math.abs(comparison.daysDiff)}d mais rápido`}
                      </div>
                    )}
                  </div>

                  {/* Scenario B */}
                  <div className={cn(
                    "p-3 rounded-lg transition-all",
                    comparison.winner === 'B' && "bg-success/20 ring-2 ring-success"
                  )}>
                    <p className="text-xs text-muted-foreground mb-1">Cenário B</p>
                    <p className="font-bold text-lg">
                      {formatCurrency(scenarioB?.bestOption?.grandTotal || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {scenarioB?.bestOption?.estimatedDays}d
                    </p>
                    {comparison.winner === 'B' && (
                      <Badge className="mt-2 bg-success text-success-foreground">
                        <Trophy className="h-3 w-3 mr-1" />
                        Vencedor
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Savings highlight */}
                {comparison.priceDiff !== 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-card/50 text-center">
                    <p className="text-sm text-muted-foreground">Economia escolhendo {comparison.winner}:</p>
                    <p className="text-2xl font-bold text-success">
                      {formatCurrency(Math.abs(comparison.priceDiff))}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state hint */}
        {!scenarioA && !scenarioB && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <p>Salve duas simulações diferentes para comparar qual oferece melhor custo-benefício</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
