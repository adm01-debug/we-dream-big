import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/admin/permissoes", path: "/admin/permissoes", primary: { kind: "rest", key: "permissions", successBody: [] } });
