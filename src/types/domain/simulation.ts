/**
 * Domain Types: Simulação de Personalização
 * 
 * Tipos de domínio para o simulador de preços e personalização.
 */

import type { PriceCalculationResult } from './personalization';

// ============================================
// PRODUTO (Domínio)
// ============================================

/**
 * Produto para simulação
 */
export interface SimulationProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  image_url?: string | null; // URL da imagem principal
  images?: string[];
  categoryName?: string | null;
  brand?: string | null;
  colors?: ProductColor[];
}

export interface ProductColor {
  code: string;
  name: string;
  hex?: string;
  stock?: number;
}

// ============================================
// CLIENTE (Domínio)
// ============================================

/**
 * Cliente para simulação
 */
export interface SimulationClient {
  id: string;
  name: string;
  ramo: string | null;
  nicho: string | null;
  logo_url?: string | null;
}

// ============================================
// CONFIGURAÇÃO DE TÉCNICA (Domínio)
// ============================================

/**
 * Configurações selecionadas para uma técnica
 */
export interface TechniqueSettings {
  colors: number;
  width: number;
  height: number;
  positions: number;
}

// ============================================
// OPÇÃO DE SIMULAÇÃO (Domínio)
// ============================================

/**
 * Resultado de uma opção de simulação
 */
export interface SimulationOption {
  id: string;
  
  // Identificação da técnica
  techniqueId: string;
  techniqueName: string;
  techniqueCode: string;
  
  // Configuração aplicada
  colors: number;
  width: number;
  height: number;
  positions: number;
  
  // Custos de personalização
  unitCost: number;
  setupCost: number;
  totalPersonalizationCost: number;
  costPerUnit: number;
  
  // Prazo
  estimatedDays: number;
  
  // Custos do produto
  productUnitPrice: number;
  totalProductCost: number;
  
  // Totais
  grandTotal: number;
  grandTotalPerUnit: number;

  // Origem do cálculo (auditoria)
  // 'rpc'             → fn_get_customization_price (oficial, novas tabelas de gravação)
  // 'legacy-fallback' → RPC falhou; estimativa heurística a partir de Technique.unit_cost/setup_cost
  // 'unavailable'     → técnica selecionada sem print area cadastrada para o produto
  priceSource?: 'rpc' | 'legacy-fallback' | 'unavailable';
  unavailableReason?: string;
  /** Mensagem amigável quando `priceSource === 'legacy-fallback'` */
  fallbackReason?: string;
  /** ISO timestamp do momento em que o resultado foi gerado (sucesso ou fallback). */
  calculatedAt?: string;
  /** `false` quando o RPC oficial falhou e o fallback heurístico foi usado. */
  rpcAvailable?: boolean;
}

// ============================================
// SIMULAÇÃO SALVA (Domínio)
// ============================================

/**
 * Simulação salva no banco
 * Nota: Usa snake_case para corresponder ao formato do banco de dados
 */
export interface SavedSimulation {
  id: string;
  seller_id: string;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  quantity: number;
  product_unit_price: number;
  simulation_data: SimulationOption[];
  notes: string | null;
  created_at: string;
  updated_at: string;
  client_id: string | null;
  bitrix_clients?: {
    id: string;
    name: string;
    ramo: string | null;
  } | null;
}

// ============================================
// WIZARD DE SIMULAÇÃO (Domínio)
// ============================================

export type SimulatorStep = 'product' | 'techniques' | 'results';

/**
 * Estado do wizard de simulação
 */
export interface SimulatorState {
  currentStep: SimulatorStep;
  selectedProductId: string | null;
  quantity: number;
  customProductPrice: string;
  selectedTechniques: string[];
  techniqueSettings: Record<string, TechniqueSettings>;
  simulationOptions: SimulationOption[];
}

// ============================================
// CENÁRIOS (Domínio)
// ============================================

/**
 * Cenário para comparação
 */
export interface SimulationScenario {
  product: SimulationProduct;
  quantity: number;
  options: SimulationOption[];
  savedAt: Date;
}

// ============================================
// RESULTADO DE SIMULAÇÃO COMPLETA (Domínio)
// ============================================

/**
 * Resultado completo de simulação com cálculo de preço
 */
export interface SimulationResult {
  technique: {
    id: string;
    code: string;
    name: string;
    componentName: string;
    locationName: string;
    maxColors: number | null;
  };
  priceCalculation: PriceCalculationResult;
  productTotal: number;
  customizationTotal: number;
  grandTotal: number;
  unitTotal: number;
}
