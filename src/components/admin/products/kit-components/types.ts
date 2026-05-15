/**
 * Types and constants for ProductKitComponentsSection
 */

export interface KitComponent {
  id: string;
  kit_product_id: string;
  component_name: string | null;
  component_description: string | null;
  component_type_code: string | null;
  component_code: string | null;
  component_product_id: string | null;
  component_sku: string | null;
  quantity: number | null;
  display_order: number | null;
  is_optional: boolean | null;
  is_packaging: boolean | null;
  is_replaceable: boolean | null;
  allows_personalization: boolean | null;
  personalization_notes: string | null;
  material: string | null;
  color: string | null;
  primary_image_url: string | null;
  height_mm: number | null;
  width_mm: number | null;
  length_mm: number | null;
  weight_g: number | null;
  supplier_component_code: string | null;
  notes: string | null;
  is_active: boolean;
}

export interface ComponentFormData {
  component_name: string;
  component_type_code: string;
  component_code: string;
  component_sku: string;
  supplier_component_code: string;
  component_description: string;
  quantity: number;
  display_order: number;
  material: string;
  color: string;
  height_mm: number | null;
  width_mm: number | null;
  length_mm: number | null;
  weight_g: number | null;
  is_optional: boolean;
  is_packaging: boolean;
  is_replaceable: boolean;
  allows_personalization: boolean;
  personalization_notes: string;
  primary_image_url: string;
  notes: string;
}

export interface PrintArea {
  id: string;
  kit_component_id: string;
  location_code: string | null;
  location_name: string | null;
  area_name: string | null;
  max_width_mm: number | null;
  max_height_mm: number | null;
  technique_name: string | null;
  technique_id: string | null;
  tabela_preco_id: string | null;
  display_order: number | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PrintAreaFormData {
  location_code: string;
  location_name: string;
  technique_name: string;
  technique_id: string;
  max_width_mm: number | null;
  max_height_mm: number | null;
  tabela_preco_id: string;
  display_order: number;
  notes: string;
}

export interface BoxInternalDimensions {
  height_cm: number | null;
  width_cm: number | null;
  length_cm: number | null;
}

export const EMPTY_FORM: ComponentFormData = {
  component_name: '',
  component_type_code: '',
  component_code: '',
  component_sku: '',
  supplier_component_code: '',
  component_description: '',
  quantity: 1,
  display_order: 0,
  material: '',
  color: '',
  height_mm: null,
  width_mm: null,
  length_mm: null,
  weight_g: null,
  is_optional: false,
  is_packaging: false,
  is_replaceable: false,
  allows_personalization: true,
  personalization_notes: '',
  primary_image_url: '',
  notes: '',
};

export const EMPTY_PRINT_AREA: PrintAreaFormData = {
  location_code: '',
  location_name: '',
  technique_name: '',
  technique_id: '',
  max_width_mm: null,
  max_height_mm: null,
  tabela_preco_id: '',
  display_order: 0,
  notes: '',
};
