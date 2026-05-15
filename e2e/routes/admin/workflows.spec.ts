import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/admin/workflows", path: "/admin/workflows", primary: { kind: "rest", key: "workflows", successBody: [] } });
