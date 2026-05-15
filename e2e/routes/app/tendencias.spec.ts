import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/tendencias", path: "/tendencias", primary: { kind: "fn", key: "external-db-bridge", successBody: { rows: [] } } });
