import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, KeyRound, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { SecretMaskedDiff } from "./SecretMaskedDiff";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  secretName: string;
  /** When true → "atualizar" wording + diff preview; when false → "configurar" wording */
  isUpdate: boolean;
  currentSuffix: string | null;
  currentLength: number | null;
  newSuffix: string;
  newLength: number;
  loading: boolean;
  /**
   * Mensagem de erro retornada pelo backend após uma tentativa fracassada.
   * Quando preenchida, o modal permanece aberto e exibe o aviso para o
   * usuário corrigir/repetir sem precisar reabrir o fluxo.
   */
  errorMessage?: string | null;
  onConfirm: () => Promise<void> | void;
}

/**
 * Confirmation modal for saving (set/update) a sensitive credential.
 * Mirrors the look & tone of RotateSecretConfirmDialog but uses a
 * neutral "info" treatment since saving is less destructive than rotating.
 */
export function SaveSecretConfirmDialog({
  open,
  onOpenChange,
  secretName,
  isUpdate,
  currentSuffix,
  currentLength,
  newSuffix,
  newLength,
  loading,
  errorMessage,
  onConfirm,
}: Props) {
  const handleOpenChange = (next: boolean) => {
    if (loading) return;
    onOpenChange(next);
  };

  const verb = isUpdate ? "Atualizar" : "Salvar";
  const Icon = isUpdate ? KeyRound : ShieldCheck;

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
              className="flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0 bg-primary/10"
            >
              <Icon className="w-6 h-6 text-primary" />
            </motion.div>
            <div className="space-y-1">
              <AlertDialogTitle className="text-lg">
                {verb} {secretName}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {isUpdate
                  ? "Você está prestes a sobrescrever o valor atual desta credencial sensível."
                  : "Você está prestes a configurar esta credencial sensível pela primeira vez."}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {isUpdate ? (
          <SecretMaskedDiff
            currentSuffix={currentSuffix}
            currentLength={currentLength}
            newSuffix={newSuffix}
            newLength={newLength}
            className="my-2"
          />
        ) : (
          <SecretMaskedDiff
            currentSuffix={null}
            currentLength={null}
            newSuffix={newSuffix}
            newLength={newLength}
            newOnly
            className="my-2"
          />
        )}

        {/* Impact */}
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <h4 className="text-sm font-medium mb-2">Isto irá:</h4>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
              {isUpdate
                ? "Substituir imediatamente o valor em uso por todas as integrações"
                : "Ativar esta credencial para todas as integrações dependentes"}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
              Registrar a operação no histórico de auditoria
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
              {isUpdate
                ? "Invalidar o valor anterior — quem ainda usar a chave antiga falhará"
                : "Disparar verificação automática da nova chave"}
            </li>
          </ul>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive animate-in fade-in duration-200"
          >
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
          <Button onClick={() => onConfirm()} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Sim, {verb.toLowerCase()}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
