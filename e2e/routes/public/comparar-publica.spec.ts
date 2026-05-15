import { buildPublicTokenSuite } from "../_factories";

buildPublicTokenSuite({
  name: "/comparar-publica/:token (comparador público)",
  buildPath: t => `/comparar-publica/${t}`,
  edgeFnName: "comparisons-public-react",
  successBody: { comparison: { products: [], score: {} } },
});
