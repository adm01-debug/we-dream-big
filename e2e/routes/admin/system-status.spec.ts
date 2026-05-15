import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/status", path: "/status", primary: { kind: "fn", key: "system-status", successBody: { ok: true } } });
