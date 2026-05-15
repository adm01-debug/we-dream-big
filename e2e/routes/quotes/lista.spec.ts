import { buildAuthedRouteSuite } from "../_factories";

buildAuthedRouteSuite({
  name: "/orcamentos (lista)",
  path: "/orcamentos",
  primary: { kind: "rest", key: "quotes", successBody: [] },
});
