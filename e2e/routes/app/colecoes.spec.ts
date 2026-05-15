import { buildAuthedRouteSuite } from "../_factories";

buildAuthedRouteSuite({
  name: "/colecoes",
  path: "/colecoes",
  primary: { kind: "rest", key: "collections", successBody: [] },
});
