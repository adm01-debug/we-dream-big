import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Package, Plus, Trash2, Users } from "lucide-react";
import { InlineEditField } from "../InlineEditField";
import type { ProductGroup, SimpleProduct, ProductGroupMember } from "./useProductGroups";

interface GroupAccordionItemProps {
  group: ProductGroup;
  members: ProductGroupMember[];
  availableProducts: SimpleProduct[];
  getProductInfo: (id: string) => SimpleProduct | undefined;
  onUpdate: (data: { id: string; group_code?: string; group_name?: string; is_active?: boolean }) => void;
  onDelete: (id: string) => void;
  onAddMember: (data: { product_group_id: string; product_id: string }) => void;
  onRemoveMember: (id: string) => void;
}

export function GroupAccordionItem({
  group, members, availableProducts, getProductInfo,
  onUpdate, onDelete, onAddMember, onRemoveMember,
}: GroupAccordionItemProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <AccordionItem value={group.id} className="border rounded-lg px-4">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3 flex-1">
          <Badge variant="outline" className="font-mono">{group.group_code}</Badge>
          <span className="font-medium">{group.group_name}</span>
          <Badge variant="secondary" className="text-xs ml-auto mr-4"><Users className="h-3 w-3 mr-1" />{members.length} produtos</Badge>
          {!group.is_active && <Badge variant="destructive" className="text-xs">Inativo</Badge>}
        </div>
      </AccordionTrigger>
      <AccordionContent className="pt-4 pb-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg mb-4">
          <div><Label className="text-xs text-muted-foreground">Código</Label><InlineEditField value={group.group_code} onSave={(v) => onUpdate({ id: group.id, group_code: v.toUpperCase() })} className="font-mono" /></div>
          <div><Label className="text-xs text-muted-foreground">Nome</Label><InlineEditField value={group.group_name} onSave={(v) => onUpdate({ id: group.id, group_name: v })} /></div>
          <div className="flex items-center gap-2">
            <Switch id={`group-active-${group.id}`} checked={group.is_active} onCheckedChange={(checked) => onUpdate({ id: group.id, is_active: checked })} />
            <Label htmlFor={`group-active-${group.id}`} className="text-sm">Ativo</Label>
          </div>
        </div>
        {group.description && <p className="text-sm text-muted-foreground mb-4 px-4">{group.description}</p>}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm flex items-center gap-2"><Package className="h-4 w-4" />Produtos do Grupo</h4>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" />Adicionar Produto</Button></DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Adicionar Produto ao Grupo</DialogTitle>
                  <DialogDescription>Selecione produtos para adicionar ao grupo {group.group_name}</DialogDescription>
                </DialogHeader>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {availableProducts.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">Todos os produtos já estão neste grupo</p>
                  ) : availableProducts.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer" onClick={() => onAddMember({ product_group_id: group.id, product_id: product.id })}>
                      <div><span className="font-medium">{product.name}</span><Badge variant="outline" className="ml-2 font-mono text-xs">{product.sku}</Badge></div>
                      <Plus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setIsAddOpen(false)}>Fechar</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex flex-wrap gap-2 pl-4">
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum produto neste grupo</p>
            ) : members.map((member) => {
              const product = getProductInfo(member.product_id);
              return (
                <Badge key={member.id} variant="secondary" className="gap-1 group cursor-pointer">
                  {product?.name || "Produto"}<span className="text-xs opacity-70">({product?.sku})</span>
                  <button aria-label="Excluir" className="opacity-0 group-hover:opacity-100 transition-opacity ml-1" onClick={() => onRemoveMember(member.id)}><Trash2 className="h-3 w-3 text-destructive" /></button>
                </Badge>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end mt-4 pt-4 border-t">
          <Button size="sm" variant="destructive" onClick={() => onDelete(group.id)}><Trash2 className="h-4 w-4 mr-2" />Remover Grupo</Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
