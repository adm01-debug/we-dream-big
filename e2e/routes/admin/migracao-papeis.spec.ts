import { buildAuthedRouteSuite } from "../_factories";
buildAuthedRouteSuite({ name: "/admin/seguranca/migracao-papeis", path: "/admin/seguranca/migracao-papeis", primary: { kind: "rest", key: "role_migration_batches", successBody: [] } });
