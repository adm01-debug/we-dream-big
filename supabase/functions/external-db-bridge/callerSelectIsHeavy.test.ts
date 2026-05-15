// Tests for the refined heavy-select detection.
//
// Cobre dois aspectos da heurística:
//   1. extractBaseColumn — tokenização correta de selects PostgREST
//      (alias, operadores JSON, embeds), evitando falsos positivos por substring.
//   2. callerSelectIsHeavy — só deve disparar para colunas REAIS pesadas,
//      e DEVE disparar mesmo com aliases ou JSON ops na frente.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  extractBaseColumn,
  callerSelectIsHeavy,
  resolveProductsSelect,
  HEAVY_PRODUCT_COLUMNS,
} from "./index.ts";

// ────────────────────────────────────────────────────────────────────────────
// extractBaseColumn — tokenização
// ────────────────────────────────────────────────────────────────────────────

Deno.test("extractBaseColumn: nome simples", () => {
  assertEquals(extractBaseColumn("name"), "name");
  assertEquals(extractBaseColumn("  spaced  "), "spaced");
});

Deno.test("extractBaseColumn: alias PostgREST 'alias:column'", () => {
  assertEquals(extractBaseColumn("title:name"), "name");
  assertEquals(extractBaseColumn("price:sale_price"), "sale_price");
});

Deno.test("extractBaseColumn: operadores JSON '->' e '->>'", () => {
  assertEquals(extractBaseColumn("metadata->>summary"), "metadata");
  assertEquals(extractBaseColumn("metadata->path->>x"), "metadata");
  assertEquals(extractBaseColumn("dimensions->width"), "dimensions");
});

Deno.test("extractBaseColumn: alias + JSON op combinados", () => {
  assertEquals(extractBaseColumn("summary:metadata->>summary"), "metadata");
  assertEquals(extractBaseColumn("w:dimensions->>width"), "dimensions");
});

Deno.test("extractBaseColumn: embed PostgREST retorna '' (não é coluna direta)", () => {
  assertEquals(extractBaseColumn("category:categories(id,name)"), "");
  assertEquals(extractBaseColumn("supplier(name,trust_score)"), "");
});

Deno.test("extractBaseColumn: token vazio retorna ''", () => {
  assertEquals(extractBaseColumn(""), "");
  assertEquals(extractBaseColumn("   "), "");
});

// ────────────────────────────────────────────────────────────────────────────
// callerSelectIsHeavy — positivos (devem disparar)
// ────────────────────────────────────────────────────────────────────────────

Deno.test("callerSelectIsHeavy: detecta 'images' (campo pesado novo)", () => {
  assertEquals(callerSelectIsHeavy("id,name,images"), true);
});

Deno.test("callerSelectIsHeavy: detecta 'videos' (campo pesado novo)", () => {
  assertEquals(callerSelectIsHeavy("id,name,videos,sale_price"), true);
});

Deno.test("callerSelectIsHeavy: detecta 'dimensions' / 'schema_json' / 'seo_issues'", () => {
  assertEquals(callerSelectIsHeavy("id,dimensions"), true);
  assertEquals(callerSelectIsHeavy("id,schema_json"), true);
  assertEquals(callerSelectIsHeavy("id,seo_issues"), true);
});

Deno.test("callerSelectIsHeavy: detecta heavy mesmo com alias", () => {
  // alias: o detector deve olhar para a coluna real, não para o alias.
  assertEquals(callerSelectIsHeavy("id,name,gallery:images"), true);
  assertEquals(callerSelectIsHeavy("id,name,meta:metadata"), true);
});

Deno.test("callerSelectIsHeavy: detecta heavy mesmo com JSON ops (extração de subkey)", () => {
  // Mesmo que o caller queira só 1 subkey, a coluna pesada é carregada.
  assertEquals(callerSelectIsHeavy("id,name,metadata->>summary"), true);
  assertEquals(callerSelectIsHeavy("id,dimensions->>width"), true);
});

Deno.test("callerSelectIsHeavy: heavy clássicos (regressão da regex anterior)", () => {
  assertEquals(callerSelectIsHeavy("id,name,personalization_areas"), true);
  assertEquals(callerSelectIsHeavy("id,name,description_html"), true);
  assertEquals(callerSelectIsHeavy("id,name,specifications"), true);
});

