import { buildAuthedRouteSuite } from "../_factories";

buildAuthedRouteSuite({
  name: "/orcamentos/novo (wizard)",
  path: "/orcamentos/novo",
  primary: { kind: "rest", key: "quote_templates", successBody: [] },
});
