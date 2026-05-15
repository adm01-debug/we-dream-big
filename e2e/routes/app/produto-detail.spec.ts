import { buildAuthedRouteSuite } from "../_factories";

buildAuthedRouteSuite({
  name: "/produto/:id (detalhe de produto)",
  path: "/produto/abc-123",
  primary: {
    kind: "fn",
    key: "external-db-bridge",
    successBody: {
      success: true,
      data: { id: "abc-123", name: "Produto Teste", variants: [], images: [] },
    },
  },
});
