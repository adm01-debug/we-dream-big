import React from "react";
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { Package } from "lucide-react";
import { renderWithProviders } from "../render-helpers";
import { SidebarNavGroup, type NavGroup } from "@/components/layout/sidebar/SidebarNavGroup";

const group: NavGroup = {
  id: "catalog",
  label: "Catálogo",
  icon: Package,
  items: [{ icon: Package, label: "Produtos", href: "/" }],
};

describe("SidebarNavGroup", () => {
  it("renders the group aria-label without runtime errors", () => {
    expect(() =>
      renderWithProviders(
        <SidebarNavGroup
          group={group}
          isOpen={false}
          isCollapsed={false}
          onToggle={vi.fn()}
          onMobileClose={vi.fn()}
          isMobileSidebarOpen={false}
        />,
        { route: "/dashboard" }
      )
    ).not.toThrow();

    expect(screen.getByRole("button", { name: /expandir grupo catálogo/i })).toBeInTheDocument();
  });
});