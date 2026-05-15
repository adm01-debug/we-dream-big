import { buildAuthedRouteSuite } from "../_factories";

buildAuthedRouteSuite({
  name: "/admin/rls-denials",
  path: "/admin/rls-denials",
  primary: { kind: "rest", key: "rls_denials", successBody: [] },
});
