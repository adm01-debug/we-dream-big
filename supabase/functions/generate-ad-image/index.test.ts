import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { z } from "../_shared/contracts/index.ts";
// Mirror the schema from the function
const BodySchema = z.object({
  productImageUrl: z.string().url(),
  logoBase64: z.string().optional(),
  logoUrl: z.string().url().optional(),
  productName: z.string().optional(),
  productColor: z.string().optional(),
  techniqueName: z.string().optional(),
  locationName: z.string().optional(),
  scenePrompt: z.string().min(1, "Scene prompt is required"),
  sceneCategory: z.string().optional(),
  brandColorHex: z.string().optional(),
  brandColorName: z.string().optional(),
}).refine(data => data.logoBase64 || data.logoUrl, {
  message: "Either logoBase64 or logoUrl must be provided",
});

Deno.test("rejects empty body", () => {
  const result = BodySchema.safeParse({});
  assertEquals(result.success, false);
});

Deno.test("rejects invalid productImageUrl", () => {
  const result = BodySchema.safeParse({
    productImageUrl: "not-a-url",
    scenePrompt: "Office",
    logoBase64: "abc",
  });
  assertEquals(result.success, false);
  if (!result.success) {
    const fields = result.error.flatten().fieldErrors;
    assertEquals("productImageUrl" in fields, true);
  }
});

Deno.test("rejects empty scenePrompt", () => {
  const result = BodySchema.safeParse({
    productImageUrl: "https://example.com/img.png",
    scenePrompt: "",
    logoBase64: "abc",
  });
  assertEquals(result.success, false);
  if (!result.success) {
    const fields = result.error.flatten().fieldErrors;
    assertEquals("scenePrompt" in fields, true);
  }
});

Deno.test("rejects when neither logoBase64 nor logoUrl provided", () => {
  const result = BodySchema.safeParse({
    productImageUrl: "https://example.com/img.png",
    scenePrompt: "Office scene",
  });
  assertEquals(result.success, false);
});

Deno.test("rejects invalid logoUrl", () => {
  const result = BodySchema.safeParse({
    productImageUrl: "https://example.com/img.png",
    scenePrompt: "Office scene",
    logoUrl: "not-a-url",
  });
  assertEquals(result.success, false);
});

Deno.test("accepts valid body with logoBase64", () => {
  const result = BodySchema.safeParse({
    productImageUrl: "https://example.com/img.png",
    scenePrompt: "Modern office desk",
    logoBase64: "data:image/png;base64,abc123",
    productName: "Caneca Premium",
    productColor: "Azul",
    techniqueName: "Serigrafia",
    locationName: "Frente",
  });
  assertEquals(result.success, true);
});

Deno.test("accepts valid body with logoUrl", () => {
  const result = BodySchema.safeParse({
    productImageUrl: "https://example.com/img.png",
    scenePrompt: "Coffee shop",
    logoUrl: "https://example.com/logo.png",
    brandColorHex: "#FF5500",
    brandColorName: "Laranja",
  });
  assertEquals(result.success, true);
});

Deno.test("accepts minimal valid body", () => {
  const result = BodySchema.safeParse({
    productImageUrl: "https://example.com/img.png",
    scenePrompt: "A",
    logoBase64: "x",
  });
  assertEquals(result.success, true);
});