// ────────────────────────────────────────────────────────────────────────────
// callerSelectIsHeavy — negativos (NÃO devem disparar — falsos positivos da regex antiga)
// ────────────────────────────────────────────────────────────────────────────

Deno.test("callerSelectIsHeavy: 'meta_title' / 'meta_description' isoladas NÃO são heavy", () => {
  // 'meta_description' está marcado como heavy (texto longo), mas
  // colunas similares como 'meta_title' (curtas) não devem casar por substring.
  assertEquals(callerSelectIsHeavy("id,name,meta_title"), false);
});

Deno.test("callerSelectIsHeavy: coluna que CONTÉM nome heavy como substring NÃO dispara", () => {
  // Falso positivo da regex bruta: 'metadata_id' continha 'metadata'.
  assertEquals(callerSelectIsHeavy("id,name,metadata_id"), false);
  assertEquals(callerSelectIsHeavy("id,name,personalization_areas_count"), false);
  assertEquals(callerSelectIsHeavy("id,name,images_count"), false);
});

Deno.test("callerSelectIsHeavy: alias que MENCIONA nome heavy mas aponta p/ coluna leve NÃO dispara", () => {
  // Caso comum: queries de listagem usam aliases descritivos.
  assertEquals(callerSelectIsHeavy("metadata_summary:short_description"), false);
  assertEquals(callerSelectIsHeavy("images_url:primary_image_url"), false);
});

Deno.test("callerSelectIsHeavy: embeds PostgREST não disparam (não são colunas da base)", () => {
  // Embed para `product_images` é pesado, mas é tratado por outra camada
  // (joins explícitos), não pelo lightweight de products.
  assertEquals(callerSelectIsHeavy("id,name,sale_price,images:product_images(url,position)"), false);
});

Deno.test("callerSelectIsHeavy: select focado leve não dispara", () => {
  assertEquals(callerSelectIsHeavy("id,name,sale_price,primary_image_url"), false);
  assertEquals(callerSelectIsHeavy("id,name,sku,brand"), false);
});

Deno.test("callerSelectIsHeavy: select vazio retorna false (responsabilidade da regra '*')", () => {
  assertEquals(callerSelectIsHeavy(""), false);
});

// ────────────────────────────────────────────────────────────────────────────
// Integração: resolveProductsSelect com a nova heurística
// ────────────────────────────────────────────────────────────────────────────

Deno.test("resolveProductsSelect: heavy expandido — 'images' em listing grande força lightweight", () => {
  const r = resolveProductsSelect({ table: "products", select: "id,name,images", limit: 200, hasId: false });
  assertEquals(r.forcedLightweight, true);
  assertEquals(r.reason, "heavy-jsonb-listing");
});

Deno.test("resolveProductsSelect: heavy expandido — 'videos' em listing grande força lightweight", () => {
  const r = resolveProductsSelect({ table: "products", select: "id,name,videos,sale_price", limit: 200, hasId: false });
  assertEquals(r.forcedLightweight, true);
  assertEquals(r.reason, "heavy-jsonb-listing");
});

Deno.test("resolveProductsSelect: caso legítimo — embed product_images NÃO força (limit alto)", () => {
  // Embeds têm seu próprio custo, mas o lightweight de products não deve interferir.
  const r = resolveProductsSelect({
    table: "products",
    select: "id,name,sale_price,gallery:product_images(url,position)",
    limit: 200,
    hasId: false,
  });
  assertEquals(r.forcedLightweight, false);
  assertEquals(r.reason, "caller-select");
});

Deno.test("resolveProductsSelect: caso legítimo — coluna similar 'metadata_id' NÃO força", () => {
  // Falso positivo da regex antiga (regex /metadata/ casava 'metadata_id')
  const r = resolveProductsSelect({
    table: "products",
    select: "id,name,sale_price,metadata_id",
    limit: 200,
    hasId: false,
  });
  assertEquals(r.forcedLightweight, false);
  assertEquals(r.reason, "caller-select");
});

Deno.test("HEAVY_PRODUCT_COLUMNS: contém pelo menos as colunas confirmadas empiricamente", () => {
  // Sentinel test — protege contra remoções acidentais da lista.
  for (const col of ["images", "videos", "metadata", "specifications", "personalization_areas", "dimensions", "schema_json"]) {
    assertEquals(HEAVY_PRODUCT_COLUMNS.has(col), true, `Set deve conter '${col}'`);
  }
});
