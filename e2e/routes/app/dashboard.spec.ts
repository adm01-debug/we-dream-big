import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/dashboard", path: "/dashboard", primary: { kind: "rest", key: "dashboard_widgets", successBody: [] } });
