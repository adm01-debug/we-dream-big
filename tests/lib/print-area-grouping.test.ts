import { describe, it, expect } from "vitest";
import {
  groupPrintAreasByComponent,
  getUniqueTechniques,
  filterGroupsByTechnique,
  filterGroupsByComponent,
  flattenTechniques,
  countTotalAreas,
  countTotalLocations,
  countTotalComponents,
  summarizeGroups,
  findLargestArea,
} from "@/lib/print-area-grouping";
import type { PrintAreaWithTechniques } from "@/types/gravacao";

// Helper com tipos corretos (TecnicaSimples: id, nome, codigo)
const makeArea = (overrides: Partial<PrintAreaWithTechniques> = {}): PrintAreaWithTechniques => ({
  area_id: "a1",
  area_code: "FRENTE",
  area_name: "Frente",
  component_name: "Corpo",
  location_name: "Frente",
  max_width: 10,
  max_height: 5,
  unit: "cm",
  shape: "rectangle",
  is_curved: false,
  is_primary: true,
  display_order: 1,
  techniques: [{ id: "t1", nome: "Serigrafia", codigo: "SER" }],
  ...overrides,
});

const mockAreas: PrintAreaWithTechniques[] = [
  makeArea(),
  makeArea({
    area_id: "a1",
    area_name: "Frente",
    techniques: [
      { id: "t1", nome: "Serigrafia", codigo: "SER" },
      { id: "t2", nome: "Bordado", codigo: "BOR" },
    ],
  }),
  makeArea({
    area_id: "a2",
    area_code: "COSTAS",
    area_name: "Costas",
    location_name: "Costas",
    max_width: 20,
    max_height: 15,
    is_primary: false,
    display_order: 2,
    techniques: [{ id: "t1", nome: "Serigrafia", codigo: "SER" }],
  }),
  makeArea({
    area_id: "a3",
    area_code: "MANGA",
    area_name: "Manga",
    component_name: "Manga",
    location_name: "Manga Esquerda",
    max_width: 5,
    max_height: 5,
    is_curved: true,
    is_primary: false,
    display_order: 3,
    techniques: [{ id: "t2", nome: "Bordado", codigo: "BOR" }],
  }),
  makeArea({
    area_id: "a4",
    area_code: "GERAL",
    area_name: "Geral",
    component_name: null,
    location_name: null,
    max_width: 8,
    max_height: 4,
    is_primary: false,
    display_order: 4,
    techniques: [{ id: "t3", nome: "Laser", codigo: "LAZ" }],
  }),
];

describe("groupPrintAreasByComponent", () => {
  it("groups areas by component and location", () => {
    const groups = groupPrintAreasByComponent(mockAreas);
    expect(groups).toHaveLength(3); // Produto, Corpo, Manga

    const corpo = groups.find((g) => g.componentName === "Corpo");
    expect(corpo).toBeDefined();
    expect(corpo!.locations).toHaveLength(2); // Frente, Costas
  });

  it("puts null component under 'Produto'", () => {
    const groups = groupPrintAreasByComponent(mockAreas);
    expect(groups[0].componentName).toBe("Produto");
  });

  it("sorts primary areas first within locations", () => {
    const groups = groupPrintAreasByComponent(mockAreas);
    const corpo = groups.find((g) => g.componentName === "Corpo")!;
    const firstLoc = corpo.locations[0];
    expect(firstLoc.techniques.some((t) => t.isPrimary)).toBe(true);
  });

  it("calculates areaCm2 correctly", () => {
    const groups = groupPrintAreasByComponent(mockAreas);
    const corpo = groups.find((g) => g.componentName === "Corpo")!;
    const frente = corpo.locations.find((l) => l.locationName === "Frente")!;
    expect(frente.techniques[0].areaCm2).toBe(50); // 10 * 5
  });

  it("handles empty array", () => {
    expect(groupPrintAreasByComponent([])).toEqual([]);
  });

  it("deduplicates identical techniques in same area+location", () => {
    const dupeAreas: PrintAreaWithTechniques[] = [
      makeArea({
        techniques: [
          { id: "t1", nome: "Serigrafia", codigo: "SER" },
          { id: "t1", nome: "Serigrafia", codigo: "SER" }, // duplicate
        ],
      }),
    ];
    const groups = groupPrintAreasByComponent(dupeAreas);
    const frente = groups[0].locations[0];
    expect(frente.techniques).toHaveLength(1);
  });

  it("handles null dimensions for areaCm2", () => {
    const areas = [makeArea({ max_width: null as any, max_height: null as any })];
    const result = groupPrintAreasByComponent(areas);
    expect(result[0].locations[0].techniques[0].areaCm2).toBeNull();
  });
});

