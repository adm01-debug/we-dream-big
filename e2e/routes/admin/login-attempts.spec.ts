import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/admin/login-attempts", path: "/admin/login-attempts", primary: { kind: "rest", key: "login_attempts", successBody: [] } });
