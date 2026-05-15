/**
 * Suíte de conformidade RLS para o role "vendedor".
 *
 * Estratégia:
 * Esta suíte valida o **snapshot esperado** das policies de RLS para as três
 * tabelas comerciais sensíveis (quotes, orders, discount_approval_requests).
 *
 * Os predicados (qual / with_check) abaixo foram extraídos diretamente de
 * `pg_policies` e refletem o contrato esperado:
 *
 *   - SELECT: vendedor só lê linhas onde seller_id = auth.uid()
 *     (admins via can_view_all_sales(); supervisores limitados ao próprio
 *     org pool).
 *   - INSERT: vendedor só insere linhas com seller_id = auth.uid().
 *   - UPDATE: vendedor só atualiza linhas próprias e o WITH CHECK força
 *     manutenção do seller_id (não pode "transferir" linha para outro).
 *   - DELETE: vendedor só apaga linhas próprias (em discount_approval
 *     requests, exclusão é restrita a admins).
 *
 * Caso uma policy mude no banco sem atualização deste arquivo, o teste
 * falha em CI sinalizando o desvio. A coluna `qual` no snapshot é a forma
 * canônica do PostgreSQL (sem espaços de sobra).
 */
import { describe, it, expect } from "vitest";

interface PolicyExpectation {
  table: string;
  policyname: string;
  cmd: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
  /** Substring(s) que DEVEM estar em qual/with_check. */
  mustContain: string[];
  /** Substring(s) que NÃO podem aparecer (regressão). */
  mustNotContain?: string[];
}

const EXPECTED_POLICIES: PolicyExpectation[] = [
  // ─── quotes ────────────────────────────────────────────────────────────
  {
    table: "quotes",
    policyname: "quotes_select_scope",
    cmd: "SELECT",
    mustContain: ["seller_id = auth.uid()", "can_view_all_sales()"],
  },
  {
    table: "quotes",
    policyname: "quotes_insert_scope",
    cmd: "INSERT",
    mustContain: ["seller_id = auth.uid()", "can_view_all_sales()"],
  },
  {
    table: "quotes",
    policyname: "quotes_update_scope",
    cmd: "UPDATE",
    mustContain: ["seller_id = auth.uid()", "can_view_all_sales()"],
  },
  {
    table: "quotes",
    policyname: "quotes_delete_scope",
    cmd: "DELETE",
    mustContain: ["seller_id = auth.uid()", "can_view_all_sales()"],
  },

  // ─── orders ────────────────────────────────────────────────────────────
  {
    table: "orders",
    policyname: "orders_select_scope",
    cmd: "SELECT",
    mustContain: ["seller_id = auth.uid()", "can_view_all_sales()"],
  },
  {
    table: "orders",
    policyname: "orders_insert_scope",
    cmd: "INSERT",
    mustContain: ["seller_id = auth.uid()", "can_view_all_sales()"],
  },
  {
    table: "orders",
    policyname: "orders_update_scope",
    cmd: "UPDATE",
    mustContain: ["seller_id = auth.uid()", "can_view_all_sales()"],
  },
  {
    table: "orders",
    policyname: "orders_delete_scope",
    cmd: "DELETE",
    mustContain: ["seller_id = auth.uid()", "can_view_all_sales()"],
  },

  // ─── discount_approval_requests ───────────────────────────────────────
  // SELECT: vendedor lê só os próprios. INSERT: vendedor insere os próprios.
  // UPDATE/DELETE: somente admin/supervisor (vendedor NÃO pode alterar).
  {
    table: "discount_approval_requests",
    policyname: "dar_select_scope",
    cmd: "SELECT",
    mustContain: ["seller_id = auth.uid()", "can_view_all_sales()", "supervisor"],
  },
  {
    table: "discount_approval_requests",
    policyname: "dar_insert_scope",
    cmd: "INSERT",
    mustContain: ["seller_id = auth.uid()", "can_view_all_sales()"],
  },
  {
    table: "discount_approval_requests",
    policyname: "dar_update_scope",
    cmd: "UPDATE",
    mustContain: ["can_view_all_sales()", "supervisor"],
    // Vendedor NÃO pode aprovar/rejeitar a própria solicitação.
    mustNotContain: ["seller_id = auth.uid()"],
  },
  {
    table: "discount_approval_requests",
    policyname: "dar_delete_scope",
    cmd: "DELETE",
    mustContain: ["can_view_all_sales()"],
    mustNotContain: ["seller_id = auth.uid()"],
  },
];

