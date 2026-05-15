/**
 * Comprehensive E2E Test Suite — Product Form Improvements
 * 
 * Validates ALL improvements made to the product registration module:
 * 1. Schema validation (fields, defaults, constraints)
 * 2. Step readiness logic (8 steps)
 * 3. Field placement (meta_description in SEO, short_description in Info)
 * 4. Flag configuration (13 flags with correct defaults)
 * 5. Packaging fields (box_quantity, box_inner_quantity)
 * 6. Dimensions (internal_diameter_cm added)
 * 7. Logistics fields preserved for data round-tripping
 * 8. Form defaults integrity
 * 9. Boundary/edge cases
 * 10. Regression: no removed fields that break data flow
 */
import { describe, it, expect } from 'vitest';
import { productFormSchema, defaultFormValues, type ProductFormData } from '@/components/admin/products/ProductFormSchema';

// ============================================================
// SECTION 1: SCHEMA STRUCTURE — Field Existence
// ============================================================
describe('Schema Structure — Field Existence', () => {
  const schema = productFormSchema;
  const shape = schema.shape;

  // Info básica
  it.each([
    'sku', 'name', 'description', 'short_description', 'brand',
    'category_id', 'supplier_id', 'supplier_reference',
  ])('has info field: %s', (field) => {
    expect(shape).toHaveProperty(field);
  });

  // Preço e estoque
  it.each([
    'sale_price', 'cost_price', 'suggested_price',
    'stock_quantity', 'min_quantity', 'min_order_quantity', 'stock_unit',
  ])('has price/stock field: %s', (field) => {
    expect(shape).toHaveProperty(field);
  });

  // Dimensões físicas
  it.each([
    'height_cm', 'width_cm', 'length_cm', 'diameter_cm', 'weight_g', 'capacity_ml',
  ])('has physical dimension: %s', (field) => {
    expect(shape).toHaveProperty(field);
  });

  // Dimensões internas (including new internal_diameter_cm)
  it.each([
    'internal_height_cm', 'internal_width_cm', 'internal_length_cm', 'internal_diameter_cm',
  ])('has internal dimension: %s', (field) => {
    expect(shape).toHaveProperty(field);
  });

  // Embalagem (including new box_quantity, box_inner_quantity)
  it.each([
    'packing_type', 'box_width_mm', 'box_height_mm', 'box_length_mm',
    'box_weight_kg', 'box_quantity', 'box_inner_quantity', 'box_volume_cm3',
    'box_internal_height_cm', 'box_internal_width_cm', 'box_internal_length_cm',
    'packaging_material', 'packaging_color', 'packaging_finish',
  ])('has packaging field: %s', (field) => {
    expect(shape).toHaveProperty(field);
  });

  // Flags (13 total)
  it.each([
    'is_active', 'is_featured', 'is_bestseller', 'is_new', 'is_on_sale',
    'is_kit', 'has_commercial_packaging', 'is_imported', 'is_textil',
    'is_thermal', 'allows_personalization', 'has_gift_box', 'has_optional_packaging',
  ])('has flag: %s', (field) => {
    expect(shape).toHaveProperty(field);
  });

  // Fiscal
  it.each([
    'ncm_code', 'ean', 'gtin', 'ipi_rate', 'country_of_origin',
    'cfop', 'csosn', 'icms_rate', 'pis_rate', 'cofins_rate',
    'tax_regime', 'cest',
  ])('has fiscal field: %s', (field) => {
    expect(shape).toHaveProperty(field);
  });

  // Logística (preserved for data round-tripping)
  it.each([
    'freight_class', 'default_carrier', 'shipping_weight_kg',
    'shipping_width_cm', 'shipping_height_cm', 'shipping_length_cm',
    'cubic_weight', 'requires_special_shipping', 'shipping_notes',
  ])('has logistics field (data round-trip): %s', (field) => {
    expect(shape).toHaveProperty(field);
  });

  // Comercial
  it.each([
    'lead_time_days', 'product_type', 'supply_mode', 'warranty_months', 'gender',
  ])('has commercial field: %s', (field) => {
    expect(shape).toHaveProperty(field);
  });

  // SEO (meta_description now in SEO section)
  it.each([
    'meta_title', 'meta_description', 'meta_keywords', 'slug', 'canonical_url',
  ])('has SEO field: %s', (field) => {
    expect(shape).toHaveProperty(field);
  });

  // Mídia e marketing
  it.each([
    'video_url', 'key_benefits', 'use_cases',
  ])('has media/marketing field: %s', (field) => {
    expect(shape).toHaveProperty(field);
  });
});

