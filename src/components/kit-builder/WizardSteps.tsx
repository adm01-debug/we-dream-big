/**
 * Kit Builder Wizard Steps — Premium edition
 * Continuous progress bar + active glow + mini-summaries per step.
 */

import { Check, Package, Gift, Palette, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KitBuilderStep, KitState } from '@/lib/kit-builder';

interface WizardStepsProps {
  currentStep: KitBuilderStep;
  completedSteps: KitBuilderStep[];
  onStepClick?: (step: KitBuilderStep) => void;
  kitState?: KitState;
}

const STEPS: { id: KitBuilderStep; label: string; ordinal: string; icon: typeof Package; tagline: string }[] = [
  { id: 'box', label: 'Caixa', ordinal: '01', icon: Package, tagline: 'A primeira impressão' },
  { id: 'items', label: 'Itens', ordinal: '02', icon: Gift, tagline: 'O coração do kit' },
  { id: 'personalization', label: 'Personalização', ordinal: '03', icon: Palette, tagline: 'Sua marca presente' },
  { id: 'summary', label: 'Resumo', ordinal: '04', icon: FileText, tagline: 'Pronto para encantar' },
];

export function WizardSteps({ currentStep, completedSteps, onStepClick, kitState }: WizardStepsProps) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep);
  const progressPercent = ((currentIndex + (completedSteps.includes(currentStep) ? 1 : 0.5)) / STEPS.length) * 100;

  const getStepSummary = (stepId: KitBuilderStep): string | null => {
    if (!kitState) return null;
    if (stepId === 'box' && kitState.box) return kitState.box.name;
    if (stepId === 'items' && kitState.items.length > 0) {
      const totalQty = kitState.items.reduce((s, i) => s + i.quantity, 0);
      return `${kitState.items.length} produtos · ${totalQty} un.`;
    }
    if (stepId === 'personalization') {
      const count = (kitState.personalization.box?.enabled ? 1 : 0)
        + Object.values(kitState.personalization.items).filter(p => p?.enabled).length;
      if (count > 0) return `${count} ${count === 1 ? 'item' : 'itens'} personalizados`;
    }
    return null;
  };

  return (
    <div className="w-full space-y-2">
      {/* Continuous progress bar */}
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary to-primary/70 transition-all duration-700 ease-out"
          style={{ width: `${progressPercent}%`, boxShadow: '0 0 12px hsl(var(--primary) / 0.5)' }}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        {STEPS.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = completedSteps.includes(step.id);
          const isClickable = isCompleted || isActive;
          const Icon = step.icon;
          const summary = getStepSummary(step.id);

          return (
            <div key={step.id} className="flex items-center flex-1 min-w-0">
              <button
                onClick={() => isClickable && onStepClick?.(step.id)}
                disabled={!isClickable}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'group flex items-center gap-2.5 flex-1 min-w-0 px-1 py-1 transition-all rounded-lg',
                  isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
                )}
              >
                <div
                  className={cn(
                    'relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-300',
                    isActive && 'border-primary bg-primary text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.4)]',
                    isCompleted && !isActive && 'border-success/50 bg-success/10 text-success',
                    !isActive && !isCompleted && 'border-border bg-muted/40 text-muted-foreground group-hover:border-border/80',
                  )}
                >
                  {isCompleted && !isActive ? (
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                <div className="text-left min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-sm font-display font-semibold tracking-tight truncate leading-tight transition-colors',
                      isActive && 'text-foreground',
                      isCompleted && !isActive && 'text-foreground/80',
                      !isActive && !isCompleted && 'text-muted-foreground',
                    )}
                  >
                    {step.label}
                  </p>
                  {summary ? (
                    <p className="text-[10px] text-success font-medium truncate leading-tight" title={summary}>
                      ✓ {summary}
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground/70 truncate leading-tight hidden md:block">
                      {step.tagline}
                    </p>
                  )}
                </div>
              </button>

              {/* Connector */}
              {index < STEPS.length - 1 && (
                <div className="hidden sm:block flex-shrink-0 w-4 h-px bg-border/60" aria-hidden />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
