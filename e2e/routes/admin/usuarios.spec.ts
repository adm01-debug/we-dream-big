import { buildAuthedRouteSuite } from "../_factories";

buildAuthedRouteSuite({
  name: "/admin/usuarios",
  path: "/admin/usuarios",
  primary: { kind: "rest", key: "profiles", successBody: [] },
});
