/**
 * KitOnboardingTour — tour de 30s mostrando os 4 passos principais.
 * Controlado por flag em localStorage `kit-tour-completed`.
 */
import { useEffect, useState } from 'react';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const STORAGE_KEY = 'kit-tour-completed';

const STEPS = [
  { title: '1. Selecione a Embalagem', desc: 'Comece escolhendo uma caixa ou aplique um template pronto.' },
  { title: '2. Adicione Itens', desc: 'Use a busca, sugestões inteligentes ou modo IA (✨) para gerar kit completo.' },
  { title: '3. Personalize', desc: 'Configure gravação, cores e logo. Veja o preview ao vivo na lateral.' },
  { title: '4. Resumo & Envio', desc: 'Confira saúde, margem, estoque e envie para orçamento ou exporte PDF.' },
];

export function KitOnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
  }, []);

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setOpen(false);
  };

  if (!open) return null;

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[80] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-md p-6 space-y-4 relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7"
          onClick={finish}
          aria-label="Fechar tour"
        >
          <X className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-display text-lg font-semibold">Bem-vindo ao Kit Maker</h3>
        </div>
        <div className="bg-muted/40 rounded-lg p-4 space-y-1">
          <p className="font-medium">{current.title}</p>
          <p className="text-sm text-muted-foreground">{current.desc}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1" role="presentation">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted'}`}
              />
            ))}
          </div>
          {step < STEPS.length - 1 ? (
            <Button size="sm" onClick={() => setStep(step + 1)}>
              Próximo <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={finish}>Começar</Button>
          )}
        </div>
        <button
          type="button"
          onClick={finish}
          className="text-[11px] text-muted-foreground hover:underline w-full text-center"
        >
          Pular tour
        </button>
      </Card>
    </div>
  );
}
