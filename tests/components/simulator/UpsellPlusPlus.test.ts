import { describe, it, expect } from "vitest";
import { generateSuggestions } from "@/components/pricing/simulator/upsell/upsell-engine";
import type { ProductTechnique, ConfiguredEngraving } from "@/components/pricing/simulator/types";

const makeTech = (overrides: Partial<ProductTechnique> = {}): ProductTechnique => ({
  id: "t1",
  techniqueCode: "SER",
  techniqueName: "Serigrafia",
  componentName: "Corpo",
  locationName: "Frente",
  locationCode: "FRENTE",
  composedCode: "CORPO-FRENTE-SER",
  maxWidth: 10,
  maxHeight: 5,
  maxArea: 50,
  maxColors: 4,
  isCurved: false,
  isPrimary: true,
  ...overrides,
});

const makeEngraving = (overrides: Partial<ConfiguredEngraving> = {}): ConfiguredEngraving => ({
  id: "e1",
  technique: makeTech(),
  colors: 2,
  sizeOption: null,
  tableCode: null,
  ...overrides,
});

describe("UpsellPlusPlus generateSuggestions", () => {
  it("suggests adding position when unused locations exist", () => {
    const engravings = [makeEngraving()];
    const techniques = [
      makeTech(),
      makeTech({ id: "t2", locationCode: "COSTAS", locationName: "Costas", techniqueCode: "SER" }),
    ];
    const result = generateSuggestions(engravings, techniques, 100);
    expect(result.some((s) => s.type === "add_position")).toBe(true);
  });

  it("does NOT suggest position when no engravings exist", () => {
    const techniques = [makeTech()];
    const result = generateSuggestions([], techniques, 100);
    expect(result.some((s) => s.type === "add_position")).toBe(false);
  });

  it("suggests technique upgrade when premium option available", () => {
    const engravings = [makeEngraving({ technique: makeTech({ techniqueCode: "SER" }) })];
    const techniques = [
      makeTech({ techniqueCode: "SER" }),
      makeTech({ id: "t3", techniqueCode: "BOR", techniqueName: "Bordado" }),
    ];
    const result = generateSuggestions(engravings, techniques, 100);
    expect(result.some((s) => s.type === "technique_upgrade")).toBe(true);
  });

  it("suggests next quantity tier when close enough", () => {
    const result = generateSuggestions([], [], 90);
    expect(result.some((s) => s.type === "quantity_tier")).toBe(true);
  });

  it("marks quantity tier as high priority when very close", () => {
    const result = generateSuggestions([], [], 95);
    const tierSuggestion = result.find((s) => s.type === "quantity_tier");
    expect(tierSuggestion?.priority).toBe("high");
  });

  it("does NOT suggest quantity tier when too far", () => {
    const result = generateSuggestions([], [], 10);
    expect(result.some((s) => s.type === "quantity_tier")).toBe(false);
  });

  it("does NOT suggest quantity tier for zero quantity", () => {
    const result = generateSuggestions([], [], 0);
    expect(result.some((s) => s.type === "quantity_tier")).toBe(false);
  });

  it("suggests complementary products by category", () => {
    const result = generateSuggestions([], [], 100, "Canetas");
    expect(result.some((s) => s.type === "complementary")).toBe(true);
    expect(result.find((s) => s.type === "complementary")?.title).toContain("Cadernos");
  });

  it("does NOT suggest complementary for unknown category", () => {
    const result = generateSuggestions([], [], 100, "CategoriaInexistente");
    expect(result.some((s) => s.type === "complementary")).toBe(false);
  });

  it("returns empty for no opportunities at max tier", () => {
    const result = generateSuggestions([], [], 5000, "UnknownCategory");
    expect(result).toHaveLength(0);
  });

  it("sorts by priority: high > medium > low", () => {
    const engravings = [makeEngraving()];
    const techniques = [
      makeTech(),
      makeTech({ id: "t2", locationCode: "COSTAS", locationName: "Costas" }),
      makeTech({ id: "t3", techniqueCode: "BOR", techniqueName: "Bordado" }),
    ];
    const result = generateSuggestions(engravings, techniques, 90, "Canetas");

    const priorities = result.map((s) => s.priority);
    const order = { high: 0, medium: 1, low: 2 };
    for (let i = 1; i < priorities.length; i++) {
      expect(order[priorities[i]]).toBeGreaterThanOrEqual(order[priorities[i - 1]]);
    }
  });
});