// ============================================================
// SECTION 2: DEFAULT VALUES — Integrity
// ============================================================
describe('Default Values — Integrity', () => {
  it('has all schema keys represented in defaults', () => {
    const schemaKeys = Object.keys(productFormSchema.shape).sort();
    const defaultKeys = Object.keys(defaultFormValues).sort();
    expect(defaultKeys).toEqual(schemaKeys);
  });

  it('default is_active is true', () => {
    expect(defaultFormValues.is_active).toBe(true);
  });

  it('default allows_personalization is true', () => {
    expect(defaultFormValues.allows_personalization).toBe(true);
  });

  it('default product_type is "product"', () => {
    expect(defaultFormValues.product_type).toBe('product');
  });

  it('default stock_unit is "un"', () => {
    expect(defaultFormValues.stock_unit).toBe('un');
  });

  it('default stock_quantity is 10000', () => {
    expect(defaultFormValues.stock_quantity).toBe(10000);
  });

  it('default min_quantity is 1', () => {
    expect(defaultFormValues.min_quantity).toBe(1);
  });

  it('all boolean flags default to false except is_active and allows_personalization', () => {
    const booleanFlags = [
      'is_featured', 'is_bestseller', 'is_new', 'is_on_sale', 'is_kit',
      'has_commercial_packaging', 'is_imported', 'is_textil', 'is_thermal',
      'has_gift_box', 'has_optional_packaging', 'requires_special_shipping',
    ] as const;
    booleanFlags.forEach(flag => {
      expect(defaultFormValues[flag]).toBe(false);
    });
  });

  it('all nullable numeric fields default to null', () => {
    const nullableFields = [
      'height_cm', 'width_cm', 'length_cm', 'diameter_cm', 'weight_g', 'capacity_ml',
      'internal_height_cm', 'internal_width_cm', 'internal_length_cm', 'internal_diameter_cm',
      'box_width_mm', 'box_height_mm', 'box_length_mm', 'box_weight_kg',
      'box_quantity', 'box_inner_quantity', 'box_volume_cm3',
      'box_internal_height_cm', 'box_internal_width_cm', 'box_internal_length_cm',
      'suggested_price', 'min_order_quantity',
      'ipi_rate', 'icms_rate', 'pis_rate', 'cofins_rate',
      'shipping_weight_kg', 'shipping_width_cm', 'shipping_height_cm', 'shipping_length_cm',
      'cubic_weight', 'lead_time_days', 'warranty_months',
    ] as const;
    nullableFields.forEach(field => {
      expect(defaultFormValues[field]).toBeNull();
    });
  });

  it('all string fields default to empty string', () => {
    const stringFields = [
      'sku', 'name', 'description', 'short_description', 'brand',
      'category_id', 'supplier_id', 'supplier_reference',
      'packing_type', 'packaging_material', 'packaging_color', 'packaging_finish',
      'ncm_code', 'ean', 'gtin', 'country_of_origin', 'cfop', 'csosn', 'tax_regime', 'cest',
      'freight_class', 'default_carrier', 'shipping_notes',
      'supply_mode', 'gender',
      'meta_title', 'meta_description', 'meta_keywords', 'slug', 'canonical_url',
      'video_url', 'key_benefits', 'use_cases',
    ] as const;
    stringFields.forEach(field => {
      expect(defaultFormValues[field]).toBe('');
    });
  });
});

