import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBadgeVisibilityStore } from '../useBadgeVisibilityStore';

// Mock the lazy client
vi.mock('@/integrations/supabase/lazy-client', () => ({
  getSupabaseClient: vi.fn(() => Promise.resolve({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { preferences: {} }, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: { preferences: {} }, error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

describe('useBadgeVisibilityStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useBadgeVisibilityStore.getState();
    useBadgeVisibilityStore.setState({
      routeSettings: {},
      badgesEnabled: true,
      syncError: null,
    });
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const state = useBadgeVisibilityStore.getState();
    expect(state.badgesEnabled).toBe(true);
    expect(state.routeSettings).toEqual({});
    expect(state.syncError).toBe(null);
  });

  it('should toggle badges for a specific route and theme (light)', async () => {
    const { toggleBadges, isBadgeEnabled } = useBadgeVisibilityStore.getState();
    
    await toggleBadges('/home', 'light');
    
    expect(isBadgeEnabled('/home', 'light')).toBe(false);
    expect(isBadgeEnabled('/home', 'dark')).toBe(true); // Default was true
  });

  it('should toggle badges for a specific route and theme (dark)', async () => {
    const { toggleBadges, isBadgeEnabled } = useBadgeVisibilityStore.getState();
    
    await toggleBadges('/catalog', 'dark');
    
    expect(isBadgeEnabled('/catalog', 'dark')).toBe(false);
    expect(isBadgeEnabled('/catalog', 'light')).toBe(true);
  });

  it('should handle global fallback if route is not configured', () => {
    const { isBadgeEnabled } = useBadgeVisibilityStore.getState();
    expect(isBadgeEnabled('/anywhere', 'light')).toBe(true);
    
    useBadgeVisibilityStore.setState({ badgesEnabled: false });
    expect(isBadgeEnabled('/anywhere', 'light')).toBe(false);
  });

  it('should sync with backend if userId is provided', async () => {
    const { toggleBadges } = useBadgeVisibilityStore.getState();
    const success = await toggleBadges('/home', 'light', 'user-123');
    
    expect(success).toBe(true);
    const { getSupabaseClient } = await import('@/integrations/supabase/lazy-client');
    expect(getSupabaseClient).toHaveBeenCalled();
  });

  it('should handle backend sync failure and set syncError', async () => {
    const { getSupabaseClient } = await import('@/integrations/supabase/lazy-client');
    vi.mocked(getSupabaseClient).mockResolvedValueOnce({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error('Network error') }),
      })),
    } as any);

    const { toggleBadges } = useBadgeVisibilityStore.getState();
    const success = await toggleBadges('/home', 'light', 'user-123');
    
    expect(success).toBe(false);
    expect(useBadgeVisibilityStore.getState().syncError).not.toBeNull();
    // Verify local state was still updated
    expect(useBadgeVisibilityStore.getState().isBadgeEnabled('/home', 'light')).toBe(false);
  });

  it('should initialize from profile preferences', () => {
    const { initializeFromProfile } = useBadgeVisibilityStore.getState();
    const mockPreferences = {
      badge_visibility: {
        '/home': { light: false, dark: true }
      }
    };
    
    initializeFromProfile(mockPreferences);
    
    const state = useBadgeVisibilityStore.getState();
    expect(state.routeSettings['/home'].light).toBe(false);
    expect(state.routeSettings['/home'].dark).toBe(true);
  });
});
