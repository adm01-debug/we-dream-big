import { buildAuthedRouteSuite } from "../_factories";

buildAuthedRouteSuite({
  name: "/carrinhos",
  path: "/carrinhos",
  primary: { kind: "rest", key: "seller_carts", successBody: [] },
});
