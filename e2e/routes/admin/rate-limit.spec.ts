import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/admin/rate-limit", path: "/admin/rate-limit", primary: { kind: "rest", key: "rate_limit_events", successBody: [] } });
