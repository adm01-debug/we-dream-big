/**
 * Hooks de Técnicas - Barrel Export
 * 
 * Estrutura modular:
 * - keys: Query keys centralizadas
 * - useTecnicasList: Busca e filtragem de técnicas
 * - useTecnicaMutations: CRUD operations
 * - useTabelasPreco: Tabelas de preço
 * - usePrecoCalculation: Cálculos de preço
 */

// Query Keys
export { TECNICAS_QUERY_KEYS } from './keys';

// Lista e Busca de Técnicas
export {
  useTecnicasList,
  useTecnicasResumo,
  useTecnicaById,
  useTecnicaByCodigo,
  useCategoriasTecnicas,
  useInvalidateTecnicas,
} from './useTecnicasList';

// Mutations (CRUD)
export { useTecnicaMutations } from './useTecnicaMutations';

// Tabelas de Preço
export {
  useTabelasPreco,
  useTabelasPorTecnica,
  useTabelaPorCodigo,
  useNomesTecnicasPreco,
  buscarTabelaAdequada,
} from './useTabelasPreco';

// Cálculo de Preços
export {
  calcularPreco,
  extractPriceTiersFromTabela,
  calculatePriceForQuantity,
  usePrecoCalculation,
  usePriceSimulator,
  type PriceTier,
  type PriceCalculation,
  type LegacyPriceTable,
} from './usePrecoCalculation';

// Re-export Print Areas hook
export {
  usePrintAreas,
  useTechniques,
  useTechniqueStats,
  useHasPrintAreas,
} from '../usePrintAreas';

// Re-export tipos de gravação
export type {
  TecnicaGravacao,
  TecnicaSimples,
  ProductPrintArea,
  PrintAreaWithTechniques,
  PersonalizacaoSelecionada,
  TechniqueStats,
  AreaShape,
} from '@/types/gravacao';

export {
  TECHNIQUE_COLORS,
  TECHNIQUE_ICONS,
  SHAPE_STYLES,
} from '@/types/gravacao';
