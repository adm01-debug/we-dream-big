/**
 * ProductImageGallery — Orchestrator component.
 * All logic extracted to useProductImageGallery hook.
 * All UI sections extracted to sub-components.
 */
import { Filter, Loader2 } from 'lucide-react';
import { useProductImageGallery } from './useProductImageGallery';
import { ImageFilterBar } from './ImageFilterBar';
import { ImageBulkToolbar } from './ImageBulkToolbar';
import { ImageGrid } from './ImageGrid';
import { ImageUploadArea } from './ImageUploadArea';
import { ImagePreviewDialog } from './ImagePreviewDialog';
import { ImageStatsBar } from './ImageStatsBar';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

interface ProductImageGalleryProps {
  images: string[];
  onChange: (images: string[]) => void;
  folder?: string;
  productId?: string;
}

export function ProductImageGallery({
  images,
  onChange,
  folder = 'products',
  productId,
}: ProductImageGalleryProps) {
  const g = useProductImageGallery({ images, onChange, folder, productId });
  const hasVariants = g.stats.byVariant.size > 0;
  const hasPrimary = g.externalImages.some((img) => img.is_primary);
  const hasOgImage = g.externalImages.some((img) => img.is_og_image);

  return (
    <div className="space-y-3">
      {/* Loading state */}
      {g.isLoadingExt && productId && (
        <div className="flex items-center justify-center py-4 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span className="text-sm">Carregando imagens...</span>
        </div>
      )}

      {/* Filter bar — show when there are images (not just external) */}
      {(g.externalImages.length > 0 || images.length > 3) && (
        <ImageFilterBar
          filterMode={g.filterMode}
          setFilterMode={g.setFilterMode}
          typeFilter={g.typeFilter}
          setTypeFilter={g.setTypeFilter}
          stats={g.stats}
          activeTypes={g.activeTypes}
          variantMap={g.variantMap}
          hasVariants={hasVariants}
        />
      )}

      {/* Bulk toolbar */}
      {images.length > 0 && (
        <ImageBulkToolbar
          bulkMode={g.bulkMode}
          setBulkMode={g.setBulkMode}
          clearSelection={g.clearSelection}
          selectAll={g.selectAll}
          filteredImagesCount={g.filteredImages.length}
          selectedUrls={g.selectedUrls}
          setSelectedUrls={g.setSelectedUrls}
          bulkUpdateType={g.bulkUpdateType}
          bulkUpdateVariant={g.bulkUpdateVariant}
          bulkUpdateAltText={g.bulkUpdateAltText}
          requestBulkDelete={() => g.setDeleteConfirm({ type: 'bulk' })}
          isBulkUpdating={g.isBulkUpdating}
          variants={g.variants}
        />
      )}

      {/* Image grid */}
      {g.filteredImages.length > 0 && (
        <ImageGrid
          filteredImages={g.filteredImages}
          images={images}
          extImageMap={g.extImageMap}
          variantMap={g.variantMap}
          bulkMode={g.bulkMode}
          selectedUrls={g.selectedUrls}
          editingIndex={g.editingIndex}
          dragIndex={g.dragIndex}
          dragOverIndex={g.dragOverIndex}
          toggleSelect={g.toggleSelect}
          handleDragStart={g.handleDragStart}
          handleDragOver={g.handleDragOver}
          handleDrop={g.handleDrop}
          handleDragEnd={g.handleDragEnd}
          setPreviewUrl={g.setPreviewUrl}
          setEditingIndex={g.setEditingIndex}
          handleSetPrimary={g.handleSetPrimary}
          requestRemove={(url) => g.setDeleteConfirm({ type: 'single', url })}
          updateExternalImageMeta={g.updateExternalImageMeta}
        />
      )}

      {/* Empty filtered state */}
      {g.filteredImages.length === 0 && images.length > 0 && (
        <div className="py-6 text-center text-sm text-muted-foreground">
          <Filter className="mx-auto mb-2 h-5 w-5 opacity-40" />
          Nenhuma imagem corresponde ao filtro selecionado
        </div>
      )}

      {/* Stats bar with SEO indicator */}
      {g.externalImages.length > 0 && (
        <ImageStatsBar stats={g.stats} hasPrimary={hasPrimary} hasOgImage={hasOgImage} />
      )}

      {/* Upload area */}
      <ImageUploadArea
        productId={productId}
        variants={g.variants}
        variantMap={g.variantMap}
        variantImageCounts={g.variantImageCounts}
        uploadVariant={g.uploadVariant}
        setUploadVariant={g.setUploadVariant}
        uploadImageType={g.uploadImageType}
        setUploadImageType={g.setUploadImageType}
        isUploading={g.isUploading}
        uploadCount={g.uploadCount}
        uploadProgress={g.uploadProgress}
        isDragOverZone={g.isDragOverZone}
        fileInputRef={g.fileInputRef}
        handleFilesChange={g.handleFilesChange}
        handleDropZone={g.handleDropZone}
        handleDropZoneDragOver={g.handleDropZoneDragOver}
        handleDropZoneDragLeave={g.handleDropZoneDragLeave}
      />

      {/* Preview dialog */}
      <ImagePreviewDialog
        previewUrl={g.previewUrl}
        onClose={() => g.setPreviewUrl(null)}
        extImageMap={g.extImageMap}
        variantMap={g.variantMap}
      />

      {/* Confirm delete dialog */}
      <ConfirmDeleteDialog
        open={!!g.deleteConfirm}
        onCancel={() => g.setDeleteConfirm(null)}
        onConfirm={() => {
          if (g.deleteConfirm?.type === 'single' && g.deleteConfirm.url) {
            g.handleRemove(g.deleteConfirm.url);
          } else if (g.deleteConfirm?.type === 'bulk') {
            g.bulkDelete();
          }
          g.setDeleteConfirm(null);
        }}
        title={g.deleteConfirm?.type === 'bulk' ? 'Remover imagens selecionadas' : 'Remover imagem'}
        count={g.deleteConfirm?.type === 'bulk' ? g.selectedUrls.size : 1}
      />
    </div>
  );
}
