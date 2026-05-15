import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/simulador-precos", path: "/simulador-precos", primary: { kind: "fn", key: "external-db-bridge", successBody: { rows: [] } } });
