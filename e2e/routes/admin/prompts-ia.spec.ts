import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/admin/prompts-ia", path: "/admin/prompts-ia", primary: { kind: "rest", key: "ai_prompts", successBody: [] } });
