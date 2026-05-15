import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { SecretMaskedDiff } from "./SecretMaskedDiff";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  secretName: string;
  currentSuffix: string | null;
  currentLength: number | null;
  newSuffix: string;
  newLength: number;
  loading: boolean;
  errorMessage?: string | null;
  onConfirm: (notes?: string) => Promise<void> | void;
}

const MAX_NOTES = 200;

export function RotateSecretConfirmDialog({
  open,
  onOpenChange,
  secretName,
  currentSuffix,
  currentLength,
  newSuffix,
  newLength,
  loading,
  errorMessage,
  onConfirm,
}: Props) {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) setNotes("");
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (loading) return;
    onOpenChange(next);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent
        className="max-w-lg"
        onEscapeKeyDown={(e) => loading && e.preventDefault()}
      >
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0 bg-warning/10"
            >
              <AlertTriangle className="w-6 h-6 text-warning" />
            </motion.div>
            <div className="space-y-1">
              <AlertDialogTitle className="text-lg">
                Rotacionar {secretName}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Você está prestes a substituir esta credencial pelo novo valor digitado.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <SecretMaskedDiff
          currentSuffix={currentSuffix}
          currentLength={currentLength}
          newSuffix={newSuffix}
          newLength={newLength}
          className="my-2"
        />

        {/* Impacto */}
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h4 className="text-sm font-medium mb-2">Isto irá:</h4>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
              Sobrescrever a credencial em uso agora
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
              Registrar a rotação no histórico de auditoria
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
              Disparar verificação automática da nova chave
            </li>
          </ul>
        </div>

        {/* Motivo opcional */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="rotation-notes" className="text-sm">
              Motivo <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <span className="text-xs text-muted-foreground">
              {notes.length}/{MAX_NOTES}
            </span>
          </div>
          <Textarea
            id="rotation-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES))}
            placeholder="Ex: rotação periódica trimestral, comprometimento suspeito, troca de fornecedor..."
            rows={3}
            disabled={loading}
            className="text-sm"
          />
        </div>

        <p className="text-sm font-medium text-destructive">
          Esta ação não pode ser desfeita.
        </p>

        {errorMessage && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(notes.trim() || undefined)}
            disabled={loading}
            className="bg-warning text-warning-foreground hover:bg-warning/90"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Sim, rotacionar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
