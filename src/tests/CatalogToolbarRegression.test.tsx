import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CatalogToolbar } from '../components/catalog/CatalogToolbar';
import { TooltipProvider } from '../components/ui/tooltip';
import { vi, describe, it, expect } from 'vitest';
import type { FilterState } from '../components/filters/FilterPanel';
import { defaultFilters } from '../components/filters/FilterPanel';

describe('CatalogToolbar Regression', () => {
  it('SelectTrigger should receive click events despite being inside a Tooltip', async () => {
    // Mock scrollIntoView for Radix Select compatibility in JSDOM
    window.HTMLElement.prototype.scrollIntoView = vi.fn();

    const setSortBy = vi.fn();
    const mockProps = {
      filters: defaultFilters,
      setFilters: vi.fn(),
      activeFiltersCount: 0,
      filterSheetOpen: false,
      setFilterSheetOpen: vi.fn(),
      resetFilters: vi.fn(),
      sortBy: 'relevance' as const,
      setSortBy,
      statBadges: [],
      viewMode: 'grid' as const,
      setViewMode: vi.fn(),
      gridColumns: 4 as any,
      setGridColumns: vi.fn(),
      selectionMode: false,
      onToggleSelectionMode: vi.fn(),
    };

    render(
      <TooltipProvider>
        <CatalogToolbar {...mockProps} />
      </TooltipProvider>
    );

    // Find the select trigger
    const trigger = screen.getByLabelText(/ordenar por/i);
    expect(trigger).toBeDefined();

    // Click the trigger to open the dropdown
    fireEvent.click(trigger);

    // Wait for options to be rendered
    await waitFor(() => {
      // Find one of the options to confirm the menu is open
      expect(screen.getByText(/Menor Preço/i)).toBeDefined();
    });
  });
});
