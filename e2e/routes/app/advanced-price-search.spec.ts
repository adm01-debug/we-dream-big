import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/busca-preco", path: "/busca-preco", primary: { kind: "fn", key: "external-db-bridge", successBody: { rows: [] } } });
