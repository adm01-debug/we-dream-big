import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ReplenishmentWithDetails } from "@/hooks/useReplenishments";
import type { ColumnCount } from "@/components/products/ColumnSelector";
import { ReplenishmentGridCard } from "./ReplenishmentCards";

function colsToNum(cols: ColumnCount): number {
  return typeof cols === 'number' ? cols : 5;
}

function getGridColsClass(cols: ColumnCount): string {
  const map: Record<ColumnCount, string> = {
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    6: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
    8: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8",
  };
  return map[cols] ?? map[5];
}

function getGridGapClass(cols: ColumnCount): string {
  if (cols >= 8) return "gap-x-4 gap-y-8";
  if (cols >= 6) return "gap-x-6 gap-y-8";
  return "gap-x-8 gap-y-8";
}

export { getGridColsClass, getGridGapClass };

interface VirtualizedGridProps {
  products: ReplenishmentWithDetails[];
  gridColumns: ColumnCount;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onProductClick: (id: string) => void;
}

export function VirtualizedReplenishmentGrid({
  products,
  gridColumns,
  selectionMode,
  selectedIds,
  onToggleSelect,
  onProductClick,
}: VirtualizedGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const numCols = Math.min(colsToNum(gridColumns), products.length);
  const rowCount = Math.ceil(products.length / numCols);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 340,
    overscan: 3,
  });

  const effectiveCols = Math.min(gridColumns, products.length) as ColumnCount;

  return (
    <div
      ref={parentRef}
      className="overflow-auto"
      style={{ maxHeight: "calc(100vh - 280px)" }}
      role="list"
      aria-label="Grade de produtos repostos"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIdx = virtualRow.index * numCols;
          const rowProducts = products.slice(startIdx, startIdx + numCols);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className={`grid ${getGridColsClass(effectiveCols)} ${getGridGapClass(effectiveCols)}`}
            >
              {rowProducts.map((product) => (
                <div key={product.replenishment_id} role="listitem">
                  <ReplenishmentGridCard
                    product={product}
                    onClick={() => onProductClick(product.product_id)}
                    selectionMode={selectionMode}
                    isSelected={selectedIds.has(product.product_id)}
                    onToggleSelect={() => onToggleSelect(product.product_id)}
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
