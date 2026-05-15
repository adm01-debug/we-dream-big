import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/inteligencia-comercial", path: "/inteligencia-comercial", primary: { kind: "fn", key: "external-db-bridge", successBody: { rows: [] } } });
