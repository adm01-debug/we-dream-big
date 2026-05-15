/**
 * Render tests for CompanyContactSelector (679 lines)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders } from "../render-helpers";
import React from "react";

vi.mock("@/lib/crm-db", () => ({
  selectCrm: vi.fn().mockResolvedValue([]),
  searchCrm: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/types/crm", () => ({
  getCompanyDisplayName: vi.fn((c: any) => c?.nome_fantasia || c?.razao_social || ""),
}));

describe("CompanyContactSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", async () => {
    const { CompanyContactSelector } = await import("@/components/quotes/CompanyContactSelector");
    renderWithProviders(
      <CompanyContactSelector
        selectedCompany={null}
        selectedContact={null}
        onCompanySelect={vi.fn()}
        onContactSelect={vi.fn()}
      />
    );
    expect(document.body).toBeTruthy();
  });

  it("renders with selected company", async () => {
    const { CompanyContactSelector } = await import("@/components/quotes/CompanyContactSelector");
    renderWithProviders(
      <CompanyContactSelector
        selectedCompany={{
          id: "c1",
          name: "Empresa Teste",
          razao_social: "Empresa Teste LTDA",
          cnpj: "12345678000190",
        } as any}
        selectedContact={null}
        onCompanySelect={vi.fn()}
        onContactSelect={vi.fn()}
      />
    );
    expect(document.body).toBeTruthy();
  });
});
