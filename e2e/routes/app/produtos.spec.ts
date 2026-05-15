import { buildAuthedRouteSuite } from "../_factories";

buildAuthedRouteSuite({
  name: "/produtos (catálogo)",
  path: "/produtos",
  primary: { kind: "fn", key: "external-db-bridge", successBody: { success: true, data: [] } },
});
