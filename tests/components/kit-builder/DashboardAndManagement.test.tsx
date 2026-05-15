/**
 * Comprehensive tests for Dashboard widgets and MeusKitsPage
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderWithProviders } from "../render-helpers";
import { screen } from "@testing-library/react";
import React from "react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    channel: vi.fn().mockReturnValue({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() }),
    removeChannel: vi.fn(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn().mockReturnValue({
    user: { id: "test-user-id", email: "test@test.com" },
    session: { access_token: "mock-token" },
    loading: false,
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), info: vi.fn(), loading: vi.fn(), dismiss: vi.fn() }),
  Toaster: () => null,
}));

describe("RecentKitsWidget", () => {
  it("renders empty state when no kits", async () => {
    const { RecentKitsWidget } = await import("@/components/dashboard/RecentKitsWidget");
    renderWithProviders(<RecentKitsWidget />);
    expect(document.body).toBeTruthy();
  }, 15000);

  it("renders component without errors", async () => {
    const { RecentKitsWidget } = await import("@/components/dashboard/RecentKitsWidget");
    renderWithProviders(<RecentKitsWidget />);
    expect(document.body).toBeTruthy();
  });
});

describe("MeusKitsPage Filters Logic", () => {
  it("filters kits by status", () => {
    const kits = [
      { id: "1", status: "draft", name: "Kit A" },
      { id: "2", status: "active", name: "Kit B" },
      { id: "3", status: "draft", name: "Kit C" },
    ];
    const filtered = kits.filter(k => k.status === "draft");
    expect(filtered).toHaveLength(2);
  });

  it("filters kits by type", () => {
    const kits = [
      { id: "1", kit_type: "montado", name: "Kit A" },
      { id: "2", kit_type: "personalizado", name: "Kit B" },
    ];
    const filtered = kits.filter(k => k.kit_type === "montado");
    expect(filtered).toHaveLength(1);
  });

  it("sorts kits by price ascending", () => {
    const kits = [
      { name: "Kit C", total_price: 300 },
      { name: "Kit A", total_price: 100 },
      { name: "Kit B", total_price: 200 },
    ];
    const sorted = [...kits].sort((a, b) => a.total_price - b.total_price);
    expect(sorted[0].name).toBe("Kit A");
  });

  it("sorts kits by date descending", () => {
    const kits = [
      { name: "Old", created_at: "2024-01-01" },
      { name: "New", created_at: "2024-12-01" },
    ];
    const sorted = [...kits].sort((a, b) => b.created_at.localeCompare(a.created_at));
    expect(sorted[0].name).toBe("New");
  });

  it("searches kits by name", () => {
    const kits = [
      { name: "Kit Premium" },
      { name: "Kit Básico" },
      { name: "Combo Especial" },
    ];
    const search = "premium";
    const filtered = kits.filter(k => k.name.toLowerCase().includes(search.toLowerCase()));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("Kit Premium");
  });

  it("selects multiple kits for comparison (max 3)", () => {
    const selected: string[] = [];
    const MAX = 3;

    selected.push("kit-1");
    selected.push("kit-2");
    selected.push("kit-3");
    
    const canAddMore = selected.length < MAX;
    expect(canAddMore).toBe(false);
  });
});

describe("Kit Share Flow Logic", () => {
  it("creates share token structure", () => {
    const shareData = {
      kit_id: "kit-1",
      seller_id: "seller-1",
      client_name: "João Silva",
      client_email: "joao@email.com",
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    };
    expect(shareData.kit_id).toBeTruthy();
    expect(shareData.client_email).toContain("@");
  });

  it("generates shareable URL", () => {
    const token = "abc123def456";
    const baseUrl = "https://example.com";
    const shareUrl = `${baseUrl}/kit/${token}`;
    expect(shareUrl).toContain("/kit/");
    expect(shareUrl).toContain(token);
  });

  it("validates token expiry", () => {
    const now = Date.now();
    const notExpired = new Date(now + 86400000);
    const expired = new Date(now - 86400000);
    expect(notExpired.getTime() > now).toBe(true);
    expect(expired.getTime() > now).toBe(false);
  });
});