describe("getUniqueTechniques", () => {
  it("returns unique technique codes sorted", () => {
    const groups = groupPrintAreasByComponent(mockAreas);
    const techs = getUniqueTechniques(groups);
    expect(techs).toEqual(["BOR", "LAZ", "SER"]);
  });
});

describe("filterGroupsByTechnique", () => {
  it("filters to only groups containing the technique", () => {
    const groups = groupPrintAreasByComponent(mockAreas);
    const filtered = filterGroupsByTechnique(groups, "BOR");
    expect(filtered).toHaveLength(2); // Corpo + Manga
  });

  it("returns empty for unknown technique", () => {
    const groups = groupPrintAreasByComponent(mockAreas);
    expect(filterGroupsByTechnique(groups, "UNKNOWN")).toEqual([]);
  });
});

describe("counters", () => {
  const groups = groupPrintAreasByComponent(mockAreas);

  it("counts total areas", () => {
    expect(countTotalAreas(groups)).toBeGreaterThan(0);
  });

  it("counts total locations", () => {
    expect(countTotalLocations(groups)).toBe(4); // Frente, Costas, Manga Esquerda, Padrão(Geral)
  });

  it("counts total components", () => {
    expect(countTotalComponents(groups)).toBe(3); // Produto, Corpo, Manga
  });
});

describe("summarizeGroups", () => {
  it("produces complete summary", () => {
    const groups = groupPrintAreasByComponent(mockAreas);
    const summary = summarizeGroups(groups);

    expect(summary.totalComponents).toBe(3);
    expect(summary.hasPrimaryArea).toBe(true);
    expect(summary.hasCurvedArea).toBe(true);
    expect(summary.maxAreaCm2).toBe(300); // 20*15
    expect(summary.primaryLocations).toContain("Frente");
    expect(summary.uniqueTechniques).toContain("SER");
  });

  it("handles empty groups", () => {
    const summary = summarizeGroups([]);
    expect(summary.totalComponents).toBe(0);
    expect(summary.maxAreaCm2).toBeNull();
  });
});

describe("findLargestArea", () => {
  it("finds the largest area", () => {
    const groups = groupPrintAreasByComponent(mockAreas);
    const largest = findLargestArea(groups);
    expect(largest).not.toBeNull();
    expect(largest!.areaCm2).toBe(300); // 20*15
    expect(largest!.locationName).toBe("Costas");
  });

  it("returns null for empty groups", () => {
    expect(findLargestArea([])).toBeNull();
  });
});

describe("filterGroupsByComponent", () => {
  it("filters to specific component", () => {
    const groups = groupPrintAreasByComponent(mockAreas);
    const corpo = filterGroupsByComponent(groups, "Corpo");
    expect(corpo).toHaveLength(1);
    expect(corpo[0].componentName).toBe("Corpo");
  });

  it("returns empty for unknown component", () => {
    const groups = groupPrintAreasByComponent(mockAreas);
    expect(filterGroupsByComponent(groups, "Inexistente")).toHaveLength(0);
  });
});

describe("flattenTechniques", () => {
  it("flattens hierarchy into a plain list", () => {
    const groups = groupPrintAreasByComponent(mockAreas);
    const flat = flattenTechniques(groups);
    expect(flat.length).toBeGreaterThan(0);
    expect(flat[0]).toHaveProperty("componentName");
    expect(flat[0]).toHaveProperty("locationName");
    expect(flat[0]).toHaveProperty("techniqueCode");
  });

  it("preserves primary and curved flags", () => {
    const groups = groupPrintAreasByComponent(mockAreas);
    const flat = flattenTechniques(groups);
    expect(flat.some((t) => t.isPrimary)).toBe(true);
    expect(flat.some((t) => t.isCurved)).toBe(true);
  });

  it("returns empty for empty groups", () => {
    expect(flattenTechniques([])).toEqual([]);
  });
});
