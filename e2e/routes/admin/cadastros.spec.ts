import { buildAuthedRouteSuite } from "../_factories";

buildAuthedRouteSuite({
  name: "/admin/cadastros",
  path: "/admin/cadastros",
  primary: { kind: "fn", key: "external-db-bridge", successBody: { success: true, data: [] } },
});
