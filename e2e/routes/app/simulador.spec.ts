import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/simulador", path: "/simulador", primary: { kind: "fn", key: "external-db-bridge", successBody: { rows: [] } } });
