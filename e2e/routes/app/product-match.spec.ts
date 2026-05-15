import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/match", path: "/match", primary: { kind: "fn", key: "external-db-bridge", successBody: { rows: [] } } });
