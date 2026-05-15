import { useMemo, useState, useCallback } from 'react';
import { useExternalCategoriesQuery, type ExternalCategory } from '@/hooks/useExternalCategoriesQuery';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, ChevronsUpDown, ChevronRight, FolderOpen, Folder, X, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategorySelectProps {
  value: string;
  onChange: (id: string) => void;
  error?: string;
}

interface CategoryNode extends ExternalCategory {
  children: CategoryNode[];
  fullPath: string[];
}

export function CategorySelect({ value, onChange, error }: CategorySelectProps) {
  const { data: categories = [], isLoading } = useExternalCategoriesQuery();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);

  // Build tree structure
  const { tree, nodeMap } = useMemo(() => {
    const map = new Map<string, CategoryNode>();
    const roots: CategoryNode[] = [];

    // First pass: create nodes
    for (const cat of categories) {
      map.set(cat.id, { ...cat, children: [], fullPath: [] });
    }

    // Second pass: link children
    for (const node of map.values()) {
      if (node.parent_id && map.has(node.parent_id)) {
        map.get(node.parent_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Third pass: build paths
    function buildPath(node: CategoryNode, ancestors: string[]) {
      node.fullPath = [...ancestors, node.name];
      node.children.sort((a, b) => a.name.localeCompare(b.name));
      for (const child of node.children) {
        buildPath(child, node.fullPath);
      }
    }
    roots.sort((a, b) => a.name.localeCompare(b.name));
    for (const root of roots) buildPath(root, []);

    return { tree: roots, nodeMap: map };
  }, [categories]);

  // Get full breadcrumb for a category id
  const getFullBreadcrumb = useCallback((catId: string): string => {
    const node = nodeMap.get(catId);
    if (!node) return '';
    return node.fullPath.join(' › ');
  }, [nodeMap]);

  // Breadcrumb for current navigation level
  const navigationBreadcrumb = useMemo((): CategoryNode[] => {
    if (!currentParentId) return [];
    const path: CategoryNode[] = [];
    let current = nodeMap.get(currentParentId);
    while (current) {
      path.unshift(current);
      current = current.parent_id ? nodeMap.get(current.parent_id) : undefined;
    }
    return path;
  }, [currentParentId, nodeMap]);

  // Current level items (children of currentParentId)
  const currentItems = useMemo((): CategoryNode[] => {
    if (!currentParentId) return tree;
    return nodeMap.get(currentParentId)?.children ?? [];
  }, [currentParentId, tree, nodeMap]);

  // Search: flatten and filter all categories
  const searchResults = useMemo((): CategoryNode[] => {
    if (!search) return [];
    const q = search.toLowerCase();
    const results: CategoryNode[] = [];
    for (const node of nodeMap.values()) {
      if (node.name.toLowerCase().includes(q) || node.fullPath.join(' ').toLowerCase().includes(q)) {
        results.push(node);
      }
    }
    return results.sort((a, b) => a.name.localeCompare(b.name));
  }, [search, nodeMap]);

  const isSearching = search.length > 0;
  const displayItems = isSearching ? searchResults : currentItems;

  const selected = useMemo(
    () => categories.find(c => c.id === value),
    [categories, value]
  );

  const handleSelect = (catId: string) => {
    onChange(catId);
    setOpen(false);
    setSearch('');
    setCurrentParentId(null);
  };

  const handleNavigate = (catId: string) => {
    setCurrentParentId(catId);
    setSearch('');
  };

  const handleBack = () => {
    if (!currentParentId) return;
    const current = nodeMap.get(currentParentId);
    setCurrentParentId(current?.parent_id ?? null);
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setSearch('');
      setCurrentParentId(null);
    }
  };

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={handleOpenChange}>
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
              <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
              {selected ? getFullBreadcrumb(selected.id) : 'Selecionar categoria...'}
            </span>
            {value ? (
              <X
                className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
              />
            ) : (
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[420px] p-0" align="start">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <Input
              placeholder="Buscar categoria..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8"
              autoFocus
            />
          </div>

          {/* Breadcrumb navigation */}
          {!isSearching && currentParentId && (
            <div className="px-2 py-1.5 border-b border-border flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto">
              <button
                type="button"
                className="shrink-0 p-0.5 rounded hover:bg-accent transition-colors"
                onClick={handleBack}
               aria-label="Voltar">
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="shrink-0 hover:text-foreground transition-colors"
                onClick={() => setCurrentParentId(null)}
              >
                Raiz
              </button>
              {navigationBreadcrumb.map((node, i) => (
                <span key={node.id} className="flex items-center gap-1 shrink-0">
                  <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                  <button
                    type="button"
                    className={cn(
                      'hover:text-foreground transition-colors truncate max-w-[120px]',
                      i === navigationBreadcrumb.length - 1 && 'text-foreground font-medium'
                    )}
                    onClick={() => setCurrentParentId(node.id)}
                  >
                    {node.name}
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Items */}
          <ScrollArea className="h-[280px]">
            <div className="p-1">
              {isLoading ? (
                <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
              ) : displayItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {isSearching ? 'Nenhuma categoria encontrada' : 'Sem subcategorias'}
                </p>
              ) : (
                displayItems.map(node => {
                  const hasChildren = node.children.length > 0;
                  const isSelected = value === node.id;

                  return (
                    <div
                      key={node.id}
                      className={cn(
                        'flex items-center rounded-sm hover:bg-accent transition-colors',
                        isSelected && 'bg-accent'
                      )}
                    >
                      {/* Select button */}
                      <button
                        type="button"
                        className="flex-1 flex items-center gap-2 px-2 py-1.5 text-sm text-left min-w-0"
                        onClick={() => handleSelect(node.id)}
                      >
                        <Check className={cn('h-4 w-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
                        {hasChildren ? (
                          <Folder className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                        ) : (
                          <span className="w-3.5 shrink-0" />
                        )}
                        <span className="truncate">
                          {isSearching ? (
                            <span className="flex flex-col">
                              <span>{node.name}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {node.fullPath.slice(0, -1).join(' › ')}
                              </span>
                            </span>
                          ) : (
                            node.name
                          )}
                        </span>
                      </button>

                      {/* Navigate into folder */}
                      {hasChildren && !isSearching && (
                        <button
                          type="button"
                          className="shrink-0 px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => handleNavigate(node.id)}
                          title={`Ver ${node.children.length} subcategorias`}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Current parent: allow selecting it */}
          {!isSearching && currentParentId && (
            <div className="border-t border-border px-2 py-1.5">
              <button
                type="button"
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent text-left',
                  value === currentParentId && 'bg-accent'
                )}
                onClick={() => handleSelect(currentParentId)}
              >
                <Check className={cn('h-4 w-4 shrink-0', value === currentParentId ? 'opacity-100' : 'opacity-0')} />
                <span className="text-muted-foreground">Selecionar "</span>
                <span className="font-medium truncate">{nodeMap.get(currentParentId)?.name}</span>
                <span className="text-muted-foreground">"</span>
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
