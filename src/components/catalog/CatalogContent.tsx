import { memo, useMemo } from "react";
import { ProductGrid } from "@/components/products/ProductGrid";
import { ProductList } from "@/components/products/ProductList";
import { ProductTableView } from "@/components/products/ProductTableView";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCardSkeleton } from "@/components/products/ProductCardSkeleton";
import { ProductListItemSkeleton } from "@/components/products/ProductListItemSkeleton";
import { ProductTableSkeleton } from "@/components/products/ProductTableSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import type { Product } from "@/hooks/products";
import type { ActiveColorFilter } from "@/utils/color-image-resolver";

interface CatalogContentProps {
  viewMode: "grid" | "list" | "table";
  shouldShowCatalogSkeleton: boolean;
  shouldShowEmptyState: boolean;
  hasActiveCatalogConstraints: boolean;
  paginatedProducts: Product[];
  filteredProducts: Product[];
  gridColumns: number;
  hasMoreProducts: boolean;
  isLoadingMore: boolean;
  totalEstimate: number;
  loadMoreRef: (node?: Element | null | undefined) => void;
  itemsPerPage: number;
  navigate: (path: string) => void;
  handleViewProduct: (product: Product) => void;
  handleShareProduct: (product: Product) => void;
  handleFavoriteProduct: (product: Product) => void;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => void;
  isInCompare: (productId: string) => boolean;
  onToggleCompare: (productId: string) => { added: boolean; isFull: boolean };
  canAddToCompare: boolean;
  onLoadMore: () => void;
  onResetFilters: () => void;
  selectionMode?: boolean;
  onSelectedCountChange?: (count: number) => void;
  activeColorFilter?: ActiveColorFilter | null;
}

const CatalogContent = memo(function CatalogContent({
  viewMode,
  shouldShowCatalogSkeleton,
  shouldShowEmptyState,
  hasActiveCatalogConstraints,
  paginatedProducts,
  filteredProducts,
  gridColumns,
  hasMoreProducts,
  isLoadingMore,
  totalEstimate,
  loadMoreRef,
  itemsPerPage,
  navigate,
  handleViewProduct,
  handleShareProduct,
  handleFavoriteProduct,
  isFavorite,
  toggleFavorite,
  isInCompare,
  onToggleCompare,
  canAddToCompare,
  onLoadMore,
  onResetFilters,
  selectionMode,
  activeColorFilter,
}: CatalogContentProps) {
  const columnClasses: Record<number, string> = {
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
    6: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
    8: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8",
  };

  const gridGap = useMemo(() => {
    if (gridColumns >= 8) return 'gap-x-4 gap-y-8';
    if (gridColumns >= 6) return 'gap-x-6 gap-y-8';
    return 'gap-x-8 gap-y-8';
  }, [gridColumns]);

  if (shouldShowCatalogSkeleton) {
    if (viewMode === "list") {
      return (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductListItemSkeleton key={i} />
          ))}
        </div>
      );
    }
    if (viewMode === "table") {
      return <ProductTableSkeleton rows={10} />;
    }
    return (
      <div className={cn("grid", columnClasses[gridColumns] || columnClasses[5], gridGap)}>
        {Array.from({ length: 12 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (shouldShowEmptyState) {
    return (
      <EmptyState
        variant="products"
        title="Nenhum produto encontrado"
        description={
          hasActiveCatalogConstraints
            ? "Tente ajustar seus filtros para ver mais resultados."
            : "Explore nosso catálogo completo para encontrar o que procura."
        }
        action={{
          label: "Limpar todos os filtros",
          onClick: onResetFilters,
        }}
      />
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {viewMode === "grid" && (
        <ProductGrid
          products={paginatedProducts}
          onProductClick={(pid) => navigate(`/produto/${pid}`)}
          onViewProduct={handleViewProduct}
          onShareProduct={handleShareProduct}
          onFavoriteProduct={handleFavoriteProduct}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          isInCompare={isInCompare}
          onToggleCompare={onToggleCompare}
          canAddToCompare={canAddToCompare}
          columns={gridColumns}
          activeColorFilter={activeColorFilter}
          selectionMode={selectionMode}
        />
      )}

      {viewMode === "list" && (
        <ProductList
          products={paginatedProducts}
          onProductClick={(pid) => navigate(`/produto/${pid}`)}
          onViewProduct={handleViewProduct}
          onShareProduct={handleShareProduct}
          onFavoriteProduct={handleFavoriteProduct}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          isInCompare={isInCompare}
          onToggleCompare={onToggleCompare}
          canAddToCompare={canAddToCompare}
          activeColorFilter={activeColorFilter}
          selectionMode={selectionMode}
        />
      )}

      {viewMode === "table" && (
        <ProductTableView
          products={paginatedProducts}
          onProductClick={(pid) => navigate(`/produto/${pid}`)}
          onViewProduct={handleViewProduct}
          onShareProduct={handleShareProduct}
          onFavoriteProduct={handleFavoriteProduct}
          isFavorite={isFavorite}
          onToggleFavorite={toggleFavorite}
          isInCompare={isInCompare}
          onToggleCompare={onToggleCompare}
          canAddToCompare={canAddToCompare}
          activeColorFilter={activeColorFilter}
          selectionMode={selectionMode}
        />
      )}

      {hasMoreProducts && (
        <div
          ref={loadMoreRef}
          className="flex justify-center py-8"
        >
          {isLoadingMore ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex gap-1.5">
                <Skeleton className="h-2 w-2 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <Skeleton className="h-2 w-2 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <Skeleton className="h-2 w-2 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <p className="text-xs text-muted-foreground font-medium animate-pulse">
                Carregando mais produtos...
              </p>
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              Exibindo {Math.min(paginatedProducts.length, totalEstimate)} de {totalEstimate} produtos
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export { CatalogContent };
