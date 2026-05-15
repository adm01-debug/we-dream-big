import { useMemo, useState } from 'react';
import { useSuppliers } from '@/hooks/useSuppliers';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, ChevronsUpDown, Truck, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SupplierSelectProps {
  value: string;
  onChange: (id: string, name?: string, markupPercent?: number | null) => void;
  error?: string;
}

export function SupplierSelect({ value, onChange, error }: SupplierSelectProps) {
  const { suppliers, isLoading } = useSuppliers();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter(s => s.name.toLowerCase().includes(q));
  }, [suppliers, search]);

  const selected = useMemo(
    () => suppliers.find(s => s.id === value),
    [suppliers, value]
  );

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-between font-normal',
              !value && 'text-muted-foreground',
              error && 'border-destructive'
            )}
          >
            <span className="flex items-center gap-2 truncate">
              <Truck className="h-4 w-4 shrink-0 text-muted-foreground" />
              {selected ? selected.name : 'Selecionar fornecedor...'}
            </span>
            {value ? (
              <X
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('', '', null);
                }}
              />
            ) : (
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder="Buscar fornecedor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8"
              autoFocus
            />
          </div>
          <ScrollArea className="h-[240px]">
            <div className="p-1">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum fornecedor encontrado</p>
              ) : (
                filtered.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent text-left',
                      value === s.id && 'bg-accent'
                    )}
                    onClick={() => {
                      onChange(s.id, s.name, s.defaultMarkupPercent);
                      setOpen(false);
                      setSearch('');
                    }}
                  >
                    <Check className={cn('h-4 w-4 shrink-0', value === s.id ? 'opacity-100' : 'opacity-0')} />
                    <span className="truncate">{s.name}</span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
