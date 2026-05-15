import { buildPublicTokenSuite } from "../_factories";

buildPublicTokenSuite({
  name: "/colecao-publica/:token (coleção pública)",
  buildPath: t => `/colecao-publica/${t}`,
  edgeFnName: "collections-public-react",
  successBody: { collection: { name: "Coleção", items: [] } },
});
