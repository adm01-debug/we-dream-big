import { buildAuthedRouteSuite } from "../_factories";

buildAuthedRouteSuite({
  name: "/orcamentos/:id (visualização)",
  path: "/orcamentos/q-001",
  primary: {
    kind: "rest",
    key: "quotes",
    successBody: [{ id: "q-001", number: "Q-001", status: "draft", items: [] }],
  },
});
