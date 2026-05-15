/**
 * Kit Comparison Dialog
 * Compare 2-3 kits side by side (composition, price, weight)
 */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, Scale, Box, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/kit-builder';

interface KitBoxData {
  weight?: number;
  [key: string]: unknown;
}

interface KitItemData {
  weight?: number;
  quantity?: number;
  name?: string;
  sku?: string;
  [key: string]: unknown;
}

interface KitForComparison {
  id: string;
  name: string;
  kit_type: string;
  status: string;
  box_data: KitBoxData;
  items_data: KitItemData[];
  kit_quantity: number;
  box_price: number;
  items_price: number;
  personalization_price: number;
  total_price: number;
  volume_usage_percent: number;
}

interface KitComparisonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kits: KitForComparison[];
}

export function KitComparisonDialog({ open, onOpenChange, kits }: KitComparisonDialogProps) {
  if (kits.length < 2) return null;

  const getTotalWeight = (kit: KitForComparison): number => {
    const boxWeight = kit.box_data?.weight || 0;
    const itemsWeight = (kit.items_data || []).reduce((sum: number, i: KitItemData) => sum + (i.weight || 0) * (i.quantity || 1), 0);
    return boxWeight + itemsWeight;
  };

  const getItemCount = (kit: KitForComparison): number => {
    return (kit.items_data || []).reduce((sum: number, i: KitItemData) => sum + (i.quantity || 1), 0);
  };

  const rows = [
    { label: 'Tipo', icon: <Box className="h-3.5 w-3.5" />, getValue: (k: KitForComparison) => ({ montado: 'Montado', original: 'Original', simples: 'Simples' }[k.kit_type] || k.kit_type) },
    { label: 'Embalagem', icon: <Package className="h-3.5 w-3.5" />, getValue: (k: KitForComparison) => k.box_data?.name || 'Sem caixa' },
    { label: 'Qtd Itens', icon: null, getValue: (k: KitForComparison) => `${getItemCount(k)} itens (${(k.items_data || []).length} diferentes)` },
    { label: 'Peso Total', icon: <Scale className="h-3.5 w-3.5" />, getValue: (k: KitForComparison) => { const w = getTotalWeight(k); return w >= 1000 ? `${(w / 1000).toFixed(1)}kg` : `${w}g`; } },
    { label: 'Ocupação', icon: null, getValue: (k: KitForComparison) => `${Math.round(Number(k.volume_usage_percent))}%` },
    { label: 'Qtd Kits', icon: null, getValue: (k: KitForComparison) => `${k.kit_quantity}` },
    { label: 'Preço Caixa', icon: <DollarSign className="h-3.5 w-3.5" />, getValue: (k: KitForComparison) => formatCurrency(Number(k.box_price)) },
    { label: 'Preço Itens', icon: null, getValue: (k: KitForComparison) => formatCurrency(Number(k.items_price)) },
    { label: 'Personalização', icon: null, getValue: (k: KitForComparison) => formatCurrency(Number(k.personalization_price)) },
    { label: 'Total', icon: null, getValue: (k: KitForComparison) => formatCurrency(Number(k.total_price)), bold: true },
    { label: 'Preço/Kit', icon: null, getValue: (k: KitForComparison) => formatCurrency(Number(k.total_price) / Math.max(k.kit_quantity, 1)), bold: true },
  ];

  // Find the cheapest kit for highlighting
  const cheapestId = kits.reduce((min, k) => Number(k.total_price) / Math.max(k.kit_quantity, 1) < Number(min.total_price) / Math.max(min.kit_quantity, 1) ? k : min, kits[0]).id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Comparação de Kits
          </DialogTitle>
          <DialogDescription className="sr-only">Compare os kits criados lado a lado</DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground w-[140px]">Característica</th>
                {kits.map(kit => (
                  <th key={kit.id} className="text-center py-3 px-2">
                    <div className="space-y-1">
                      <p className="font-semibold">{kit.name}</p>
                      {kit.id === cheapestId && (
                        <Badge variant="default" className="text-[10px]">Melhor preço/kit</Badge>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                  <td className="py-2.5 px-2 font-medium text-muted-foreground flex items-center gap-1.5">
                    {row.icon}
                    {row.label}
                  </td>
                  {kits.map(kit => (
                    <td key={kit.id} className={`py-2.5 px-2 text-center ${(row as Record<string, unknown>).bold ? 'font-bold text-primary' : ''}`}>
                      {row.getValue(kit)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Items comparison */}
        <Separator />
        <div>
          <h4 className="font-medium mb-3">Composição Detalhada</h4>
          <div className={`grid gap-4 ${kits.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {kits.map(kit => (
              <div key={kit.id} className="space-y-1.5">
                <p className="font-semibold text-sm mb-2">{kit.name}</p>
                {(kit.items_data || []).map((item: KitItemData, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 text-xs bg-muted/50 rounded p-1.5">
                    {item.imageUrl && 
<img src={item.imageUrl} alt="" className="w-6 h-6 rounded object-contain"  loading="lazy" />}
                    <span className="flex-1 truncate">{item.quantity || 1}x {item.name}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
