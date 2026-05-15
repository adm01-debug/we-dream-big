import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  step: number;
  currentStep: number;
  label: string;
  isComplete: boolean;
}

export function StepIndicator({ step, currentStep, label, isComplete }: StepIndicatorProps) {
  const isActive = step === currentStep;

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
          isComplete
            ? 'bg-primary text-primary-foreground'
            : isActive
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {isComplete ? <Check className="w-4 h-4" /> : step}
      </div>
      <span
        className={cn(
          'text-sm font-medium hidden sm:inline',
          isActive ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        {label}
      </span>
      {step < 4 && <ChevronRight className="w-4 h-4 text-muted-foreground hidden sm:inline" />}
    </div>
  );
}