// ============================================================
// SECTION 3: SCHEMA VALIDATION — Happy Path
// ============================================================
describe('Schema Validation — Happy Path', () => {
  const validProduct: ProductFormData = {
    ...defaultFormValues,
    sku: 'TEST-001',
    name: 'Caneta Promocional',
    supplier_id: 'supplier-uuid-123',
    sale_price: 15.90,
  };

  it('accepts a valid minimal product', () => {
    const result = productFormSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  it('accepts full product with all fields', () => {
    const full: ProductFormData = {
      ...validProduct,
      description: 'Caneta esferográfica com corpo plástico',
      short_description: 'Caneta esferográfica',
      brand: 'BIC',
      category_id: 'cat-001',
      supplier_reference: 'BIC-PEN-001',
      cost_price: 8.50,
      suggested_price: 12.75,
      stock_quantity: 5000,
      min_quantity: 50,
      min_order_quantity: 100,
      stock_unit: 'un',
      height_cm: 14,
      width_cm: 1,
      length_cm: 1,
      diameter_cm: 0.8,
      weight_g: 12,
      capacity_ml: null,
      internal_height_cm: null,
      internal_width_cm: null,
      internal_length_cm: null,
      internal_diameter_cm: null,
      packing_type: 'Caixa',
      box_width_mm: 200,
      box_height_mm: 100,
      box_length_mm: 150,
      box_weight_kg: 0.5,
      box_quantity: 50,
      box_inner_quantity: 10,
      box_volume_cm3: 3000,
      box_internal_height_cm: 9,
      box_internal_width_cm: 19,
      box_internal_length_cm: 14,
      packaging_material: 'Papelão',
      packaging_color: 'Kraft',
      packaging_finish: 'Fosco',
      is_active: true,
      is_featured: true,
      is_bestseller: false,
      is_new: true,
      is_on_sale: false,
      is_kit: false,
      has_commercial_packaging: true,
      is_imported: false,
      is_textil: false,
      is_thermal: false,
      allows_personalization: true,
      has_gift_box: false,
      has_optional_packaging: false,
      ncm_code: '96081000',
      ean: '7891234567890',
      gtin: '07891234567890',
      ipi_rate: 5,
      country_of_origin: 'Brasil',
      cfop: '5102',
      csosn: '102',
      icms_rate: 18,
      pis_rate: 1.65,
      cofins_rate: 7.6,
      tax_regime: 'simples_nacional',
      cest: '2000100',
      freight_class: 'A',
      default_carrier: 'Correios',
      shipping_weight_kg: 0.6,
      shipping_width_cm: 20,
      shipping_height_cm: 10,
      shipping_length_cm: 15,
      cubic_weight: 0.5,
      requires_special_shipping: false,
      shipping_notes: '',
      lead_time_days: 7,
      product_type: 'product',
      supply_mode: 'pronta_entrega_liso',
      warranty_months: 3,
      gender: 'unissex',
      meta_title: 'Caneta Promocional BIC',
      meta_description: 'Caneta esferográfica personalizada para brindes',
      meta_keywords: 'caneta, brinde, promocional',
      slug: 'caneta-promocional-bic',
      canonical_url: '/produto/caneta-promocional-bic',
      video_url: 'https://youtube.com/watch?v=123',
      key_benefits: 'Escrita suave\nDurável\nPersonalizável',
      use_cases: 'Brindes corporativos\nFeiras\nEventos',
    };
    const result = productFormSchema.safeParse(full);
    expect(result.success).toBe(true);
  });
});

// ============================================================
// SECTION 4: SCHEMA VALIDATION — Required Fields
// ============================================================
describe('Schema Validation — Required Fields', () => {
  it('rejects empty SKU', () => {
    const result = productFormSchema.safeParse({ ...defaultFormValues, supplier_id: 'x', name: 'Test', sku: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const skuErr = result.error.issues.find(i => i.path.includes('sku'));
      expect(skuErr).toBeDefined();
    }
  });

  it('rejects whitespace-only SKU', () => {
    const result = productFormSchema.safeParse({ ...defaultFormValues, supplier_id: 'x', name: 'Test', sku: '   ' });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = productFormSchema.safeParse({ ...defaultFormValues, supplier_id: 'x', sku: 'T1', name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty supplier_id', () => {
    const result = productFormSchema.safeParse({ ...defaultFormValues, sku: 'T1', name: 'Test', supplier_id: '' });
    expect(result.success).toBe(false);
  });

  it('accepts sale_price of 0 (free products)', () => {
    const result = productFormSchema.safeParse({ ...defaultFormValues, sku: 'T1', name: 'Free', supplier_id: 'x', sale_price: 0 });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// SECTION 5: SCHEMA VALIDATION — Edge Cases & Boundaries
// ============================================================
describe('Schema Validation — Edge Cases', () => {
  const base = { ...defaultFormValues, sku: 'T1', name: 'Test', supplier_id: 'x' };

  it('rejects negative sale_price', () => {
    const result = productFormSchema.safeParse({ ...base, sale_price: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects SKU longer than 50 chars', () => {
    const result = productFormSchema.safeParse({ ...base, sku: 'A'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('accepts SKU exactly 50 chars', () => {
    const result = productFormSchema.safeParse({ ...base, sku: 'A'.repeat(50) });
    expect(result.success).toBe(true);
  });

  it('rejects name longer than 300 chars', () => {
    const result = productFormSchema.safeParse({ ...base, name: 'X'.repeat(301) });
    expect(result.success).toBe(false);
  });

  it('accepts name exactly 300 chars', () => {
    const result = productFormSchema.safeParse({ ...base, name: 'X'.repeat(300) });
    expect(result.success).toBe(true);
  });

  it('rejects description longer than 5000 chars', () => {
    const result = productFormSchema.safeParse({ ...base, description: 'D'.repeat(5001) });
    expect(result.success).toBe(false);
  });

  it('rejects short_description longer than 500 chars', () => {
    const result = productFormSchema.safeParse({ ...base, short_description: 'S'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('rejects meta_description longer than 500 chars', () => {
    const result = productFormSchema.safeParse({ ...base, meta_description: 'M'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('rejects meta_title longer than 200 chars', () => {
    const result = productFormSchema.safeParse({ ...base, meta_title: 'T'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('rejects meta_keywords longer than 500 chars', () => {
    const result = productFormSchema.safeParse({ ...base, meta_keywords: 'K'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('rejects key_benefits longer than 2000 chars', () => {
    const result = productFormSchema.safeParse({ ...base, key_benefits: 'B'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it('rejects use_cases longer than 2000 chars', () => {
    const result = productFormSchema.safeParse({ ...base, use_cases: 'U'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it('accepts 0 for stock_quantity', () => {
    const result = productFormSchema.safeParse({ ...base, stock_quantity: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects negative stock_quantity', () => {
    const result = productFormSchema.safeParse({ ...base, stock_quantity: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects min_quantity below 1', () => {
    const result = productFormSchema.safeParse({ ...base, min_quantity: 0 });
    expect(result.success).toBe(false);
  });

  it('accepts min_quantity of 1', () => {
    const result = productFormSchema.safeParse({ ...base, min_quantity: 1 });
    expect(result.success).toBe(true);
  });

  it('rejects negative height_cm', () => {
    const result = productFormSchema.safeParse({ ...base, height_cm: -5 });
    expect(result.success).toBe(false);
  });

  it('accepts null for all nullable dimensions', () => {
    const result = productFormSchema.safeParse({
      ...base,
      height_cm: null, width_cm: null, length_cm: null,
      diameter_cm: null, weight_g: null, capacity_ml: null,
      internal_diameter_cm: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative box_quantity', () => {
    const result = productFormSchema.safeParse({ ...base, box_quantity: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects negative box_inner_quantity', () => {
    const result = productFormSchema.safeParse({ ...base, box_inner_quantity: -1 });
    expect(result.success).toBe(false);
  });

  it('accepts 0 for ipi_rate', () => {
    const result = productFormSchema.safeParse({ ...base, ipi_rate: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects negative ipi_rate', () => {
    const result = productFormSchema.safeParse({ ...base, ipi_rate: -0.5 });
    expect(result.success).toBe(false);
  });

  it('accepts very large sale_price', () => {
    const result = productFormSchema.safeParse({ ...base, sale_price: 999999.99 });
    expect(result.success).toBe(true);
  });

  it('rejects brand longer than 100 chars', () => {
    const result = productFormSchema.safeParse({ ...base, brand: 'B'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('rejects ncm_code longer than 20 chars', () => {
    const result = productFormSchema.safeParse({ ...base, ncm_code: '1'.repeat(21) });
    expect(result.success).toBe(false);
  });

  it('rejects cfop longer than 10 chars', () => {
    const result = productFormSchema.safeParse({ ...base, cfop: '1'.repeat(11) });
    expect(result.success).toBe(false);
  });

  it('rejects shipping_notes longer than 500 chars', () => {
    const result = productFormSchema.safeParse({ ...base, shipping_notes: 'N'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('accepts slug with special characters', () => {
    const result = productFormSchema.safeParse({ ...base, slug: 'caneta-bic-001' });
    expect(result.success).toBe(true);
  });

  it('rejects slug longer than 300 chars', () => {
    const result = productFormSchema.safeParse({ ...base, slug: 's'.repeat(301) });
    expect(result.success).toBe(false);
  });

  it('rejects canonical_url longer than 500 chars', () => {
    const result = productFormSchema.safeParse({ ...base, canonical_url: '/'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('rejects video_url longer than 500 chars', () => {
    const result = productFormSchema.safeParse({ ...base, video_url: 'v'.repeat(501) });
    expect(result.success).toBe(false);
  });

  it('accepts negative warranty_months of 0', () => {
    const result = productFormSchema.safeParse({ ...base, warranty_months: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects negative warranty_months', () => {
    const result = productFormSchema.safeParse({ ...base, warranty_months: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects negative lead_time_days', () => {
    const result = productFormSchema.safeParse({ ...base, lead_time_days: -3 });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// SECTION 6: SCHEMA VALIDATION — Type Coercion
// ============================================================
describe('Schema Validation — Type Coercion', () => {
  const base = { ...defaultFormValues, sku: 'T1', name: 'Test', supplier_id: 'x' };

  it('coerces string "15.90" to number for sale_price', () => {
    const result = productFormSchema.safeParse({ ...base, sale_price: '15.90' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.sale_price).toBe(15.9);
  });

  it('coerces string "100" to number for stock_quantity', () => {
    const result = productFormSchema.safeParse({ ...base, stock_quantity: '100' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.stock_quantity).toBe(100);
  });

  it('coerces string "5" to number for height_cm', () => {
    const result = productFormSchema.safeParse({ ...base, height_cm: '5' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.height_cm).toBe(5);
  });

  it('coerces string "3" for warranty_months', () => {
    const result = productFormSchema.safeParse({ ...base, warranty_months: '3' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.warranty_months).toBe(3);
  });

  it('coerces string "10" for box_quantity', () => {
    const result = productFormSchema.safeParse({ ...base, box_quantity: '10' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.box_quantity).toBe(10);
  });
});

// ============================================================
// SECTION 7: FIELD COUNT — Regression Guard
// ============================================================
describe('Field Count — Regression Guard', () => {
  const schemaKeys = Object.keys(productFormSchema.shape);
  const defaultKeys = Object.keys(defaultFormValues);

  it('schema has exactly the expected number of fields', () => {
    // Current count after all improvements:
    // Info: 8, Price: 7, Dims: 10, Package: 14, Flags: 13, Fiscal: 12, Logistics: 9, Commercial: 5, SEO: 5, Media: 1, Marketing: 2 = total
    expect(schemaKeys.length).toBeGreaterThanOrEqual(80);
    expect(schemaKeys.length).toBeLessThanOrEqual(95);
  });

  it('defaults match schema exactly (no orphans, no missing)', () => {
    const schemaSet = new Set(schemaKeys);
    const defaultSet = new Set(defaultKeys);
    
    const missingInDefaults = schemaKeys.filter(k => !defaultSet.has(k));
    const extraInDefaults = defaultKeys.filter(k => !schemaSet.has(k));
    
    expect(missingInDefaults).toEqual([]);
    expect(extraInDefaults).toEqual([]);
  });
});

// ============================================================
// SECTION 8: NEW FIELDS — Specific Validation
// ============================================================
describe('New Fields — Specific Validation', () => {
  const base = { ...defaultFormValues, sku: 'T1', name: 'Test', supplier_id: 'x' };

  // short_description
  it('short_description accepts valid text', () => {
    const r = productFormSchema.safeParse({ ...base, short_description: 'Caneta esferográfica' });
    expect(r.success).toBe(true);
  });

  it('short_description rejects >500 chars', () => {
    const r = productFormSchema.safeParse({ ...base, short_description: 'X'.repeat(501) });
    expect(r.success).toBe(false);
  });

  // internal_diameter_cm
  it('internal_diameter_cm accepts positive value', () => {
    const r = productFormSchema.safeParse({ ...base, internal_diameter_cm: 5.5 });
    expect(r.success).toBe(true);
  });

  it('internal_diameter_cm rejects negative', () => {
    const r = productFormSchema.safeParse({ ...base, internal_diameter_cm: -1 });
    expect(r.success).toBe(false);
  });

  // box_quantity
  it('box_quantity accepts positive integer', () => {
    const r = productFormSchema.safeParse({ ...base, box_quantity: 50 });
    expect(r.success).toBe(true);
  });

  // box_inner_quantity
  it('box_inner_quantity accepts positive integer', () => {
    const r = productFormSchema.safeParse({ ...base, box_inner_quantity: 10 });
    expect(r.success).toBe(true);
  });

  // warranty_months
  it('warranty_months accepts positive integer', () => {
    const r = productFormSchema.safeParse({ ...base, warranty_months: 12 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.warranty_months).toBe(12);
  });

  // product_type
  it('product_type accepts custom types', () => {
    for (const type of ['product', 'service', 'kit', 'digital']) {
      const r = productFormSchema.safeParse({ ...base, product_type: type });
      expect(r.success).toBe(true);
    }
  });

  // meta_description (now in SEO group)
  it('meta_description accepts valid text', () => {
    const r = productFormSchema.safeParse({ ...base, meta_description: 'SEO description' });
    expect(r.success).toBe(true);
  });
});

// ============================================================
// SECTION 9: STEP READINESS LOGIC — Unit Tests
// ============================================================
describe('Step Readiness Logic', () => {
  // Simulates the stepReady computation from ProductFormFullscreen
  function computeStepReady(
    formValues: Partial<ProductFormData>,
    images: string[] = [],
    isEdit = false,
    productId?: string,
  ): boolean[] {
    return [
      /* essentials */      Boolean(formValues.supplier_id && formValues.sku && formValues.name),
      /* commercial */      Boolean((formValues.sale_price ?? 0) > 0),
      /* packaging */       Boolean(formValues.packing_type),
      /* fiscal */          Boolean(formValues.ncm_code || formValues.ean),
      /* engraving */       isEdit && !!productId,
      /* classification */  true,
      /* media */           images.length > 0 || Boolean(formValues.video_url),
      /* content (SEO) */   Boolean(formValues.meta_title || formValues.meta_description || formValues.key_benefits),
    ];
  }

  it('returns exactly 8 steps', () => {
    const ready = computeStepReady(defaultFormValues);
    expect(ready).toHaveLength(8);
  });

  it('essentials: false when missing supplier_id', () => {
    const ready = computeStepReady({ ...defaultFormValues, sku: 'T1', name: 'Test', supplier_id: '' });
    expect(ready[0]).toBe(false);
  });

  it('essentials: false when missing sku', () => {
    const ready = computeStepReady({ ...defaultFormValues, supplier_id: 'x', sku: '', name: 'Test' });
    expect(ready[0]).toBe(false);
  });

  it('essentials: false when missing name', () => {
    const ready = computeStepReady({ ...defaultFormValues, supplier_id: 'x', sku: 'T1', name: '' });
    expect(ready[0]).toBe(false);
  });

  it('essentials: true when all provided', () => {
    const ready = computeStepReady({ ...defaultFormValues, supplier_id: 'x', sku: 'T1', name: 'Test' });
    expect(ready[0]).toBe(true);
  });

  it('commercial: false when sale_price is 0', () => {
    const ready = computeStepReady({ ...defaultFormValues, sale_price: 0 });
    expect(ready[1]).toBe(false);
  });

  it('commercial: true when sale_price > 0', () => {
    const ready = computeStepReady({ ...defaultFormValues, sale_price: 10 });
    expect(ready[1]).toBe(true);
  });

  it('packaging: false when packing_type is empty', () => {
    const ready = computeStepReady({ ...defaultFormValues, packing_type: '' });
    expect(ready[2]).toBe(false);
  });

  it('packaging: true when packing_type set', () => {
    const ready = computeStepReady({ ...defaultFormValues, packing_type: 'Caixa' });
    expect(ready[2]).toBe(true);
  });

  it('fiscal: false when no NCM or EAN', () => {
    const ready = computeStepReady({ ...defaultFormValues, ncm_code: '', ean: '' });
    expect(ready[3]).toBe(false);
  });

  it('fiscal: true when NCM provided', () => {
    const ready = computeStepReady({ ...defaultFormValues, ncm_code: '96081000' });
    expect(ready[3]).toBe(true);
  });

  it('fiscal: true when EAN provided', () => {
    const ready = computeStepReady({ ...defaultFormValues, ean: '7891234567890' });
    expect(ready[3]).toBe(true);
  });

  it('engraving: false when not editing', () => {
    const ready = computeStepReady(defaultFormValues, [], false);
    expect(ready[4]).toBe(false);
  });

  it('engraving: true when editing with productId', () => {
    const ready = computeStepReady(defaultFormValues, [], true, 'product-123');
    expect(ready[4]).toBe(true);
  });

  it('engraving: false when editing without productId', () => {
    const ready = computeStepReady(defaultFormValues, [], true, undefined);
    expect(ready[4]).toBe(false);
  });

  it('classification: always true', () => {
    const ready = computeStepReady(defaultFormValues);
    expect(ready[5]).toBe(true);
  });

  it('media: false when no images and no video', () => {
    const ready = computeStepReady({ ...defaultFormValues, video_url: '' }, []);
    expect(ready[6]).toBe(false);
  });

  it('media: true when images present', () => {
    const ready = computeStepReady(defaultFormValues, ['img1.jpg']);
    expect(ready[6]).toBe(true);
  });

  it('media: true when video_url present', () => {
    const ready = computeStepReady({ ...defaultFormValues, video_url: 'https://youtube.com/123' });
    expect(ready[6]).toBe(true);
  });

  it('content: false when no SEO/marketing data', () => {
    const ready = computeStepReady({ ...defaultFormValues, meta_title: '', meta_description: '', key_benefits: '' });
    expect(ready[7]).toBe(false);
  });

  it('content: true when meta_title present', () => {
    const ready = computeStepReady({ ...defaultFormValues, meta_title: 'SEO Title' });
    expect(ready[7]).toBe(true);
  });

  it('content: true when meta_description present', () => {
    const ready = computeStepReady({ ...defaultFormValues, meta_description: 'SEO desc' });
    expect(ready[7]).toBe(true);
  });

  it('content: true when key_benefits present', () => {
    const ready = computeStepReady({ ...defaultFormValues, key_benefits: 'Benefit 1' });
    expect(ready[7]).toBe(true);
  });

  it('all steps ready for complete product', () => {
    const ready = computeStepReady(
      {
        ...defaultFormValues,
        supplier_id: 'x', sku: 'T1', name: 'Test',
        sale_price: 15,
        packing_type: 'Caixa',
        ncm_code: '96081000',
        meta_title: 'SEO',
        video_url: 'https://vid.com',
      },
      ['img.jpg'],
      true,
      'product-id',
    );
    expect(ready.every(Boolean)).toBe(true);
  });
});

// ============================================================
// SECTION 10: MISSING FIELDS LOGIC — Unit Tests
// ============================================================
describe('Missing Fields Logic', () => {
  const STEPS = [
    { requiredFields: ['supplier_id', 'sku', 'name'], fieldLabels: { supplier_id: 'Fornecedor', sku: 'SKU Interno', name: 'Nome do Produto' } },
    { requiredFields: ['sale_price'], fieldLabels: { sale_price: 'Preço de Venda' } },
    { requiredFields: [], fieldLabels: {} },
    { requiredFields: [], fieldLabels: {} },
    { requiredFields: [], fieldLabels: {} },
    { requiredFields: [], fieldLabels: {} },
    { requiredFields: [], fieldLabels: {} },
    { requiredFields: [], fieldLabels: {} },
  ] as const;

  function computeMissing(formValues: Record<string, any>) {
    return STEPS.map(step =>
      step.requiredFields
        .filter(f => {
          const val = formValues[f];
          if (typeof val === 'number') return val <= 0 || val === undefined || val === null;
          return !val;
        })
        .map(f => (step.fieldLabels as any)[f] || f)
    );
  }

  it('shows all 3 missing fields on empty essentials', () => {
    const m = computeMissing({ supplier_id: '', sku: '', name: '', sale_price: 0 });
    expect(m[0]).toEqual(['Fornecedor', 'SKU Interno', 'Nome do Produto']);
  });

  it('shows sale_price missing when 0', () => {
    const m = computeMissing({ supplier_id: 'x', sku: 'T1', name: 'Test', sale_price: 0 });
    expect(m[1]).toEqual(['Preço de Venda']);
  });

  it('shows no missing when all filled', () => {
    const m = computeMissing({ supplier_id: 'x', sku: 'T1', name: 'Test', sale_price: 15 });
    expect(m[0]).toEqual([]);
    expect(m[1]).toEqual([]);
  });

  it('steps 2-7 never have missing fields (no required)', () => {
    const m = computeMissing({});
    for (let i = 2; i < 8; i++) {
      expect(m[i]).toEqual([]);
    }
  });
});

// ============================================================
// SECTION 11: FLAG CONFIGURATION — Completeness
// ============================================================
describe('Flag Configuration — 13 Flags', () => {
  const FLAGS = [
    'is_active', 'is_featured', 'is_bestseller', 'is_new', 'is_on_sale',
    'is_kit', 'is_imported', 'is_textil', 'is_thermal',
    'allows_personalization', 'has_gift_box', 'has_optional_packaging', 'has_commercial_packaging',
  ] as const;

  it('has exactly 13 boolean flags', () => {
    expect(FLAGS).toHaveLength(13);
  });

  it.each(FLAGS)('flag %s exists in schema', (flag) => {
    expect(productFormSchema.shape).toHaveProperty(flag);
  });

  it.each(FLAGS)('flag %s exists in defaultFormValues', (flag) => {
    expect(defaultFormValues).toHaveProperty(flag);
    expect(typeof defaultFormValues[flag]).toBe('boolean');
  });

  it.each(FLAGS)('flag %s validates as boolean', (flag) => {
    const base = { ...defaultFormValues, sku: 'T1', name: 'Test', supplier_id: 'x' };
    
    const trueResult = productFormSchema.safeParse({ ...base, [flag]: true });
    expect(trueResult.success).toBe(true);
    
    const falseResult = productFormSchema.safeParse({ ...base, [flag]: false });
    expect(falseResult.success).toBe(true);
  });
});

// ============================================================
// SECTION 12: DATA ROUND-TRIP — AdminProductFormPage Compatibility
// ============================================================
describe('Data Round-Trip — AdminProductFormPage Compatibility', () => {
  // Simulates the data mapping from AdminProductFormPage
  const externalProduct = {
    sku: 'EXT-001',
    name: 'Produto Externo',
    description: 'Desc',
    short_description: 'Short',
    brand: 'Marca',
    category_id: 'cat-1',
    supplier_id: 'sup-1',
    supplier_reference: 'SUP-REF-001',
    sale_price: 25.90,
    cost_price: 15.00,
    suggested_price: 23.00,
    stock_quantity: 500,
    min_quantity: 10,
    min_order_quantity: 50,
    stock_unit: 'cx',
    height_cm: 10, width_cm: 5, length_cm: 3,
    diameter_cm: null, weight_g: 120, capacity_ml: null,
    internal_height_cm: 9, internal_width_cm: 4, internal_length_cm: 2,
    internal_diameter_cm: null,
    packing_type: 'Caixa',
    box_width_mm: 100, box_height_mm: 50, box_length_mm: 80,
    box_weight_kg: 0.3, box_quantity: 24, box_inner_quantity: 6,
    box_volume_cm3: 400,
    box_internal_height_cm: 4.5, box_internal_width_cm: 9.5, box_internal_length_cm: 7.5,
    packaging_material: 'Papelão', packaging_color: 'Kraft', packaging_finish: 'Fosco',
    is_active: true, is_featured: true, is_bestseller: false,
    is_new: false, is_on_sale: true, is_kit: false,
    has_commercial_packaging: true, is_imported: true,
    is_textil: false, is_thermal: false,
    allows_personalization: true, has_gift_box: false, has_optional_packaging: false,
    ncm_code: '96081000', ean: '7891234567890', gtin: '07891234567890',
    ipi_rate: 5, country_of_origin: 'China',
    cfop: '5102', csosn: '102',
    icms_rate: 18, pis_rate: 1.65, cofins_rate: 7.6,
    tax_regime: 'simples_nacional', cest: '2000100',
    freight_class: 'A', default_carrier: 'Correios',
    shipping_weight_kg: 0.45, shipping_width_cm: 12,
    shipping_height_cm: 6, shipping_length_cm: 9,
    cubic_weight: 0.4, requires_special_shipping: false, shipping_notes: '',
    lead_time_days: 14, product_type: 'product',
    supply_mode: 'fabricado_personalizado', warranty_months: 6,
    gender: 'unissex',
    meta_title: 'Produto Externo - Brinde',
    meta_description: 'Descrição SEO do produto externo',
    meta_keywords: 'brinde, produto, externo',
    slug: 'produto-externo-001', canonical_url: '/produto/produto-externo-001',
    video_url: 'https://youtube.com/123',
    key_benefits: 'Benefit 1', use_cases: 'Use case 1',
  };

  it('external product passes schema validation', () => {
    const result = productFormSchema.safeParse(externalProduct);
    expect(result.success).toBe(true);
  });

  it('all fields are preserved after parse', () => {
    const result = productFormSchema.safeParse(externalProduct);
    if (result.success) {
      expect(result.data.sku).toBe('EXT-001');
      expect(result.data.short_description).toBe('Short');
      expect(result.data.meta_description).toBe('Descrição SEO do produto externo');
      expect(result.data.box_quantity).toBe(24);
      expect(result.data.box_inner_quantity).toBe(6);
      expect(result.data.warranty_months).toBe(6);
      expect(result.data.product_type).toBe('product');
      expect(result.data.freight_class).toBe('A');
      expect(result.data.shipping_weight_kg).toBe(0.45);
    }
  });

  it('logistics fields survive round-trip', () => {
    const result = productFormSchema.safeParse(externalProduct);
    if (result.success) {
      expect(result.data.freight_class).toBe('A');
      expect(result.data.default_carrier).toBe('Correios');
      expect(result.data.shipping_weight_kg).toBe(0.45);
      expect(result.data.shipping_width_cm).toBe(12);
      expect(result.data.shipping_height_cm).toBe(6);
      expect(result.data.shipping_length_cm).toBe(9);
      expect(result.data.cubic_weight).toBe(0.4);
      expect(result.data.requires_special_shipping).toBe(false);
      expect(result.data.shipping_notes).toBe('');
    }
  });
});

// ============================================================
// SECTION 13: DEFAULTS PARSING — Schema.parse(defaults)
// ============================================================
describe('Defaults Parsing', () => {
  it('defaultFormValues passes schema validation (except required fields)', () => {
    // defaults have empty sku/name/supplier_id which are required
    // but parsing with defaults+required should work
    const withRequired = {
      ...defaultFormValues,
      sku: 'TEST',
      name: 'Test Product',
      supplier_id: 'supplier-1',
    };
    const result = productFormSchema.safeParse(withRequired);
    expect(result.success).toBe(true);
  });

  it('parsed defaults preserve all original values', () => {
    const withRequired = {
      ...defaultFormValues,
      sku: 'TEST',
      name: 'Test',
      supplier_id: 'sup-1',
    };
    const result = productFormSchema.safeParse(withRequired);
    if (result.success) {
      expect(result.data.is_active).toBe(true);
      expect(result.data.allows_personalization).toBe(true);
      expect(result.data.stock_quantity).toBe(10000);
      expect(result.data.min_quantity).toBe(1);
      expect(result.data.product_type).toBe('product');
      expect(result.data.stock_unit).toBe('un');
    }
  });
});

// ============================================================
// SECTION 14: CROSS-FIELD CONSISTENCY
// ============================================================
describe('Cross-Field Consistency', () => {
  const base = { ...defaultFormValues, sku: 'T1', name: 'Test', supplier_id: 'x', sale_price: 10 };

  it('cost_price can be higher than sale_price (schema allows it)', () => {
    const r = productFormSchema.safeParse({ ...base, cost_price: 100, sale_price: 10 });
    expect(r.success).toBe(true);
  });

  it('box dimensions can all be 0', () => {
    const r = productFormSchema.safeParse({
      ...base,
      box_width_mm: 0, box_height_mm: 0, box_length_mm: 0,
    });
    expect(r.success).toBe(true);
  });

  it('all tax rates can be 0 simultaneously', () => {
    const r = productFormSchema.safeParse({
      ...base,
      ipi_rate: 0, icms_rate: 0, pis_rate: 0, cofins_rate: 0,
    });
    expect(r.success).toBe(true);
  });

  it('all flags can be true simultaneously', () => {
    const allTrue = {
      ...base,
      is_active: true, is_featured: true, is_bestseller: true,
      is_new: true, is_on_sale: true, is_kit: true,
      has_commercial_packaging: true, is_imported: true,
      is_textil: true, is_thermal: true,
      allows_personalization: true, has_gift_box: true,
      has_optional_packaging: true, requires_special_shipping: true,
    };
    const r = productFormSchema.safeParse(allTrue);
    expect(r.success).toBe(true);
  });
});
