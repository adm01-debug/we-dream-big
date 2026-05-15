/**
 * WizardStepIndicator - Indicador visual dos 4 passos
 * 
 * Produto → Local → Especificações → Comparativo
 */

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Package, MapPin, SlidersHorizontal, BarChart3, Check } from 'lucide-react';
import { 
  WIZARD_STEPS, 
  WIZARD_STEP_CONFIG,
  type WizardStep,
} from '@/types/domain/simulator-wizard';
import type { UseSimulatorWizardReturn } from '@/hooks/simulator/useSimulatorWizard';

interface WizardStepIndicatorProps {
  wizard: UseSimulatorWizardReturn;
}

const STEP_ICONS: Record<WizardStep, React.ElementType> = {
  product: Package,
  location: MapPin,
  specs: SlidersHorizontal,
  comparison: BarChart3,
};

export function WizardStepIndicator({ wizard }: WizardStepIndicatorProps) {
  const currentIndex = WIZARD_STEPS.indexOf(wizard.currentStep);
  
  return (
    <div className="w-full">
      {/* Mobile: Progress bar */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">{currentIndex + 1}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{WIZARD_STEPS.length}</span>
          </div>
          <span className="font-semibold">
            {WIZARD_STEP_CONFIG[wizard.currentStep].shortLabel}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${wizard.stepProgress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
        <div className="flex justify-between mt-2 px-1">
          {WIZARD_STEPS.map((step, idx) => {
            const Icon = STEP_ICONS[step];
            const config = WIZARD_STEP_CONFIG[step];
            const isActive = idx <= currentIndex;
            return (
              <div key={step} className="flex flex-col items-center gap-1">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center transition-colors',
                  idx === currentIndex ? 'bg-primary text-primary-foreground' :
                  isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground/40'
                )}>
                  {idx < currentIndex ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : (
                    <Icon className="h-3 w-3" />
                  )}
                </div>
                <span className={cn(
                  'text-[10px] font-medium',
                  idx === currentIndex ? 'text-primary' : 'text-muted-foreground/60'
                )}>
                  {config.shortLabel.slice(0, 5)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop: Horizontal steps */}
      <div className="hidden sm:block">
        <div className="w-full">
          <div className="relative mb-8">
            <div className="absolute top-6 left-12 right-12 h-1 bg-muted rounded-full" />
            <motion.div
              className="absolute top-6 left-12 h-1 bg-gradient-to-r from-primary via-primary to-primary/60 rounded-full"
              initial={{ width: 0 }}
              animate={{ 
                width: `calc(${(currentIndex / (WIZARD_STEPS.length - 1)) * 100}% - 6rem)` 
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          <div className="flex justify-between relative -mt-6">
            {WIZARD_STEPS.map((step, idx) => {
              const config = WIZARD_STEP_CONFIG[step];
              const Icon = STEP_ICONS[step];
              const isCompleted = idx < currentIndex;
              const isCurrent = step === wizard.currentStep;
              const isClickable = wizard.canNavigateToStep(step);

              return (
                <motion.button
                  key={step}
                  onClick={() => isClickable && wizard.setStep(step)}
                  disabled={!isClickable}
                  className={cn(
                    'flex flex-col items-center gap-3 group transition-all',
                    isClickable ? 'cursor-pointer' : 'cursor-not-allowed'
                  )}
                  whileHover={isClickable ? { y: -2 } : undefined}
                  whileTap={isClickable ? { scale: 0.98 } : undefined}
                >
                  <motion.div 
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center transition-all relative',
                      isCurrent && 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-primary/20',
                      isCompleted && 'bg-primary/15 text-primary',
                      !isCurrent && !isCompleted && 'bg-muted text-muted-foreground'
                    )}
                    initial={false}
                    animate={isCurrent ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" strokeWidth={3} />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                    
                    {isCurrent && (
                      <motion.div
                        className="absolute inset-0 rounded-full bg-primary/20"
                        initial={{ scale: 1, opacity: 0.5 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </motion.div>

                  <div className="text-center">
                    <p className={cn(
                      'text-xs font-medium uppercase tracking-wider mb-0.5',
                      isCurrent ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      Passo {idx + 1}
                    </p>
                    <p className={cn(
                      'text-sm font-semibold transition-colors',
                      isCurrent ? 'text-foreground' : 'text-muted-foreground',
                      isClickable && !isCurrent && 'group-hover:text-foreground'
                    )}>
                      {config.shortLabel}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
