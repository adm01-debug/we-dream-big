The project is already in a highly advanced state. Most core fixes (preview restoration, authentication, basic performance) were implemented in the previous turn. Now, we will focus on "Elite Cycle 2": deep optimization of the Catalog and UX flow to reach the 10/10 production-ready goal.

### Goals
- **Catalog Performance:** Optimize `useCatalogState` and `useCatalogFiltering` to handle 15k+ items with zero lag.
- **Visual Stability:** Ensure "Skeleton-to-Content" transitions are perfectly smooth without layout shift.
- **UX Refinement:** Polishing interaction patterns in the Toolbar and Selection mode.
- **Resilience:** Defensive guards for edge cases in product data.

### Proposed Changes

#### 1. Catalog Engine Optimization (`src/hooks/products/`)
- Refactor `useCatalogFiltering` to use a more efficient bitwise or index-based approach for color filtering if possible, or at least optimize the existing `useMemo` dependencies to prevent re-filtering when unrelated state changes.
- Implement "Virtual Scrolling" detection or optimized "Load More" logic in `useCatalogState` to handle the batching from the external bridge more gracefully.
- Add `startTransition` around non-critical catalog updates (view mode toggles, sort changes) to keep the UI responsive.

#### 2. Visual Stability & Skeletons (`src/components/catalog/`)
- Fine-tune `CatalogSkeleton` in `SkeletonLoaders.tsx` to match the exact dimensions of the `CatalogToolbar` and `ProductGrid` to eliminate the 1px jumps during hydration.
- Update `CatalogContent` to use the same gap and padding logic as the actual grid components.

#### 3. UX Polishing (`src/components/layout/` & `src/components/catalog/`)
- **Header Navigation:** Ensure the "Logo -> Restart Tour" flow is robust and respects mobile viewports.
- **Toolbar:** Fix the sticky positioning logic which uses CSS variables (`--header-h`, `--breadcrumb-h`) to ensure it doesn't overlap or leave gaps on different screen sizes.
- **Truncation:** Apply the "Smart Truncation" logic to more UI elements (product names in small grids, category labels).

#### 4. Precision & Formatting (`src/lib/format.ts`)
- Audit all remaining components using raw `toFixed(2)` and migrate them to `round2` from `format.ts` to ensure consistent currency calculations.

#### 5. Onboarding Robustness (`src/hooks/ui/useOnboarding.ts`)
- Fix potential race conditions in `useOnboarding` where state might try to update before the user record is fully verified.

### Technical Details
- Use `React.startTransition` for low-priority UI updates.
- Standardize `data-tour` attributes for consistent onboarding.
- Leverage `CSS clamp()` for responsive font sizes and spacing in the Catalog.
- Ensure all `IntersectionObserver` instances in catalog are properly cleaned up.
