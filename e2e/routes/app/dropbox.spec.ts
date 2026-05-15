import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/dropbox", path: "/dropbox", primary: { kind: "fn", key: "dropbox-browser", successBody: { entries: [] } } });
