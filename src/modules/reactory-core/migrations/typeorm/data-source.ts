import "reflect-metadata";
import { DataSource } from "typeorm";
import { CORE_ENTITIES, CORE_MIGRATIONS } from "./schema";
import { typeormPostgresOptions } from "../../../../database/connectionOptions";

/**
 * Migration-only DataSource for reactory-core, used by bin/migrate-typeorm.sh
 * and the TypeORM CLI. Connection settings follow the runtime DataSource
 * (models/index.ts); entities and migrations come from ./schema so both agree.
 */
export default new DataSource({
  type: "postgres",
  ...typeormPostgresOptions(),
  synchronize: false,
  migrationsRun: false,
  entities: CORE_ENTITIES,
  ...CORE_MIGRATIONS,
});
