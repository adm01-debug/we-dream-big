import { buildAuthedRouteSuite } from "../_factories";
import { SAMPLE_ID } from "../_catalog";
buildAuthedRouteSuite({ name: "/orcamentos/:id", path: `/orcamentos/${SAMPLE_ID}`, primary: { kind: "rest", key: "quotes", successBody: { id: SAMPLE_ID, items: [] } } });
