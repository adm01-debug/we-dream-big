import { useState, useMemo } from "react";
import { Plus, Check, FolderPlus, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCollectionsContext } from "@/contexts/CollectionsContext";
import { type CollectionVariantInfo } from "@/hooks/useCollections";
import { toast } from "sonner";

interface AddToCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  variant?: CollectionVariantInfo;
}

export const AddToCollectionModal = ({
  open,
  onOpenChange,
  productId,
  productName,
  variant,
}: AddToCollectionModalProps) => {
  const {
    collections,
    createCollection,
    addProductToCollection,
    removeProductFromCollection,
    isProductInCollection,
    defaultColors,
    defaultIcons,
  } = useCollectionsContext();

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedColor, setSelectedColor] = useState(defaultColors[0]);
  const [selectedIcon, setSelectedIcon] = useState(defaultIcons[0]);

  const collectionsWithProduct = useMemo(() => {
    return collections.filter((c) => isProductInCollection(productId, c.id));
  }, [collections, productId, isProductInCollection]);

  const handleToggleCollection = (collectionId: string, collectionName: string) => {
    if (isProductInCollection(productId, collectionId)) {
      removeProductFromCollection(collectionId, productId);
      toast.success(`Removido de "${collectionName}"`);
    } else {
      addProductToCollection(collectionId, productId, variant);
      toast.success(`Adicionado a "${collectionName}"`);
    }
  };

  const handleCreateCollection = () => {
    if (!newName.trim()) return;

    const newCollection = createCollection(newName, undefined, selectedColor, selectedIcon);
    addProductToCollection(newCollection.id, productId, variant);
    toast.success(`Coleção "${newName}" criada e produto adicionado`);
    
    setNewName("");
    setIsCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="font-display">Adicionar à Coleção</DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-1.5 leading-snug">
            {variant?.color_hex && (
              <span
                className="inline-block w-3 h-3 rounded-full border border-border shrink-0"
                style={{ backgroundColor: variant.color_hex }}
              />
            )}
            <span className="break-words">{productName}</span>
            {variant?.color_name && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">({variant.color_name})</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing collections */}
          {collections.length > 0 && (
            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {collections.map((collection, idx) => {
                  const isInCollection = isProductInCollection(productId, collection.id);
                  return (
                    <motion.button
                      key={collection.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03, type: "spring", stiffness: 400, damping: 25 }}
                      onClick={() => handleToggleCollection(collection.id, collection.name)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border-[1.5px] transition-all duration-200",
                        isInCollection
                          ? "border-primary/50 bg-primary/5 shadow-sm shadow-primary/10"
                          : "border-border/50 hover:border-primary/40 hover:bg-accent/50"
                      )}
                    >
                      <motion.div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                        style={{ backgroundColor: `${collection.color}20` }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {collection.icon}
                      </motion.div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-display font-medium text-sm truncate">{collection.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {collection.productIds.length} produtos
                        </p>
                      </div>
                      <AnimatePresence mode="wait">
                        {isInCollection ? (
                          <motion.div
                            key="check"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            transition={{ type: "spring", stiffness: 600, damping: 25 }}
                            className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0"
                          >
                            <Check className="h-3.5 w-3.5 text-primary-foreground" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="empty"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="w-6 h-6 rounded-full border-2 border-border/40 shrink-0"
                          />
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {/* Create new collection */}
          <AnimatePresence mode="wait">
            {isCreating ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div
                  className="space-y-4 p-4 border-[1.5px] border-dashed border-primary/30 rounded-xl bg-primary/5"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newName.trim()) {
                      e.preventDefault();
                      handleCreateCollection();
                    }
                  }}
                >
                  {/* Mini preview */}
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-background/80 border border-border/50">
                    <motion.div
                      key={`${selectedColor}-${selectedIcon}`}
                      initial={{ scale: 0.8, rotate: -10 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                      style={{ backgroundColor: `${selectedColor}20` }}
                    >
                      {selectedIcon}
                    </motion.div>
                    <span className="text-xs font-medium text-foreground truncate flex-1">
                      {newName || "Nova coleção..."}
                    </span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">Preview</Badge>
                  </div>

                  <div className="space-y-2">
                    <Label>Nome da coleção</Label>
                    <Input
                      placeholder="Ex: Clientes Premium"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      autoFocus
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
                          onClick={() => setSelectedColor(color)}
                          className={cn(
                            "w-7 h-7 rounded-full transition-all duration-200",
                            selectedColor === color && "ring-2 ring-offset-2 ring-primary scale-110 shadow-md"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Ícone</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {defaultIcons.map((icon) => (
                        <motion.button
                          key={icon}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setSelectedIcon(icon)}
                          className={cn(
                            "w-9 h-9 rounded-lg text-base flex items-center justify-center border transition-all",
                            selectedIcon === icon
                              ? "border-primary bg-primary/10 shadow-sm"
                              : "border-border/50 hover:border-primary/40"
                          )}
                        >
                          {icon}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      size="sm"
                      onClick={() => setIsCreating(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1 gap-1.5 shadow-md shadow-primary/20"
                      size="sm"
                      onClick={handleCreateCollection}
                      disabled={!newName.trim()}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Criar
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Button
                  variant="outline"
                  className="w-full gap-2 border-dashed border-primary/30 hover:border-primary/50 hover:bg-primary/5"
                  onClick={() => setIsCreating(true)}
                >
                  <FolderPlus className="h-4 w-4" />
                  Nova Coleção
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Summary footer */}
          {collectionsWithProduct.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/50"
            >
              <Package className="h-3.5 w-3.5 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground">
                Em <span className="font-medium text-foreground">{collectionsWithProduct.length}</span> coleção{collectionsWithProduct.length > 1 ? "ões" : ""}
                {collectionsWithProduct.length <= 3 && (
                  <span className="text-muted-foreground"> · {collectionsWithProduct.map(c => c.name).join(", ")}</span>
                )}
              </p>
            </motion.div>
          )}

          {/* Confirm & close button */}
          <Button
            className="w-full gap-2 shadow-lg shadow-primary/20"
            onClick={() => onOpenChange(false)}
          >
            <Check className="h-4 w-4" />
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
