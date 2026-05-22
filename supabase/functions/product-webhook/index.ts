import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { buildPublicCorsHeaders } from "../_shared/cors.ts";
import { parseBodyVersioned } from "../_shared/zod-validate.ts";
import {
  VERSION_SERVED_HEADER,
} from "../_shared/version-dispatch.ts";
import {
  adaptV1ToCanonical,
  adaptV2ToCanonical,
  type CanonicalProductWebhookPayload,
  type ProductPayload,
  WebhookPayloadSchemaV1,
  WebhookPayloadSchemaV2,
} from "./schemas.ts";

const corsHeaders = buildPublicCorsHeaders({
  extraAllowHeaders: ["x-webhook-secret"],
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Secret is read at request time (not module load) so tests can adjust it
// per-case via Deno.env.set/delete.

/**
 * Exported handler so it can be invoked from unit tests without spinning up
 * the Deno HTTP server. See ./index.test.ts.
 */
export const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Validate webhook secret (precedes body parsing; auth comes first)
    const webhookSecret = Deno.env.get("N8N_PRODUCT_WEBHOOK_SECRET");
    const providedSecret = req.headers.get("x-webhook-secret");
    if (webhookSecret && providedSecret !== webhookSecret) {
      console.error("Invalid webhook secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Versioned body parsing — v1 keeps legacy 400/details, v2 returns 422/problem+json.
    const parsed = await parseBodyVersioned(
      req,
      { v1: WebhookPayloadSchemaV1, v2: WebhookPayloadSchemaV2 },
      corsHeaders,
    );
    if ("error" in parsed) return parsed.error;

    const { version } = parsed;
    const canonical: CanonicalProductWebhookPayload = version === "v2"
      ? adaptV2ToCanonical(parsed.data as never)
      : adaptV1ToCanonical(parsed.data as never);

    console.log(
      `Product webhook action: ${canonical.action} (contract=${version})`,
    );

    // Create sync log
    const { data: syncLog, error: logError } = await supabase
      .from("product_sync_logs")
      .insert({
        status: "processing",
        source: typeof canonical.metadata?.source === "string"
          ? canonical.metadata.source
          : "n8n",
        products_received:
          canonical.products?.length || (canonical.product ? 1 : 0),
      })
      .select()
      .single();

    if (logError) {
      console.error("Error creating sync log:", logError);
    }

    const syncLogId = syncLog?.id;

    let result: {
      created: number;
      updated: number;
      failed: number;
      errors: string[];
      errors_by_sku: Record<string, { code: string; message: string }>;
    } = { created: 0, updated: 0, failed: 0, errors: [], errors_by_sku: {} };

    switch (canonical.action) {
      case "upsert": {
        if (!canonical.product) {
          throw new Error("Product data is required for upsert action");
        }
        result = await upsertProducts(supabase, [canonical.product]);
        break;
      }

      case "batch_upsert":
      case "sync": {
        if (!canonical.products || canonical.products.length === 0) {
          throw new Error(
            "Products array is required for batch_upsert/sync action",
          );
        }
        result = await upsertProducts(supabase, canonical.products);
        break;
      }

      case "delete": {
        if (!canonical.external_ids || canonical.external_ids.length === 0) {
          throw new Error(
            "external_ids array is required for delete action",
          );
        }

        const { error: deleteError, count } = await supabase
          .from("products")
          .delete()
          .in("external_id", canonical.external_ids);

        if (deleteError) {
          throw deleteError;
        }

        result = {
          created: 0,
          updated: 0,
          failed: 0,
          errors: [],
          errors_by_sku: {},
        };
        console.log(`Deleted ${count} products`);
        break;
      }

      default:
        throw new Error(`Unknown action: ${canonical.action}`);
    }

    // Update sync log
    if (syncLogId) {
      await supabase
        .from("product_sync_logs")
        .update({
          status: result.failed > 0 ? "partial" : "completed",
          products_created: result.created,
          products_updated: result.updated,
          products_failed: result.failed,
          error_message: result.errors.length > 0
            ? result.errors.join("; ")
            : null,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncLogId);
    }

    // V1 response shape (back-compat). V2 adds errors_by_sku and idempotency echo.
    const baseResponse = {
      success: true,
      created: result.created,
      updated: result.updated,
      failed: result.failed,
      errors: result.errors,
      sync_log_id: syncLogId,
    };
    const responseBody = version === "v2"
      ? {
        ...baseResponse,
        errors_by_sku: result.errors_by_sku,
        idempotency_key: canonical.idempotency_key,
      }
      : baseResponse;

    return new Response(JSON.stringify(responseBody), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        [VERSION_SERVED_HEADER]: version,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Product webhook error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
};

// In production, Supabase runs this file as the entry point (import.meta.main
// is true), so the server starts. In `deno test`, the test file is the entry
// and this module is imported — import.meta.main is false and no port is bound.
if (import.meta.main) Deno.serve(handler);

async function upsertProducts(
  supabase: any,
  products: ProductPayload[],
): Promise<{
  created: number;
  updated: number;
  failed: number;
  errors: string[];
  errors_by_sku: Record<string, { code: string; message: string }>;
}> {
  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];
  const errors_by_sku: Record<string, { code: string; message: string }> = {};

  for (const product of products) {
    try {
      // Determine stock status
      const stockStatus = calculateStockStatus(product.stock || 0);

      // Prepare product data
      const productData = {
        external_id: product.external_id || null,
        sku: product.sku,
        name: product.name,
        description: product.description || null,
        price: product.price || 0,
        min_quantity: product.min_quantity || 1,
        category_id: product.category_id || null,
        category_name: product.category_name || null,
        subcategory: product.subcategory || null,
        supplier_id: product.supplier_id || null,
        supplier_name: product.supplier_name || null,
        stock: product.stock || 0,
        stock_status: product.stock_status || stockStatus,
        is_kit: product.is_kit || false,
        is_active: product.is_active !== false,
        featured: product.featured || false,
        new_arrival: product.new_arrival || false,
        on_sale: product.on_sale || false,
        images: product.images || [],
        video_url: product.video_url || null,
        colors: product.colors || [],
        materials: product.materials || [],
        tags: product.tags || {},
        kit_items: product.kit_items || [],
        variations: product.variations || [],
        metadata: product.metadata || {},
        synced_at: new Date().toISOString(),
      };

      // Check if product exists by external_id or sku
      let existingProduct = null;

      if (product.external_id) {
        const { data } = await supabase
          .from("products")
          .select("id")
          .eq("external_id", product.external_id)
          .maybeSingle();
        existingProduct = data;
      }

      if (!existingProduct) {
        const { data } = await supabase
          .from("products")
          .select("id")
          .eq("sku", product.sku)
          .maybeSingle();
        existingProduct = data;
      }

      if (existingProduct) {
        // Update existing product
        const { error: updateError } = await supabase
          .from("products")
          .update(productData)
          .eq("id", existingProduct.id);

        if (updateError) throw updateError;
        updated++;
        console.log(`Updated product: ${product.sku}`);
      } else {
        // Insert new product
        const { error: insertError } = await supabase
          .from("products")
          .insert(productData);

        if (insertError) throw insertError;
        created++;
        console.log(`Created product: ${product.sku}`);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`${product.sku}: ${errMsg}`);
      errors_by_sku[product.sku] = { code: "upsert_failed", message: errMsg };
      failed++;
      console.error(`Failed to upsert product ${product.sku}:`, err);
    }
  }

  return { created, updated, failed, errors, errors_by_sku };
}

function calculateStockStatus(stock: number): string {
  if (stock <= 0) return "out-of-stock";
  if (stock < 100) return "low-stock";
  return "in-stock";
}
