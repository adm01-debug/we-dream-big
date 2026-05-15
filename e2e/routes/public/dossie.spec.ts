import { buildPublicTokenSuite } from "../_factories";

buildPublicTokenSuite({
  name: "/dossie/:token (dossiê BI público)",
  buildPath: t => `/dossie/${t}`,
  edgeFnName: "bi-share-dossier",
  successBody: { dossier: { title: "Dossiê", widgets: [] } },
});
