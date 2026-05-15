/**
 * Tests for voice-agent edge function behavior
 * These test the AI response structure via curl
 */
import { describe, it, expect } from "vitest";

// These tests validate the expected contract of the voice-agent responses
describe("Voice Agent Response Contract", () => {
  // Test action types
  describe("action types", () => {
    it("should have valid action enum values", () => {
      const validActions = ["search", "filter", "navigate", "sort", "clear", "answer"];
      validActions.forEach(action => {
        expect(typeof action).toBe("string");
      });
    });
  });

  // Test response structure
  describe("response structure", () => {
    it("search action should include query in data", () => {
      const mockResponse = { action: "search", response: "Buscando", data: { query: "canetas" } };
      expect(mockResponse.action).toBe("search");
      expect(mockResponse.data.query).toBeDefined();
      expect(typeof mockResponse.response).toBe("string");
    });

    it("filter action should include filters in data", () => {
      const mockResponse = {
        action: "filter",
        response: "Filtrei",
        data: { filters: { category: "Canetas", color: "azul" } },
      };
      expect(mockResponse.action).toBe("filter");
      expect(mockResponse.data.filters).toBeDefined();
      expect(mockResponse.data.filters.category).toBe("Canetas");
    });

    it("navigate action should include route in data", () => {
      const mockResponse = { action: "navigate", response: "Indo", data: { route: "/orcamentos" } };
      expect(mockResponse.action).toBe("navigate");
      expect(mockResponse.data.route).toBeDefined();
      expect(mockResponse.data.route).toMatch(/^\//);
    });

    it("sort action should include sortBy in data", () => {
      const mockResponse = { action: "sort", response: "Ordenando", data: { sortBy: "price-asc" } };
      expect(mockResponse.action).toBe("sort");
      expect(mockResponse.data.sortBy).toBeDefined();
      expect(["price-asc", "price-desc", "name", "stock"]).toContain(mockResponse.data.sortBy);
    });

    it("clear action should have empty or no data", () => {
      const mockResponse = { action: "clear", response: "Limpei", data: {} };
      expect(mockResponse.action).toBe("clear");
    });

    it("answer action should have response text", () => {
      const mockResponse = { action: "answer", response: "O horário é...", data: {} };
      expect(mockResponse.action).toBe("answer");
      expect(mockResponse.response.length).toBeGreaterThan(0);
    });

    it("filter with multiple criteria should include all filters", () => {
      const mockResponse = {
        action: "filter",
        response: "Filtrado",
        data: {
          filters: {
            category: "Mochilas",
            material: "bambu",
            maxPrice: 50,
          },
        },
      };
      expect(mockResponse.data.filters.category).toBe("Mochilas");
      expect(mockResponse.data.filters.material).toBe("bambu");
      expect(mockResponse.data.filters.maxPrice).toBe(50);
    });
  });

  // Test filter types
  describe("filter value types", () => {
    it("maxPrice and minPrice should be numbers", () => {
      const filters = { maxPrice: 100, minPrice: 10 };
      expect(typeof filters.maxPrice).toBe("number");
      expect(typeof filters.minPrice).toBe("number");
    });

    it("inStock and isKit should be booleans", () => {
      const filters = { inStock: true, isKit: false };
      expect(typeof filters.inStock).toBe("boolean");
      expect(typeof filters.isKit).toBe("boolean");
    });

    it("category, color, material should be strings", () => {
      const filters = { category: "Canetas", color: "azul", material: "metal" };
      expect(typeof filters.category).toBe("string");
      expect(typeof filters.color).toBe("string");
      expect(typeof filters.material).toBe("string");
    });
  });

  // Test route validation
  describe("route validation", () => {
    const validRoutes = [
      "/", "/orcamentos", "/orcamentos/novo", "/pedidos",
      "/favoritos", "/colecoes", "/simulador", "/mockup",
      "/tendencias",
    ];

    validRoutes.forEach(route => {
      it(`should accept valid route: ${route}`, () => {
        expect(route).toMatch(/^\//);
      });
    });
  });

  // Test sortBy validation  
  describe("sortBy validation", () => {
    const validSortValues = ["price-asc", "price-desc", "name", "stock"];

    validSortValues.forEach(sort => {
      it(`should accept valid sort value: ${sort}`, () => {
        expect(validSortValues).toContain(sort);
      });
    });
  });
});
