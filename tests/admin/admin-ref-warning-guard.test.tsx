/**
 * Smoke render de componentes admin de governança (Ownership Audit / RLS),
 * focado em capturar regressões do warning:
 *   "Function components cannot be given refs"
 *
 * Esse warning aparece quando um componente de função recebe ref via Radix
 * `asChild` (TooltipTrigger, DialogTrigger, PopoverTrigger, DropdownMenuTrigger)
 * sem usar React.forwardRef. O guard captura console.error/warn e falha o
 * teste em vez de deixar o warning passar despercebido.
 *
 * Estratégia: renderizar isoladamente os componentes de cabeçalho admin que
 * mais usam `asChild` + abrir os Dialogs para forçar o pipeline de ref.
 */
import { describe, it, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { vi } from "vitest";

import { installReactWarningGuard } from "../helpers/react-warning-guard";

// Mocks neutros: as edge functions não podem rodar em jsdom.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { OwnershipRepairDialog } from "@/components/admin/OwnershipRepairDialog";
import { RlsIntegrationTestsDialog } from "@/components/admin/RlsIntegrationTestsDialog";

function Providers({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

describe("Admin governance — React ref warning guard", () => {
  let guard: ReturnType<typeof installReactWarningGuard>;

  beforeEach(() => {
    guard = installReactWarningGuard();
  });

  afterEach(() => {
    guard.dispose();
    cleanup();
  });

  it("OwnershipRepairDialog não dispara warning de ref ao abrir", async () => {
    render(
      <Providers>
        <OwnershipRepairDialog reportId="00000000-0000-0000-0000-000000000000" hasIssues={true} />
      </Providers>,
    );
    // Abre o dialog para forçar o pipeline Radix Trigger asChild + Portal
    fireEvent.click(screen.getByRole("button", { name: /reparar registros/i }));
    guard.expectNoRefWarning("OwnershipRepairDialog");
  });

  it("OwnershipRepairDialog desabilitado (sem issues) não dispara warning", () => {
    render(
      <Providers>
        <OwnershipRepairDialog hasIssues={false} />
      </Providers>,
    );
    guard.expectNoRefWarning("OwnershipRepairDialog disabled");
  });

  it("RlsIntegrationTestsDialog não dispara warning de ref ao abrir", () => {
    render(
      <Providers>
        <RlsIntegrationTestsDialog />
      </Providers>,
    );
    fireEvent.click(screen.getByRole("button", { name: /testar rls/i }));
    guard.expectNoRefWarning("RlsIntegrationTestsDialog");
  });
});
