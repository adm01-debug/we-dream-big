import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

export interface ContextualSuggestion {
  id: string;
  text: string;
  type: 'filter' | 'navigation' | 'action' | 'search';
  icon: string;
  priority: number;
}

interface RouteContext {
  route: string;
  section: 'products' | 'quotes' | 'orders' | 'clients' | 'collections' | 'admin' | 'other';
  entityId?: string;
}

interface UseContextualSuggestionsOptions {
  appliedFilters?: Record<string, unknown>;
  searchQuery?: string;
}

const ROUTE_PATTERNS: Record<string, RouteContext['section']> = {
  '/': 'products',
  '/produto': 'products',
  '/orcamentos': 'quotes',
  '/colecoes': 'collections',
  '/favoritos': 'products',
  '/admin': 'admin',
  '/bi': 'admin',
  '/simulador': 'products',
  '/mockup': 'products',
};

const SECTION_SUGGESTIONS: Record<RouteContext['section'], ContextualSuggestion[]> = {
  products: [
    { id: 'prod-1', text: 'canetas promocionais', type: 'search', icon: '🖊️', priority: 10 },
    { id: 'prod-2', text: 'mochilas personalizadas', type: 'search', icon: '🎒', priority: 9 },
    { id: 'prod-3', text: 'garrafas térmicas', type: 'search', icon: '🧴', priority: 8 },
    { id: 'prod-4', text: 'filtrar por ecológicos', type: 'filter', icon: '🌱', priority: 7 },
    { id: 'prod-5', text: 'mostrar em estoque', type: 'filter', icon: '📦', priority: 6 },
    { id: 'prod-6', text: 'ordenar por preço', type: 'filter', icon: '💰', priority: 5 },
    { id: 'prod-7', text: 'ir para orçamentos', type: 'navigation', icon: '📋', priority: 4 },
    { id: 'prod-8', text: 'novo orçamento', type: 'action', icon: '➕', priority: 3 },
  ],
  quotes: [
    { id: 'quote-1', text: 'orçamentos pendentes', type: 'filter', icon: '⏳', priority: 10 },
    { id: 'quote-2', text: 'orçamentos aprovados', type: 'filter', icon: '✅', priority: 9 },
    { id: 'quote-3', text: 'orçamentos desta semana', type: 'filter', icon: '📅', priority: 8 },
    { id: 'quote-4', text: 'criar novo orçamento', type: 'action', icon: '➕', priority: 7 },
    { id: 'quote-5', text: 'ir para pedidos', type: 'navigation', icon: '📦', priority: 6 },
    { id: 'quote-6', text: 'buscar cliente', type: 'search', icon: '👤', priority: 5 },
  ],
  orders: [
    { id: 'order-1', text: 'pedidos em produção', type: 'filter', icon: '🏭', priority: 10 },
    { id: 'order-2', text: 'pedidos prontos', type: 'filter', icon: '✅', priority: 9 },
    { id: 'order-3', text: 'pedidos pendentes', type: 'filter', icon: '⏳', priority: 8 },
    { id: 'order-4', text: 'pedidos enviados', type: 'filter', icon: '🚚', priority: 7 },
    { id: 'order-5', text: 'ir para orçamentos', type: 'navigation', icon: '📋', priority: 6 },
    { id: 'order-6', text: 'buscar pedido', type: 'search', icon: '🔍', priority: 5 },
  ],
  clients: [
    { id: 'client-1', text: 'clientes ativos', type: 'filter', icon: '✅', priority: 10 },
    { id: 'client-2', text: 'clientes recentes', type: 'filter', icon: '🆕', priority: 9 },
    { id: 'client-3', text: 'buscar por nome', type: 'search', icon: '👤', priority: 8 },
    { id: 'client-4', text: 'buscar por email', type: 'search', icon: '📧', priority: 7 },
    { id: 'client-5', text: 'ir para orçamentos', type: 'navigation', icon: '📋', priority: 6 },
    { id: 'client-6', text: 'novo orçamento', type: 'action', icon: '➕', priority: 5 },
  ],
  collections: [
    { id: 'col-1', text: 'minhas coleções', type: 'filter', icon: '📁', priority: 10 },
    { id: 'col-2', text: 'ir para favoritos', type: 'navigation', icon: '❤️', priority: 9 },
    { id: 'col-3', text: 'buscar produto', type: 'search', icon: '🔍', priority: 8 },
    { id: 'col-4', text: 'ir para catálogo', type: 'navigation', icon: '📦', priority: 7 },
  ],
  admin: [
    { id: 'admin-1', text: 'métricas de vendas', type: 'navigation', icon: '📊', priority: 10 },
    { id: 'admin-2', text: 'produtos mais vistos', type: 'filter', icon: '👁️', priority: 9 },
    { id: 'admin-3', text: 'ir para catálogo', type: 'navigation', icon: '📦', priority: 8 },
    { id: 'admin-4', text: 'ir para clientes', type: 'navigation', icon: '👥', priority: 7 },
  ],
  other: [
    { id: 'other-1', text: 'ir para catálogo', type: 'navigation', icon: '📦', priority: 10 },
    { id: 'other-2', text: 'ir para orçamentos', type: 'navigation', icon: '📋', priority: 9 },
    { id: 'other-3', text: 'ir para pedidos', type: 'navigation', icon: '🚚', priority: 8 },
    { id: 'other-4', text: 'buscar produto', type: 'search', icon: '🔍', priority: 7 },
  ],
};

