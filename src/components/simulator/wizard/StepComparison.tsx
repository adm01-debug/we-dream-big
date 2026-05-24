/**
 * StepComparison - Passo 4: Comparativo de Técnicas
 * Refatorado: ComparisonCard e ConfirmedSummary extraídos
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3, ChevronLeft, AlertTriangle, Check, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';
import type { TechniqueComparisonResult } from '@/types/domain/simulator-wizard';
import { ComparisonCard } from './ComparisonCard';
import { ConfirmedSummary } from './ConfirmedSummary';

interface StepComparisonProps {
  wizard: UseSimulatorWizardReturn;
}

export function StepComparison({ wizard }: StepComparisonProps) {
  const navigate = useNavigate();
  const { comparisonResults, selectedComparison, selectedLocation, engravingSpecs } = wizard;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const availableResults = comparisonResults.filter(r => r.isAvailable);
  const unavailableResults = comparisonResults.filter(r => !r.isAvailable);

  const toggleTechnique = useCallback((result: TechniqueComparisonResult) => {
    if (!result.isAvailable) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(result.techniqueId)) next.delete(result.techniqueId);
      else next.add(result.techniqueId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === availableResults.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(availableResults.map(r => r.techniqueId)));
  }, [selectedIds.size, availableResults]);

  const handleConfirmSelected = useCallback(() => {
    const selected = availableResults.filter(r => selectedIds.has(r.techniqueId));
    if (selected.length === 0) return;
    selected.forEach(result => wizard.confirmTechnique(result));
    setSelectedIds(new Set());
  }, [availableResults, selectedIds, wizard]);

  const handleGenerateQuote = () => {
    const quoteData = {
      product: wizard.selectedProduct, quantity: wizard.quantity,
      personalizations: wizard.personalizations, totals: wizard.totals,
    };
    navigate('/orcamentos/novo', { state: { fromSimulator: true, simulationData: quoteData } });
    toast.success('Redirecionando para o orçamento...');
  };

  const handleCopyResult = async () => {
    const persText = wizard.personalizations.map((p, idx) =>
      `${idx + 1}. ${p.technique.name} | ${p.location.locationName} | ${p.specs.colors} ${p.specs.colors === 1 ? 'cor' : 'cores'} | ${p.specs.width}×${p.specs.height}cm | ${formatCurrency(p.pricing.totalPrice)} (${formatCurrency(p.pricing.costPerUnit)}/un) | Cód: ${p.pricing.budgetCode}`
    ).join('\n');

    const text = `📦 SIMULAÇÃO DE PERSONALIZAÇÃO\n━━━━━━━━━━━━━━━━━━━━━━\n🏷️ ${wizard.selectedProduct?.name} (${wizard.selectedProduct?.sku})\n📊 ${wizard.quantity} unidades × ${formatCurrency(wizard.effectivePrice)}\n\n🎨 PERSONALIZAÇÕES:\n${persText}\n\n💰 Produto: ${formatCurrency(wizard.totals.productTotal)}\n🎨 Gravações: ${formatCurrency(wizard.totals.customizationTotal)}\n━━━━━━━━━━━━━━━━━━━━━━\n✅ TOTAL: ${formatCurrency(wizard.totals.grandTotal)} (${formatCurrency(wizard.totals.grandTotalPerUnit)}/un)\n⏱️ Prazo: ${wizard.totals.maxDays > 0 ? `~${wizard.totals.maxDays} dias úteis` : 'A consultar'}`;
    await navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const hasPersonalizations = wizard.personalizations.length > 0;

  // Summary view after confirming
  if (hasPersonalizations && comparisonResults.length === 0) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <ConfirmedSummary wizard={wizard} onAddAnother={() => wizard.startNewPersonalization()}
          onGenerateQuote={handleGenerateQuote} onCopy={handleCopyResult} />
      </div>
    );
  }

  // Empty state
  if (comparisonResults.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
        <p className="text-muted-foreground text-lg mb-4">Nenhum comparativo disponível</p>
        <Button onClick={() => wizard.setStep('specs')} variant="outline">Voltar para Especificações</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-xl font-bold">Comparativo de Técnicas</h3>
            <p className="text-muted-foreground">
              {availableResults.length} {availableResults.length === 1 ? 'opção disponível' : 'opções disponíveis'}
              {unavailableResults.length > 0 && ` • ${unavailableResults.length} indisponível`}
              {selectedIds.size > 0 && ` • ${selectedIds.size} selecionada${selectedIds.size > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {availableResults.length > 1 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleSelectAll}>
              {selectedIds.size === availableResults.length ? 'Desmarcar Todas' : 'Selecionar Todas'}
            </Button>
          )}
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => wizard.setStep('specs')}>
            <RefreshCw className="h-4 w-4" />Alterar Specs
          </Button>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {availableResults.map((result, idx) => {
            const maxPrice = availableResults.length > 1
              ? Math.max(...availableResults.map(r => r.totalPrice)) : 0;
            return (
              <motion.div key={result.techniqueId} initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}>
                <ComparisonCard result={result} onSelect={toggleTechnique} quantity={wizard.quantity}
                  isFirst={idx === 0} maxPrice={maxPrice} isSelected={selectedIds.has(result.techniqueId)} />
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Unavailable */}
        {unavailableResults.length > 0 && (
          <>
            <div className="flex items-center gap-4 pt-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />Indisponíveis
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
            {unavailableResults.map((result) => (
              <motion.div key={result.techniqueId} initial={{ opacity: 0 }} animate={{ opacity: 0.6 }}
                className="p-5 rounded-2xl bg-muted/30 border border-dashed">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-muted-foreground">{result.techniqueName}</p>
                    <Badge variant="outline" className="text-xs font-mono mt-1">{result.techniqueCode}</Badge>
                  </div>
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />{result.unavailableReason}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </>
        )}
      </div>

      {/* Confirm Selection Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }} className="sticky bottom-4 z-10">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-2xl shadow-primary/40 border border-primary/30">
              <div>
                <p className="font-bold text-base">{selectedIds.size} técnica{selectedIds.size > 1 ? 's' : ''} selecionada{selectedIds.size > 1 ? 's' : ''}</p>
                <p className="text-sm text-primary-foreground/80">
                  Total combinado: {formatCurrency(availableResults.filter(r => selectedIds.has(r.techniqueId)).reduce((sum, r) => sum + r.totalPrice, 0))}
                </p>
              </div>
              <Button size="lg" className="gap-2 font-bold bg-white text-primary hover:bg-primary/5 shadow-lg"
                onClick={handleConfirmSelected}><Check className="h-5 w-5" />Confirmar Seleção</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex justify-between pt-6">
        <Button variant="ghost" size="lg" onClick={wizard.previousStep} className="gap-2">
          <ChevronLeft className="h-5 w-5" />Alterar Especificações
        </Button>
      </motion.div>
    </div>
  );
}
