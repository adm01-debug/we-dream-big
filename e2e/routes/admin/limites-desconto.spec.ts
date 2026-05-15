import { buildAuthedRouteSuite } from "../_factories";

buildAuthedRouteSuite({
  name: "/admin/limites-desconto",
  path: "/admin/limites-desconto",
  primary: { kind: "rest", key: "seller_discount_limits", successBody: [] },
});
