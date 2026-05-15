/**
 * ExternalCollectionTableView — Table view for catalog (external) collections with sorting.
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, Package, Copy, ArrowUp, ArrowDown, ArrowUpDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ExternalCollection } from "@/hooks/useExternalCollections";

type SortKey = "name" | "products";
type SortDir = "asc" | "desc";

function SortHeader({ label, sortKey, currentKey, currentDir, onSort, className }: {
  label: string; sortKey: SortKey; currentKey: SortKey | null; currentDir: SortDir;
  onSort: (key: SortKey) => void; className?: string;
}) {
  const isActive = currentKey === sortKey;
  return (
    <th
      className={cn(
        "px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer select-none hover:text-foreground transition-colors",
        className
      )}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          currentDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </th>
  );
}

interface ExternalCollectionTableViewProps {
  collections: ExternalCollection[];
  productCounts?: Map<string, number>;
  onNavigate: (id: string) => void;
  onDuplicate: (collection: ExternalCollection) => void;
}

export function ExternalCollectionTableView({
  collections, productCounts, onNavigate, onDuplicate,
}: ExternalCollectionTableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return collections;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...collections].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return dir * a.name.localeCompare(b.name, "pt-BR");
        case "products": {
          const ca = productCounts?.get(a.id) ?? 0;
          const cb = productCounts?.get(b.id) ?? 0;
          return dir * (ca - cb);
        }
        default:
          return 0;
      }
    });
  }, [collections, sortKey, sortDir, productCounts]);

  return (
    <div className="space-y-2">
      {/* Table */}
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-muted/30 border-b border-border/50">
              <SortHeader label="Coleção" sortKey="name" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} />
              <SortHeader label="Produtos" sortKey="products" currentKey={sortKey} currentDir={sortDir} onSort={handleSort} className="text-center" />
              <th className="px-3 py-2 w-20" />
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {sorted.length > 0 ? (
                sorted.map((collection, idx) => {
                  const count = productCounts?.get(collection.id);
                  return (
                    <motion.tr
                      key={collection.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="group border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => onNavigate(collection.id)}
                    >
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-8 h-8 rounded flex items-center justify-center text-sm shrink-0 overflow-hidden"
                            style={{ backgroundColor: collection.color ? `${collection.color}20` : "hsl(var(--muted))" }}
                          >
                            {collection.image_url ? (
                              <img src={collection.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <FolderOpen className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{collection.name}</p>
                            {collection.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[250px]">{collection.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Package className="h-3 w-3" />
                          {count ?? "—"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity gap-1"
                          onClick={() => onDuplicate(collection)}
                        >
                          <Copy className="h-3 w-3" />
                          Duplicar
                        </Button>
                      </td>
                    </motion.tr>
                  );
                })
              ) : (
                <motion.tr
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <td colSpan={3} className="px-3 py-8 text-center">
                    <Filter className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma coleção encontrada</p>
                  </td>
                </motion.tr>
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
