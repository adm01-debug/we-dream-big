import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/mockup-generator", path: "/mockup-generator", primary: { kind: "fn", key: "external-db-bridge", successBody: { rows: [] } } });
