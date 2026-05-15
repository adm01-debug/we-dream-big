import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/estoque", path: "/estoque", primary: { kind: "fn", key: "external-db-bridge", successBody: { rows: [] } } });
