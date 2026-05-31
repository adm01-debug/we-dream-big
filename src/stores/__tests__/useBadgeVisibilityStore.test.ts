import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBadgeVisibilityStore } from '../useBadgeVisibilityStore';

// Define the mock structure
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockResolvedValue({ data: { preferences: {} }, error: null }),
};

// Mock the lazy client
vi.mock('@/integrations/supabase/lazy-client', () => ({
  getSupabaseClient: vi.fn(() => Promise.resolve(mockSupabase)),
}));

describe('useBadgeVisibilityStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useBadgeVisibilityStore.setState({
      routeSettings: {},
      badgesEnabled: true,
      syncError: null,
    });
    vi.clearAllMocks();
    
    // Default success mock for each test
    mockSupabase.maybeSingle.mockResolvedValue({ data: { preferences: {} }, error: null });
    mockSupabase.update.mockReturnValue(mockSupabase);
    // Since we await the result of the whole chain, the last call should be thenable
    // or we can mock the whole chain to resolve to the error object.
    // In our case, the last calls are maybeSingle() or the whole update().eq() chain.
    // update().eq() is awaited, so we need to make it return a promise.
    (mockSupabase.eq as any).mockImplementation(() => Promise.resolve({ error: null }));
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
    expect(isBadgeEnabled('/home', 'dark')).toBe(true);
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
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
    expect(mockSupabase.update).toHaveBeenCalled();
  });

  it('should handle backend sync failure and set syncError', async () => {
    // Force failure on maybeSingle
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: new Error('Network error') });

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
