import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/ferramentas/bi", path: "/ferramentas/bi", primary: { kind: "fn", key: "external-db-bridge", successBody: { rows: [] } } });
