import { buildAuthedRouteSuite } from "../_factories";
import { SAMPLE_ID } from "../_catalog";
buildAuthedRouteSuite({ name: "/colecoes/:id", path: `/colecoes/${SAMPLE_ID}`, primary: { kind: "rest", key: "collections", successBody: { id: SAMPLE_ID, name: "[E2E] Sample", items: [] } } });
