import { buildAuthedRouteSuite } from "../_factories";

buildAuthedRouteSuite({
  name: "/admin/conexoes",
  path: "/admin/conexoes",
  primary: { kind: "fn", key: "connections-hub-audit", successBody: { connections: [] } },
});
