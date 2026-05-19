import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, Search, ShoppingCart, Plus, MessageSquare, Package, SlidersHorizontal, ImagePlus, Calculator, PlayCircle } from "lucide-react";
import { useOnboardingContext } from "@/contexts/OnboardingContext";

export function ShortcutsHelpDialog() {
  const [open, setOpen] = useState(false);
  let onboarding: any = null;
  try {
    onboarding = useOnboardingContext();
  } catch (e) {}

  const handleRestartTour = () => {
    if (onboarding) {
      onboarding.restartTour();
      setOpen(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with '?' if not in an input
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        const isInput =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;
        
        if (!isInput) {
          setOpen(true);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl border-primary/20 bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Command className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-xl font-display">Atalhos de Teclado</DialogTitle>
          </div>
          <DialogDescription>
            Aumente sua produtividade usando os comandos rápidos do sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Global Group */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Comandos Globais</h3>
            <div className="space-y-3">
              <ShortcutItem icon={Search} label="Buscar Produto / Comando" keys={["Ctrl", "K"]} />
              <ShortcutItem icon={MessageSquare} label="Assistente Oracle IA" keys={["Ctrl", "J"]} />
              <ShortcutItem icon={Plus} label="Novo Orçamento" keys={["Ctrl", "Shift", "N"]} />
              <ShortcutItem icon={ShoppingCart} label="Abrir Carrinho" keys={["Ctrl", "Shift", "C"]} />
              <ShortcutItem icon={Command} label="Ver Atalhos" keys={["?"]} />
            </div>
          </div>

          {/* Navigation Group (Alt) */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">Navegação Rápida</h3>
            <div className="space-y-3">
              <ShortcutItem icon={Package} label="Ir para Catálogo" keys={["Alt", "P"]} />
              <ShortcutItem icon={Plus} label="Novo Orçamento" keys={["Alt", "N"]} />
              <ShortcutItem icon={SlidersHorizontal} label="Super Filtro" keys={["Alt", "F"]} />
              <ShortcutItem icon={ImagePlus} label="Gerador de Mockup" keys={["Alt", "M"]} />
              <ShortcutItem icon={Calculator} label="Simulador" keys={["Alt", "S"]} />
              <ShortcutItem icon={Package} label="Ir para Meus Kits" keys={["G", "K"]} sub="Sequência" />
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between items-center mt-6 pt-4 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground italic text-center sm:text-left mb-4 sm:mb-0">
            Dica: Digite <code className="text-primary font-bold">/</code> na busca para ver comandos operacionais.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRestartTour}
            className="gap-2 text-xs h-8 border-primary/20 hover:bg-primary/10"
          >
            <PlayCircle className="h-3.5 w-3.5 text-primary" />
            Reiniciar Tour do Sistema
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ShortcutItem({ icon: Icon, label, keys, sub }: { icon: any, label: string, keys: string[], sub?: string }) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded bg-muted/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div>
          <span className="text-sm font-medium">{label}</span>
          {sub && <span className="block text-[10px] text-muted-foreground leading-none">{sub}</span>}
        </div>
      </div>
      <div className="flex gap-1 items-center">
        {keys.map((key, i) => (
          <span key={i} className="flex items-center">
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-mono bg-muted/30 border-border/50 shadow-sm">
              {key}
            </Badge>
            {i < keys.length - 1 && <span className="text-[10px] text-muted-foreground px-0.5">+</span>}
          </span>
        ))}
      </div>
    </div>
  );
}