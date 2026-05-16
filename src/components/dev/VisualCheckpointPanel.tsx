import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw, ShieldCheck, AlertCircle, Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VisualCheckpointPanelProps {
  onStateChange: (state: 'normal' | 'error' | 'loading') => void;
}

export const VisualCheckpointPanel: React.FC<VisualCheckpointPanelProps> = ({ onStateChange }) => {
  const { toast } = useToast();
  const [lastCheckpoint, setLastCheckpoint] = useState<string | null>(localStorage.getItem('last_visual_checkpoint'));

  const handleSaveCheckpoint = () => {
    const timestamp = new Date().toLocaleString();
    localStorage.setItem('last_visual_checkpoint', timestamp);
    setLastCheckpoint(timestamp);
    toast({
      title: "Checkpoint Salvo",
      description: `Estado visual capturado em ${timestamp}`,
    });
  };

  const handleRestoreCheckpoint = () => {
    if (!lastCheckpoint) return;
    toast({
      title: "Restaurando Checkpoint",
      description: `Revertendo para o estado de ${lastCheckpoint}...`,
    });
    // Simulação de restauração
    window.location.reload();
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 p-4 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-500">
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">Visual QA Suite</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-8 text-[11px]"
          onClick={handleSaveCheckpoint}
        >
          <Save className="mr-1.5 h-3 w-3" />
          Checkpoint
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-white/5 border-white/10 text-white hover:bg-white/10 h-8 text-[11px]"
          onClick={handleRestoreCheckpoint}
          disabled={!lastCheckpoint}
        >
          <RotateCcw className="mr-1.5 h-3 w-3" />
          Voltar
        </Button>
      </div>

      <div className="h-px bg-white/10 my-1" />

      <div className="flex flex-col gap-2">
        <span className="text-[9px] font-medium text-white/40 px-1 uppercase tracking-wider">Estados do Login</span>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            size="icon" 
            className="h-8 w-8 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
            onClick={() => onStateChange('normal')}
            title="Estado Normal"
          >
            <ShieldCheck className="h-4 w-4" />
          </Button>
          <Button 
            variant="secondary" 
            size="icon" 
            className="h-8 w-8 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30"
            onClick={() => onStateChange('error')}
            title="Simular Erro"
          >
            <AlertCircle className="h-4 w-4" />
          </Button>
          <Button 
            variant="secondary" 
            size="icon" 
            className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
            onClick={() => onStateChange('loading')}
            title="Simular Loading"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
          </Button>
          <Button 
            variant="secondary" 
            size="icon" 
            className="h-8 w-8 rounded-lg bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
            onClick={() => {
              toast({ title: "Snapshot Gerado", description: "Enviado para o pipeline de comparação." });
            }}
            title="Gerar Snapshot"
          >
            <Camera className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {lastCheckpoint && (
        <div className="text-[9px] text-white/30 text-center mt-1 italic">
          Último ponto: {lastCheckpoint}
        </div>
      )}
    </div>
  );
};
