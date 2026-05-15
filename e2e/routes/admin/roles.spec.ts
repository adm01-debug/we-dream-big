import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/admin/roles", path: "/admin/roles", primary: { kind: "rest", key: "user_roles", successBody: [] } });
