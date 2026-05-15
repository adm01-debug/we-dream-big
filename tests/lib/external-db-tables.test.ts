import { describe, it, expect } from 'vitest';
import { PRODUCT_TABLES, PRODUCT_VIEWS, COMPANY_TABLES, BRIDGE_ALIASES } from '@/lib/external-db/tables';

describe('External DB Tables constants', () => {
  it('contains core product tables', () => {
    expect(PRODUCT_TABLES).toContain('products');
    expect(PRODUCT_TABLES).toContain('categories');
    expect(PRODUCT_TABLES).toContain('suppliers');
    expect(PRODUCT_TABLES).toContain('product_images');
    expect(PRODUCT_TABLES).toContain('product_variants');
  });

  it('contains corrected table names (not phantoms)', () => {
    expect(PRODUCT_TABLES).toContain('product_category_assignments');
    expect(PRODUCT_TABLES).toContain('product_properties');
    expect(PRODUCT_TABLES).toContain('supplier_property_mappings');
    expect(PRODUCT_TABLES).toContain('tabela_preco_gravacao_oficial');
    expect(PRODUCT_TABLES).toContain('tabela_preco_gravacao_oficial_faixa');
  });

  it('does NOT contain phantom tables that were fully removed', () => {
    // These were confirmed non-existent in the external DB
    expect(PRODUCT_TABLES).not.toContain('kit_component_media');
    expect(PRODUCT_TABLES).not.toContain('personalization_techniques');
    expect(PRODUCT_TABLES).not.toContain('customization_price_tables');
    expect(PRODUCT_TABLES).not.toContain('customization_price_tiers');
    expect(PRODUCT_TABLES).not.toContain('tecnica_gravacao');
    expect(PRODUCT_TABLES).not.toContain('business_sectors');
  });

  it('contains engraving tables (SSOT)', () => {
    expect(PRODUCT_TABLES).toContain('tecnicas_gravacao');
    expect(PRODUCT_TABLES).toContain('print_area_techniques');
    expect(PRODUCT_TABLES).toContain('tabela_preco_gravacao_oficial');
  });

  it('contains color tables', () => {
    expect(PRODUCT_TABLES).toContain('color_groups');
    expect(PRODUCT_TABLES).toContain('color_variations');
    expect(PRODUCT_TABLES).toContain('supplier_colors');
  });

  it('contains material tables', () => {
    expect(PRODUCT_TABLES).toContain('material_groups');
    expect(PRODUCT_TABLES).toContain('material_types');
  });

  it('has only validated views', () => {
    expect(PRODUCT_VIEWS).toContain('v_products_with_tags');
    expect(PRODUCT_VIEWS).toContain('v_products_min_price');
    expect(PRODUCT_VIEWS).toContain('mv_product_compositions');
    expect(PRODUCT_VIEWS).toContain('mv_material_group_stats');
    expect(PRODUCT_VIEWS).toContain('categories_tree_visual');
    // These views exist in the bridge whitelist
    expect(PRODUCT_VIEWS).toContain('v_products_with_techniques');
    expect(PRODUCT_VIEWS).toContain('v_products_with_stock');
  });

  it('has CRM company tables', () => {
    expect(COMPANY_TABLES).toContain('client_contacts');
    expect(COMPANY_TABLES).toContain('organizations');
  });

  it('has bridge aliases for legacy compatibility', () => {
    expect(BRIDGE_ALIASES).toContain('tecnica_gravacao');
    expect(BRIDGE_ALIASES).toContain('personalization_techniques');
    expect(BRIDGE_ALIASES).toContain('customization_price_tables');
    expect(BRIDGE_ALIASES).toContain('customization_price_tiers');
  });

  it('has no duplicates across real tables', () => {
    const allTables = [...PRODUCT_TABLES, ...PRODUCT_VIEWS, ...COMPANY_TABLES];
    const uniqueTables = new Set(allTables);
    expect(uniqueTables.size).toBe(allTables.length);
  });

  it('aliases do not overlap with real tables', () => {
    for (const alias of BRIDGE_ALIASES) {
      expect(PRODUCT_TABLES).not.toContain(alias);
    }
  });
});