// Contextual suggestions based on applied filters
const getFilterBasedSuggestions = (filters: Record<string, unknown>): ContextualSuggestion[] => {
  const suggestions: ContextualSuggestion[] = [];

  if (filters.category) {
    suggestions.push({
      id: 'ctx-cat-1',
      text: `${filters.category} em estoque`,
      type: 'filter',
      icon: '📦',
      priority: 15,
    });
    suggestions.push({
      id: 'ctx-cat-2',
      text: `${filters.category} baratas`,
      type: 'filter',
      icon: '💰',
      priority: 14,
    });
  }

  if (filters.color) {
    suggestions.push({
      id: 'ctx-color-1',
      text: `outros produtos ${filters.color}`,
      type: 'search',
      icon: '🎨',
      priority: 13,
    });
  }

  if (filters.priceMax) {
    suggestions.push({
      id: 'ctx-price-1',
      text: `limpar filtro de preço`,
      type: 'filter',
      icon: '🔄',
      priority: 12,
    });
  }

  if (filters.eco || filters.sustainable) {
    suggestions.push({
      id: 'ctx-eco-1',
      text: `kits ecológicos`,
      type: 'search',
      icon: '🌿',
      priority: 11,
    });
    suggestions.push({
      id: 'ctx-eco-2',
      text: `bambu e reciclados`,
      type: 'search',
      icon: '♻️',
      priority: 10,
    });
  }

  return suggestions;
};

// Time-based suggestions
const getTimeBasedSuggestions = (): ContextualSuggestion[] => {
  const hour = new Date().getHours();
  const suggestions: ContextualSuggestion[] = [];

  // Morning suggestions
  if (hour >= 8 && hour < 12) {
    suggestions.push({
      id: 'time-1',
      text: 'orçamentos de ontem',
      type: 'filter',
      icon: '📋',
      priority: 5,
    });
  }

  // Afternoon - focus on follow-ups
  if (hour >= 12 && hour < 18) {
    suggestions.push({
      id: 'time-2',
      text: 'pedidos pendentes',
      type: 'filter',
      icon: '⏳',
      priority: 5,
    });
  }

  // End of day - reports
  if (hour >= 17) {
    suggestions.push({
      id: 'time-3',
      text: 'vendas do dia',
      type: 'navigation',
      icon: '📊',
      priority: 5,
    });
  }

  return suggestions;
};

export const useContextualSuggestions = (options: UseContextualSuggestionsOptions = {}) => {
  const location = useLocation();
  const { appliedFilters = {}, searchQuery = '' } = options;

  // Determine current section from route
  const routeContext = useMemo((): RouteContext => {
    const pathname = location.pathname;
    
    let section: RouteContext['section'] = 'other';
    let entityId: string | undefined;

    for (const [pattern, sectionType] of Object.entries(ROUTE_PATTERNS)) {
      if (pathname === pattern || pathname.startsWith(pattern + '/')) {
        section = sectionType;
        // Extract entity ID if present
        const parts = pathname.split('/');
        if (parts.length > 2 && parts[2]) {
          entityId = parts[2];
        }
        break;
      }
    }

    return { route: pathname, section, entityId };
  }, [location.pathname]);

  // Generate contextual suggestions
  const suggestions = useMemo((): ContextualSuggestion[] => {
    const allSuggestions: ContextualSuggestion[] = [];

    // Add filter-based suggestions (highest priority)
    const filterSuggestions = getFilterBasedSuggestions(appliedFilters);
    allSuggestions.push(...filterSuggestions);

    // Add section-specific suggestions
    const sectionSuggestions = SECTION_SUGGESTIONS[routeContext.section] || SECTION_SUGGESTIONS.other;
    allSuggestions.push(...sectionSuggestions);

    // Add time-based suggestions
    const timeSuggestions = getTimeBasedSuggestions();
    allSuggestions.push(...timeSuggestions);

    // Filter out suggestions that match the current search query
    const normalizedQuery = searchQuery.toLowerCase().trim();
    const filtered = normalizedQuery
      ? allSuggestions.filter(s => !s.text.toLowerCase().includes(normalizedQuery))
      : allSuggestions;

    // Sort by priority and return top results
    return filtered
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 8);
  }, [routeContext, appliedFilters, searchQuery]);

  // Get suggestions matching a partial query
  const getMatchingSuggestions = (query: string): ContextualSuggestion[] => {
    if (!query || query.length < 2) return suggestions;

    const normalizedQuery = query.toLowerCase().trim();
    
    return suggestions
      .filter(s => s.text.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        // Prioritize starts-with matches
        const aStartsWith = s => s.text.toLowerCase().startsWith(normalizedQuery);
        if (aStartsWith(a) && !aStartsWith(b)) return -1;
        if (!aStartsWith(a) && aStartsWith(b)) return 1;
        return b.priority - a.priority;
      })
      .slice(0, 5);
  };

  return {
    suggestions,
    routeContext,
    getMatchingSuggestions,
  };
};
