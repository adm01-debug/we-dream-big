import { buildPublicTokenSuite } from "../_factories";
buildPublicTokenSuite({
  name: "/kit/:token",
  buildPath: (t) => `/kit/${t}`,
  edgeFnName: "kit-public",
  successBody: { kit: { id: "k1", name: "[E2E] Kit Demo", items: [] } },
});
