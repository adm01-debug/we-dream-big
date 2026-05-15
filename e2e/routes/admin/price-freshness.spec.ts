import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/admin/validade-precos", path: "/admin/validade-precos", primary: { kind: "rest", key: "price_freshness_settings", successBody: [] } });
