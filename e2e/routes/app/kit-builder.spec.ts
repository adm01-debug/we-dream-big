import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/montar-kit", path: "/montar-kit", primary: { kind: "fn", key: "external-db-bridge", successBody: { rows: [] } } });
