import { buildAuthedRouteSuite } from "../_factories";

buildAuthedRouteSuite({
  name: "/comparar",
  path: "/comparar",
  primary: { kind: "fn", key: "external-db-bridge", successBody: { success: true, data: [] } },
});
