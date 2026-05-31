import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BadgeVisibilityStore {
  badgesEnabled: boolean;
  toggleBadges: () => void;
  setBadgesEnabled: (enabled: boolean) => void;
}

/**
 * Controla a visibilidade dos badges de status (Novidade, Promoção, Destaque, Kit)
 * nos cards de produto. Persiste a preferência do usuário no localStorage.
 */
export const useBadgeVisibilityStore = create<BadgeVisibilityStore>()(
  persist(
    (set) => ({
      badgesEnabled: true,
      toggleBadges: () => set((state) => ({ badgesEnabled: !state.badgesEnabled })),
      setBadgesEnabled: (enabled) => set({ badgesEnabled: enabled }),
    }),
    { name: 'badge-visibility' },
  ),
);
