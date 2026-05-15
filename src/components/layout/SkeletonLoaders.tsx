import * as React from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Helper para criar skeletons como forwardRef divs.
 *
 * Por que forwardRef?
 *   Estes componentes são frequentemente usados como `fallback` de
 *   <Suspense> dentro de árvores que aplicam refs em descendentes
 *   (ex.: react-router em transição, react-helmet-async, framer-motion
 *   em ancestrais). Sem forwardRef, o React emite o warning
 *   "Function components cannot be given refs".
 */
type SkeletonRootProps = React.HTMLAttributes<HTMLDivElement>;

function makeSkeleton(
  displayName: string,
  render: () => React.ReactNode,
  rootClassName: string,
) {
  const Cmp = React.forwardRef<HTMLDivElement, SkeletonRootProps>(
    ({ className, ...rest }, ref) => (
      <div
        ref={ref}
        className={[rootClassName, className].filter(Boolean).join(" ")}
        {...rest}
      >
        {render()}
      </div>
    ),
  );
  Cmp.displayName = displayName;
  return Cmp;
}

/** Catalog / Products page skeleton */
export const CatalogSkeleton = makeSkeleton(
  "CatalogSkeleton",
  () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
      {/* Toolbar / search */}
      <Skeleton className="h-10 w-full max-w-md" />
      {/* Product grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-5 w-1/3" />
          </div>
        ))}
      </div>
    </>
  ),
  "space-y-6 p-4 lg:p-6",
);

/** Product detail page skeleton */
export const ProductDetailSkeleton = makeSkeleton(
  "ProductDetailSkeleton",
  () => (
    <>
      <Skeleton className="h-6 w-40" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image */}
        <Skeleton className="aspect-square w-full rounded-2xl" />
        {/* Info */}
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-10 w-1/3" />
          <div className="space-y-2 pt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-12 w-40 rounded-lg" />
            <Skeleton className="h-12 w-40 rounded-lg" />
          </div>
        </div>
      </div>
    </>
  ),
  "p-4 lg:p-6 space-y-6",
);

/** Quotes list page skeleton */
export const QuotesSkeleton = makeSkeleton(
  "QuotesSkeleton",
  () => (
    <>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </>
  ),
  "p-4 lg:p-6 space-y-6",
);

/** Admin pages skeleton */
export const AdminSkeleton = makeSkeleton(
  "AdminSkeleton",
  () => (
    <>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-10 w-32" />
      </div>
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      {/* Table */}
      <Skeleton className="h-10 w-full rounded-lg" />
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </>
  ),
  "p-4 lg:p-6 space-y-6",
);

/** Dashboard / home skeleton */
export const DashboardSkeleton = makeSkeleton(
  "DashboardSkeleton",
  () => (
    <>
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </>
  ),
  "p-4 lg:p-6 space-y-6",
);

/** Tools page skeleton (Mockup, Kit Builder, Simulador) */
export const ToolsSkeleton = makeSkeleton(
  "ToolsSkeleton",
  () => (
    <>
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-52" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </div>
      {/* Wizard steps */}
      <div className="flex gap-2 justify-center">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-2 w-16 rounded-full" />
        ))}
      </div>
      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </>
  ),
  "p-4 lg:p-6 space-y-6",
);

/** Profile page skeleton */
export const ProfileSkeleton = makeSkeleton(
  "ProfileSkeleton",
  () => (
    <>
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-12 w-32 rounded-lg" />
    </>
  ),
  "p-4 lg:p-6 space-y-6 max-w-2xl mx-auto",
);

/** Generic page skeleton (fallback) */
export const GenericSkeleton = makeSkeleton(
  "GenericSkeleton",
  () => (
    <>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="space-y-4 pt-4">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </>
  ),
  "p-4 lg:p-6 space-y-6",
);

/**
 * Returns the appropriate skeleton component based on the current route.
 */
export function getFallback(pathname: string): React.ReactNode {
  if (pathname.startsWith("/produto/")) return <ProductDetailSkeleton />;
  if (
    pathname === "/produtos" ||
    pathname === "/filtros" ||
    pathname === "/" ||
    pathname === "/novidades" ||
    pathname === "/reposicao" ||
    pathname === "/favoritos"
  )
    return <CatalogSkeleton />;
  if (pathname.startsWith("/orcamentos")) return <QuotesSkeleton />;
  if (pathname.startsWith("/admin") || pathname === "/status")
    return <AdminSkeleton />;
  if (pathname === "/dashboard") return <DashboardSkeleton />;

  if (
    pathname === "/mockup-generator" ||
    pathname === "/montar-kit" ||
    pathname === "/simulador" ||
    pathname === "/magic-up" ||
    pathname === "/simulador-precos" ||
    pathname === "/busca-preco"
  )
    return <ToolsSkeleton />;
  return <GenericSkeleton />;
}
