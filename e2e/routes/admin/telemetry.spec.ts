import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/admin/telemetria", path: "/admin/telemetria", primary: { kind: "rest", key: "telemetry_events", successBody: [] } });
