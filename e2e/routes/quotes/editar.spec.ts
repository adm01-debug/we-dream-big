import { buildAuthedRouteSuite } from "../_factories";

buildAuthedRouteSuite({
  name: "/orcamentos/:id/editar",
  path: "/orcamentos/q-001/editar",
  primary: {
    kind: "rest",
    key: "quotes",
    successBody: [{ id: "q-001", number: "Q-001", status: "draft", items: [] }],
  },
});
