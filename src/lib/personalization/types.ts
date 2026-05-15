/**
 * Lib: Personalization Types
 *
 * Tipos internos usados pelos calculadores e validadores.
 * São versões simplificadas/flat dos tipos de domínio,
 * otimizadas para operações de cálculo.
 */
import type { PriceTier } from '../../types/domain';

// Re-export comum do domínio
export type {
  PriceTier,
  PrintArea,
  ColorOption,
  SizeOption,
  PriceCalculationParams,
  PriceCalculationResult,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  TableSelectionCriteria,
} from '../../types/domain';

// ============================================
// TIPOS INTERNOS DA LIB (para calculadores)
// ============================================

/**
 * Entrada de tabela de preço para calculadores
 * Versão flat/simplificada de PriceTable
 */
export interface PriceTableInput {
  id: string;
  tableCode: string;
  tableCodeOption: string;
  techniqueName: string;

  // Limites (flat)
  maxColors: number | null;
  maxWidthCm: number | null;
  maxHeightCm: number | null;
  minAreaCm2: number | null;
  maxAreaCm2: number | null;

  // Tipo de precificação
  priceByColor: boolean;
  priceByArea: boolean;
  priceByStitches: boolean;

  // Custos fixos
  setupPrice: number;
  handlingPrice: number;

  // Faixas de quantidade
  tiers: PriceTier[];

  // Status
  isActive: boolean;
}

/**
 * Entrada de técnica para validadores
 * Versão flat/simplificada de Technique
 */
export interface TechniqueInput {
  id: string;
  code: string;
  name: string;
  category: string;

  // Cores (flat)
  requiresColors: boolean;
  minColors: number;
  maxColors: number;
  priceByColor: boolean;
  extraColorPrice: number;

  // Área (flat)
  priceByArea: boolean;
  priceByStitches: boolean;
  minAreaCm2: number | null;
  maxAreaCm2: number | null;

  // Custos
  setupPrice: number;
  handlingPrice: number;
  costMultiplier: number;

  // Características
  appliesToCurved: boolean;

  // Status
  isActive: boolean;
}
