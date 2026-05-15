import { buildAuthedRouteSuite } from "../_factories";

buildAuthedRouteSuite({
  name: "/orcamentos/kanban",
  path: "/orcamentos/kanban",
  primary: { kind: "rest", key: "quotes", successBody: [] },
});
