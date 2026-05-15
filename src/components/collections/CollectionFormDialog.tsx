/**
 * CollectionFormDialog — Create / Edit collection dialog.
 * Extracted from CollectionsPage for modularity.
 */
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { FavoritesClientPicker } from "@/components/favorites/FavoritesClientPicker";

interface FormData {
  name: string;
  description: string;
  color: string;
  icon: string;
  clientId?: string | null;
  clientName?: string | null;
}

interface CollectionFormDialogProps {
  open: boolean;
  isEditing: boolean;
  formData: FormData;
  onFormChange: (data: FormData) => void;
  onSubmit: () => void;
  onClose: () => void;
  defaultColors: string[];
  defaultIcons: string[];
}

export function CollectionFormDialog({
  open,
  isEditing,
  formData,
  onFormChange,
  onSubmit,
  onClose,
  defaultColors,
  defaultIcons,
}: CollectionFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Coleção" : "Nova Coleção"}</DialogTitle>
        </DialogHeader>

        <div
          className="space-y-5"
          onKeyDown={(e) => {
            if (e.key === "Enter" && formData.name.trim()) {
              e.preventDefault();
              onSubmit();
            }
          }}
        >
          {/* Live preview */}
          <motion.div
            layout
            className="flex items-center gap-3 p-3 rounded-xl border-[1.5px] border-primary/20 bg-muted/30"
          >
            <motion.div
              key={`${formData.color}-${formData.icon}`}
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ backgroundColor: `${formData.color}20` }}
            >
              {formData.icon}
            </motion.div>
            <div className="min-w-0 flex-1">
              <p className="font-display font-semibold text-foreground truncate">
                {formData.name || "Nome da coleção..."}
              </p>
              {formData.description && (
                <p className="text-xs text-muted-foreground truncate">{formData.description}</p>
              )}
            </div>
            <Badge variant="secondary" className="text-[10px] shrink-0">Preview</Badge>
          </motion.div>

          <div className="space-y-2">
            <Label>Nome</Label>
            <Input
              placeholder="Ex: Clientes Premium"
              value={formData.name}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Input
              placeholder="Descreva esta coleção..."
              value={formData.description}
              onChange={(e) => onFormChange({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Cliente CRM (opcional)</Label>
            <FavoritesClientPicker
              selectedClientId={formData.clientId ?? null}
              selectedClientName={formData.clientName ?? null}
              onSelect={(client) =>
                onFormChange({
                  ...formData,
                  clientId: client?.id ?? null,
                  clientName: client?.name ?? null,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {defaultColors.map((color) => (
                <motion.button
                  key={color}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onFormChange({ ...formData, color })}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all duration-200",
                    formData.color === color && "ring-2 ring-offset-2 ring-primary scale-110 shadow-md"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="flex flex-wrap gap-2">
              {defaultIcons.map((icon) => (
                <motion.button
                  key={icon}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onFormChange({ ...formData, icon })}
                  className={cn(
                    "w-10 h-10 rounded-lg text-lg flex items-center justify-center border transition-all",
                    formData.icon === icon
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  {icon}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              className="flex-1 gap-2 shadow-lg shadow-primary/20"
              onClick={onSubmit}
              disabled={!formData.name.trim()}
            >
              {isEditing ? "Salvar" : (
                <>
                  <Plus className="h-4 w-4" />
                  Criar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
