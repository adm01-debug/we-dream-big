import { buildAuthedRouteSuite } from "../_factories";

buildAuthedRouteSuite({
  name: "/favoritos",
  path: "/favoritos",
  primary: { kind: "rest", key: "favorites", successBody: [] },
});