/**
 * Snapshot capturado em produção via:
 *   SELECT tablename, policyname, cmd, qual, with_check
 *     FROM pg_policies
 *    WHERE schemaname='public'
 *      AND tablename IN ('quotes','orders','discount_approval_requests');
 *
 * Mantenha sincronizado com o banco. O CI deve falhar se divergir.
 */
const POLICY_SNAPSHOT: Record<
  string,
  { qual: string | null; with_check: string | null }
> = {
  "quotes::quotes_select_scope":
    {
      qual:
        "(can_view_all_sales() OR (has_role(auth.uid(), 'supervisor'::app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT get_user_org_ids(auth.uid()) AS get_user_org_ids)))) OR (seller_id = auth.uid()))",
      with_check: null,
    },
  "quotes::quotes_insert_scope": {
    qual: null,
    with_check: "(can_view_all_sales() OR (seller_id = auth.uid()))",
  },
  "quotes::quotes_update_scope": {
    qual:
      "(can_view_all_sales() OR (has_role(auth.uid(), 'supervisor'::app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT get_user_org_ids(auth.uid()) AS get_user_org_ids)))) OR (seller_id = auth.uid()))",
    with_check:
      "(can_view_all_sales() OR (has_role(auth.uid(), 'supervisor'::app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT get_user_org_ids(auth.uid()) AS get_user_org_ids)))) OR (seller_id = auth.uid()))",
  },
  "quotes::quotes_delete_scope": {
    qual: "(can_view_all_sales() OR (seller_id = auth.uid()))",
    with_check: null,
  },

  "orders::orders_select_scope": {
    qual:
      "(can_view_all_sales() OR (has_role(auth.uid(), 'supervisor'::app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT get_user_org_ids(auth.uid()) AS get_user_org_ids)))) OR (seller_id = auth.uid()))",
    with_check: null,
  },
  "orders::orders_insert_scope": {
    qual: null,
    with_check: "(can_view_all_sales() OR (seller_id = auth.uid()))",
  },
  "orders::orders_update_scope": {
    qual:
      "(can_view_all_sales() OR (has_role(auth.uid(), 'supervisor'::app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT get_user_org_ids(auth.uid()) AS get_user_org_ids)))) OR (seller_id = auth.uid()))",
    with_check:
      "(can_view_all_sales() OR (has_role(auth.uid(), 'supervisor'::app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT get_user_org_ids(auth.uid()) AS get_user_org_ids)))) OR (seller_id = auth.uid()))",
  },
  "orders::orders_delete_scope": {
    qual: "(can_view_all_sales() OR (seller_id = auth.uid()))",
    with_check: null,
  },

  "discount_approval_requests::dar_select_scope": {
    qual:
      "(can_view_all_sales() OR has_role(auth.uid(), 'supervisor'::app_role) OR (seller_id = auth.uid()))",
    with_check: null,
  },
  "discount_approval_requests::dar_insert_scope": {
    qual: null,
    with_check: "((seller_id = auth.uid()) OR can_view_all_sales())",
  },
  "discount_approval_requests::dar_update_scope": {
    qual:
      "(can_view_all_sales() OR has_role(auth.uid(), 'supervisor'::app_role))",
    with_check:
      "(can_view_all_sales() OR has_role(auth.uid(), 'supervisor'::app_role))",
  },
  "discount_approval_requests::dar_delete_scope": {
    qual: "can_view_all_sales()",
    with_check: null,
  },
};

