// src/types/mockup.ts
// Rascunhos de mockup

export interface MockupDraft {
  id: string;
  user_id: string;
  draft_key: string;                       // default: 'default'
  product_id: string | null;
  product_name: string | null;
  technique_id: string | null;
  technique_name: string | null;
  client_id: string | null;
  client_name: string | null;
  personalization_areas: PersonalizationArea[];  // JSONB
  logo_data: string | null;                // JSONB stringified
  created_at: string;
  updated_at: string;
}

export interface PersonalizationArea {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  scale?: number;
  logoScale?: number;
}

export interface LogoData {
  url: string;
  width: number;
  height: number;
  originalName?: string;
}

// Mockup gerado
export interface GeneratedMockup {
  id: string;
  seller_id: string;
  client_id: string | null;
  product_id: string | null;
  product_name: string;
  product_sku: string | null;
  technique_id: string | null;
  technique_name: string;
  logo_url: string;
  mockup_url: string;
  logo_width_cm: number | null;
  logo_height_cm: number | null;
  position_x: number | null;
  position_y: number | null;
  created_at: string;
}
