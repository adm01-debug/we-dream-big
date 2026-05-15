import { buildAuthedRouteSuite } from "../_factories";

buildAuthedRouteSuite({
  name: "/orcamentos/dashboard",
  path: "/orcamentos/dashboard",
  primary: { kind: "rest", key: "quotes", successBody: [] },
});