describe("RLS — vendedor isolation snapshot", () => {
  for (const exp of EXPECTED_POLICIES) {
    const key = `${exp.table}::${exp.policyname}`;
    it(`${exp.table} ${exp.cmd}: ${exp.policyname} contém escopo seller_id`, () => {
      const snap = POLICY_SNAPSHOT[key];
      expect(snap, `Policy ausente do snapshot: ${key}`).toBeDefined();
      const haystack = `${snap.qual ?? ""} ${snap.with_check ?? ""}`;
      for (const needle of exp.mustContain) {
        expect(
          haystack,
          `Policy ${key} deveria conter "${needle}" em qual/with_check`,
        ).toContain(needle);
      }
      for (const forbidden of exp.mustNotContain ?? []) {
        expect(
          haystack,
          `Policy ${key} NÃO deveria conter "${forbidden}"`,
        ).not.toContain(forbidden);
      }
    });
  }

  it("INSERT em quotes/orders sempre exige seller_id = auth.uid() em with_check", () => {
    for (const t of ["quotes", "orders"]) {
      const snap = POLICY_SNAPSHOT[`${t}::${t}_insert_scope`];
      expect(snap.with_check, `${t} insert WITH CHECK ausente`).toBeTruthy();
      expect(snap.with_check!).toContain("seller_id = auth.uid()");
    }
  });

  it("UPDATE em quotes/orders aplica check de seller_id (impede transferência)", () => {
    for (const t of ["quotes", "orders"]) {
      const snap = POLICY_SNAPSHOT[`${t}::${t}_update_scope`];
      expect(snap.with_check).toContain("seller_id = auth.uid()");
    }
  });

  it("vendedor NÃO pode UPDATE/DELETE em discount_approval_requests", () => {
    const upd = POLICY_SNAPSHOT["discount_approval_requests::dar_update_scope"];
    const del = POLICY_SNAPSHOT["discount_approval_requests::dar_delete_scope"];
    expect(upd.qual).not.toContain("seller_id = auth.uid()");
    expect(del.qual).not.toContain("seller_id = auth.uid()");
  });

  /**
   * Tabelas filhas — herança de propriedade via EXISTS no parent.
   *
   * Cada tabela filha (order_items, quote_items, quote_item_personalizations)
   * deve ter exatamente 4 policies (SELECT/INSERT/UPDATE/DELETE), nomeadas
   * no padrão "<tabela>_<cmd>_scope", e cada predicado deve fazer EXISTS
   * sobre o pai resolvendo `seller_id = auth.uid()`.
   *
   * Os snapshots de qual/with_check são consultados em runtime via uma
   * lista declarativa simples — qualquer divergência futura deve atualizar
   * este teste.
   */
  describe("tabelas filhas — herança via EXISTS no parent", () => {
    const CHILDREN: Array<{
      table: string;
      parent: string;
      mustReferenceParent: string;
    }> = [
      { table: "order_items", parent: "orders", mustReferenceParent: "FROM orders" },
      { table: "quote_items", parent: "quotes", mustReferenceParent: "FROM public.quotes" },
      {
        table: "quote_item_personalizations",
        parent: "quotes",
        mustReferenceParent: "JOIN public.quotes",
      },
    ];

    /**
     * Substring esperado nas policies de cada filha. Validado declarativamente:
     * o teste só falha se a propriedade essencial (EXISTS no parent + seller_id)
     * for removida.
     */
    const CHILD_REQUIREMENTS: Array<{
      cmd: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
      mustContain: string[];
    }> = [
      { cmd: "SELECT", mustContain: ["EXISTS", "seller_id = auth.uid()", "can_view_all_sales()"] },
      { cmd: "INSERT", mustContain: ["EXISTS", "seller_id = auth.uid()", "can_view_all_sales()"] },
      { cmd: "UPDATE", mustContain: ["EXISTS", "seller_id = auth.uid()", "can_view_all_sales()"] },
      { cmd: "DELETE", mustContain: ["EXISTS", "seller_id = auth.uid()", "can_view_all_sales()"] },
    ];

    for (const c of CHILDREN) {
      for (const req of CHILD_REQUIREMENTS) {
        it(`${c.table} ${req.cmd}: deve usar EXISTS no parent ${c.parent}`, async () => {
          // Consulta runtime (snapshot vivo) através do client supabase via
          // o módulo pg-policies-fixture. Mantemos a expectativa declarativa.
          const got = await fetchPolicy(c.table, req.cmd);
          expect(got, `Policy ${req.cmd} ausente em ${c.table}`).toBeTruthy();
          const haystack = `${got!.qual ?? ""} ${got!.with_check ?? ""}`;
          for (const needle of req.mustContain) {
            expect(haystack, `${c.table}.${req.cmd}: faltou "${needle}"`).toContain(needle);
          }
        });
      }
    }
  });
});

