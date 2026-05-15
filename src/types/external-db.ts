/**
 * Type definitions for external CRM database entities.
 * Eliminates (p as any).field and (t as any).field patterns.
 */

/** Product from external CRM database */
export interface ExternalProduct {
  id: string;
  sku: string;
  name: string;
  description?: string;
  short_description?: string;
  category_name?: string;
  brand?: string;
  sale_price?: number;
  base_price?: number;
  cost_price?: number;
  stock_quantity?: number;
  is_bestseller?: boolean;
  is_new?: boolean;
  is_kit?: boolean;
  supplier_code?: string;
  supplier_name?: string;
  image_url?: string;
  videos?: string[];
  [key: string]: unknown;
}

/** Technique with possible external DB field names */
export interface ExternalTechnique {
  id: string;
  name?: string;
  technique_name?: string;
  code?: string;
  technique_code?: string;
  setup_cost?: number | null;
  setup_price?: number | null;
  unit_cost?: number | null;
  handling_price?: number | null;
  max_colors?: number | null;
  min_area_cm2?: number | null;
  max_area_cm2?: number | null;
  sla_days?: number | null;
  [key: string]: unknown;
}

/** Print area from external DB */
export interface ExternalPrintArea {
  id: string;
  component_name?: string;
  location_name?: string;
  width_cm?: number;
  height_cm?: number;
  unit?: string;
  is_primary?: boolean;
  allowed_technique_ids?: string[];
  [key: string]: unknown;
}

/** Mockup selected technique with optional location data */
export interface MockupTechnique {
  id?: string;
  name?: string;
  code?: string | null;
  locationName?: string | null;
  maxWidth?: number | null;
  maxHeight?: number | null;
  [key: string]: unknown;
}
