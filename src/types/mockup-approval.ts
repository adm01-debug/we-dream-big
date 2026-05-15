/**
 * Types for the Mockup Approval Page/Document
 */

export interface MockupApprovalData {
  /** Document number / reference */
  documentNumber: string;
  date: string;

  /** Client info */
  client: {
    name: string;
    cnpj?: string;
    contactName?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
  };

  /** Seller info */
  seller: {
    name: string;
    email?: string;
    phone?: string;
  };

  /** Product info */
  product: {
    name: string;
    sku?: string;
    imageUrl?: string;
    color?: string;
    colorHex?: string;
    material?: string;
    dimensions?: string;
    /** Physical specs for display */
    heightCm?: number | null;
    widthCm?: number | null;
    diameterCm?: number | null;
    depthCm?: number | null;
    capacityMl?: number | null;
    weightG?: number | null;
  };

  /** Personalization / technique info */
  personalization: {
    techniqueName: string;
    techniqueCode?: string;
    locationName: string;
    widthCm: number;
    heightCm: number;
    areaCm2?: number;
    colorsCount?: number;
  };

  /** Pantone colors detected from logo */
  pantoneColors: PantoneColorEntry[];

  /** The mockup image (AI-generated or static composition) */
  mockupImageUrl: string;

  /** Layout mode */
  layoutMode: 'ai' | 'static';

  /** Optional notes */
  notes?: string;
}

export interface PantoneColorEntry {
  /** Pantone code or color name */
  name: string;
  /** Hex color code */
  hex: string;
}
