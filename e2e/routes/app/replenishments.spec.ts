import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/reposicao", path: "/reposicao", primary: { kind: "fn", key: "external-db-bridge", successBody: { rows: [] } } });
