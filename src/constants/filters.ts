import type { AdvancedFilterState, StockFilterOption } from '@/types/advancedFilters';

export const defaultAdvancedFilters: AdvancedFilterState = {
  search: '',
  categories: [],
  suppliers: [],
  colors: [],
  materials: [],
  techniques: [],
  tags: [],
  colorGroups: [],
  colorVariations: [],
  colorNuances: [],
  datasComemorativas: [],
  publicoAlvo: [],
  endomarketing: [],
  ramosAtividade: [],
  segmentosAtividade: [],
  priceRange: [0, 1000],
  quantityRange: [1, 10000],
  stockStatus: 'all',
  minStock: 0,
  isKit: false,
  isFeatured: false,
  isNew: false,
  hasPersonalization: false,
  gender: [],
  maxLeadTimeDays: null,
  sortBy: 'name',
};

export const STOCK_FILTER_OPTIONS: StockFilterOption[] = [
  { value: 'all', label: 'Todos' },
  { value: 'in_stock', label: 'Em Estoque' },
  { value: 'low_stock', label: 'Estoque Baixo' },
  { value: 'out_of_stock', label: 'Sem Estoque' },
  { value: 'future', label: 'Estoque Futuro' },
];

export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevância (Busca)' },
  { value: 'name', label: 'Nome (A-Z)' },
  { value: 'price-asc', label: 'Menor Preço' },
  { value: 'price-desc', label: 'Maior Preço' },
  { value: 'newest', label: 'Lançamentos' },
  { value: 'stock', label: 'Maior Estoque' },
  { value: 'best-seller-supplier', label: '+ Vendidos (Indústria)' },
  { value: 'best-seller-promo', label: '+ Vendidos (Promo)' },
];
