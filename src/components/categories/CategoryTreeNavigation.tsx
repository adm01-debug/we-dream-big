import { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Search, X } from 'lucide-react';
import { useCategoriesTree, type CategoryNode, type CategoryTreeItem } from '@/hooks/useCategoriesTree';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface CategoryTreeNavigationProps {
  onSelectCategory?: (category: CategoryTreeItem) => void;
  selectedCategoryId?: string | null;
  showSearch?: boolean;
  maxHeight?: string;
  className?: string;
}

// Componente de nó da árvore
function TreeNode({
  node,
  level,
  selectedId,
  expandedIds,
  onToggle,
  onSelect,
}: {
  node: CategoryNode;
  level: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (node: CategoryNode) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
          "hover:bg-accent/50",
          isSelected && "bg-primary/10 text-primary font-medium"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(node)}
      >
        {/* Botão de expandir/colapsar */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="p-0.5 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Ícone de pasta */}
        {hasChildren ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 text-warning" />
          ) : (
            <Folder className="w-4 h-4 text-warning" />
          )
        ) : (
          <div className="w-4 h-4 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
          </div>
        )}

        {/* Nome da categoria */}
        <span className="truncate text-sm">{node.name}</span>

        {/* Badge com contagem de filhos */}
        {hasChildren && (
          <Badge variant="secondary" className="ml-auto text-xs px-1.5 py-0">
            {node.children.length}
          </Badge>
        )}
      </div>

      {/* Filhos */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Componente de resultado de busca
function SearchResult({
  category,
  isSelected,
  onSelect,
}: {
  category: CategoryTreeItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 py-2 px-3 rounded-md cursor-pointer transition-colors",
        "hover:bg-accent/50",
        isSelected && "bg-primary/10 text-primary"
      )}
      onClick={onSelect}
    >
      <Folder className="w-4 h-4 text-warning flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{category.name}</p>
        {category.tree_structure && (
          <p className="text-xs text-muted-foreground truncate">
            {category.tree_structure}
          </p>
        )}
      </div>
      <Badge variant="outline" className="text-xs">
        Nível {category.level}
      </Badge>
    </div>
  );
}

export function CategoryTreeNavigation({
  onSelectCategory,
  selectedCategoryId,
  showSearch = true,
  maxHeight = "400px",
  className,
}: CategoryTreeNavigationProps) {
  const { tree, searchCategories, isLoading, error, stats } = useCategoriesTree();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CategoryTreeItem[]>([]);

  // Toggle expandir/colapsar
  const handleToggle = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Selecionar categoria
  const handleSelect = useCallback((category: CategoryNode | CategoryTreeItem) => {
    onSelectCategory?.(category);
  }, [onSelectCategory]);

  // Buscar
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setSearchResults(searchCategories(query));
    } else {
      setSearchResults([]);
    }
  }, [searchCategories]);

  // Limpar busca
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  // Expandir todos
  const expandAll = useCallback(() => {
    const allIds = new Set<string>();
    const addIds = (nodes: CategoryNode[]) => {
      nodes.forEach(node => {
        if (node.children.length > 0) {
          allIds.add(node.id);
          addIds(node.children);
        }
      });
    };
    addIds(tree);
    setExpandedIds(allIds);
  }, [tree]);

  // Colapsar todos
  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("space-y-2 p-4", className)}>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-6 w-2/3" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("p-4 text-center text-destructive", className)}>
        <p className="text-sm">Erro ao carregar categorias</p>
        <p className="text-xs text-muted-foreground">{error}</p>
      </div>
    );
  }

  // Empty state
  if (tree.length === 0) {
    return (
      <div className={cn("p-4 text-center text-muted-foreground", className)}>
        <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Nenhuma categoria encontrada</p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header com busca */}
      {showSearch && (
        <div className="p-3 border-b space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar categoria..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-8 pr-8"
            />
            {searchQuery && (
              <button aria-label="Fechar"
                onClick={clearSearch}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
               aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{stats.total} categorias em {stats.levels} níveis</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={expandAll}>
                Expandir
              </Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={collapseAll}>
                Colapsar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <ScrollArea style={{ maxHeight }}>
        <div className="p-2">
          {/* Resultados de busca */}
          {searchQuery && searchResults.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground px-2 mb-2">
                {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''}
              </p>
              {searchResults.map(cat => (
                <SearchResult
                  key={cat.id}
                  category={cat}
                  isSelected={selectedCategoryId === cat.id}
                  onSelect={() => handleSelect(cat)}
                />
              ))}
            </div>
          ) : searchQuery && searchResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma categoria encontrada</p>
              <p className="text-xs">Tente outra busca</p>
            </div>
          ) : (
            /* Árvore de categorias */
            tree.map(node => (
              <TreeNode
                key={node.id}
                node={node}
                level={0}
                selectedId={selectedCategoryId || null}
                expandedIds={expandedIds}
                onToggle={handleToggle}
                onSelect={handleSelect}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default CategoryTreeNavigation;
