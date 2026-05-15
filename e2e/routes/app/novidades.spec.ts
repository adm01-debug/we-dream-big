import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/novidades", path: "/novidades", primary: { kind: "fn", key: "external-db-bridge", successBody: { rows: [] } } });