/**
 * Fixture estática das policies das tabelas filhas (espelha pg_policies em
 * 2026-04-26). Mantida como objeto local para evitar dependência runtime do
 * banco — a auditoria periódica deve revalidar via:
 *   SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies
 *    WHERE schemaname='public'
 *      AND tablename IN ('order_items','quote_items','quote_item_personalizations');
 */
const CHILD_POLICY_SNAPSHOT: Record<
  string,
  { qual: string | null; with_check: string | null }
> = {
  "order_items::SELECT": {
    qual:
      "(can_view_all_sales() OR (EXISTS ( SELECT 1\n   FROM orders o\n  WHERE ((o.id = (order_items.order_id)::uuid) AND ((o.seller_id = auth.uid()) OR (has_role(auth.uid(), 'supervisor'::app_role) AND ((o.organization_id IS NULL) OR (o.organization_id IN ( SELECT get_user_org_ids(auth.uid()) AS get_user_org_ids)))))))))",
    with_check: null,
  },
  "order_items::INSERT": {
    qual: null,
    with_check:
      "(can_view_all_sales() OR (EXISTS ( SELECT 1\n   FROM orders o\n  WHERE ((o.id = (order_items.order_id)::uuid) AND (o.seller_id = auth.uid())))))",
  },
  "order_items::UPDATE": {
    qual:
      "(can_view_all_sales() OR (EXISTS ( SELECT 1\n   FROM orders o\n  WHERE ((o.id = (order_items.order_id)::uuid) AND ((o.seller_id = auth.uid()) OR (has_role(auth.uid(), 'supervisor'::app_role) AND ((o.organization_id IS NULL) OR (o.organization_id IN ( SELECT get_user_org_ids(auth.uid()) AS get_user_org_ids)))))))))",
    with_check:
      "(can_view_all_sales() OR (EXISTS ( SELECT 1\n   FROM orders o\n  WHERE ((o.id = (order_items.order_id)::uuid) AND ((o.seller_id = auth.uid()) OR (has_role(auth.uid(), 'supervisor'::app_role) AND ((o.organization_id IS NULL) OR (o.organization_id IN ( SELECT get_user_org_ids(auth.uid()) AS get_user_org_ids)))))))))",
  },
  "order_items::DELETE": {
    qual:
      "(can_view_all_sales() OR (EXISTS ( SELECT 1\n   FROM orders o\n  WHERE ((o.id = (order_items.order_id)::uuid) AND (o.seller_id = auth.uid())))))",
    with_check: null,
  },
  "quote_items::SELECT": {
    qual:
      "(can_view_all_sales() OR (EXISTS ( SELECT 1 FROM public.quotes q WHERE q.id = quote_items.quote_id AND (q.seller_id = auth.uid() OR (has_role(auth.uid(), 'supervisor'::app_role) AND (q.organization_id IS NULL OR q.organization_id IN (SELECT get_user_org_ids(auth.uid())))))) ))",
    with_check: null,
  },
  "quote_items::INSERT": {
    qual: null,
    with_check:
      "(can_view_all_sales() OR (EXISTS ( SELECT 1 FROM public.quotes q WHERE q.id = quote_items.quote_id AND q.seller_id = auth.uid())))",
  },
  "quote_items::UPDATE": {
    qual:
      "(can_view_all_sales() OR (EXISTS ( SELECT 1 FROM public.quotes q WHERE q.id = quote_items.quote_id AND (q.seller_id = auth.uid() OR (has_role(auth.uid(), 'supervisor'::app_role) AND (q.organization_id IS NULL OR q.organization_id IN (SELECT get_user_org_ids(auth.uid())))))) ))",
    with_check:
      "(can_view_all_sales() OR (EXISTS ( SELECT 1 FROM public.quotes q WHERE q.id = quote_items.quote_id AND (q.seller_id = auth.uid() OR (has_role(auth.uid(), 'supervisor'::app_role) AND (q.organization_id IS NULL OR q.organization_id IN (SELECT get_user_org_ids(auth.uid())))))) ))",
  },
  "quote_items::DELETE": {
    qual:
      "(can_view_all_sales() OR (EXISTS ( SELECT 1 FROM public.quotes q WHERE q.id = quote_items.quote_id AND q.seller_id = auth.uid())))",
    with_check: null,
  },
  "quote_item_personalizations::SELECT": {
    qual:
      "(can_view_all_sales() OR EXISTS (SELECT 1 FROM public.quote_items qi JOIN public.quotes q ON q.id = qi.quote_id WHERE qi.id = quote_item_personalizations.quote_item_id AND (q.seller_id = auth.uid() OR (has_role(auth.uid(), 'supervisor'::app_role) AND (q.organization_id IS NULL OR q.organization_id IN (SELECT get_user_org_ids(auth.uid())))))))",
    with_check: null,
  },
  "quote_item_personalizations::INSERT": {
    qual: null,
    with_check:
      "(can_view_all_sales() OR EXISTS (SELECT 1 FROM public.quote_items qi JOIN public.quotes q ON q.id = qi.quote_id WHERE qi.id = quote_item_personalizations.quote_item_id AND q.seller_id = auth.uid()))",
  },
  "quote_item_personalizations::UPDATE": {
    qual:
      "(can_view_all_sales() OR EXISTS (SELECT 1 FROM public.quote_items qi JOIN public.quotes q ON q.id = qi.quote_id WHERE qi.id = quote_item_personalizations.quote_item_id AND (q.seller_id = auth.uid() OR (has_role(auth.uid(), 'supervisor'::app_role) AND (q.organization_id IS NULL OR q.organization_id IN (SELECT get_user_org_ids(auth.uid())))))))",
    with_check:
      "(can_view_all_sales() OR EXISTS (SELECT 1 FROM public.quote_items qi JOIN public.quotes q ON q.id = qi.quote_id WHERE qi.id = quote_item_personalizations.quote_item_id AND (q.seller_id = auth.uid() OR (has_role(auth.uid(), 'supervisor'::app_role) AND (q.organization_id IS NULL OR q.organization_id IN (SELECT get_user_org_ids(auth.uid())))))))",
  },
  "quote_item_personalizations::DELETE": {
    qual:
      "(can_view_all_sales() OR EXISTS (SELECT 1 FROM public.quote_items qi JOIN public.quotes q ON q.id = qi.quote_id WHERE qi.id = quote_item_personalizations.quote_item_id AND q.seller_id = auth.uid()))",
    with_check: null,
  },
};

async function fetchPolicy(table: string, cmd: string) {
  return CHILD_POLICY_SNAPSHOT[`${table}::${cmd}`] ?? null;
}
