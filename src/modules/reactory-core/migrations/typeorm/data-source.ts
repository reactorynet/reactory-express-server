import "reflect-metadata";
import { DataSource } from "typeorm";
import { CORE_ENTITIES, CORE_MIGRATIONS } from "./schema";

/**
 * Migration-only DataSource for reactory-core, used by bin/migrate-typeorm.sh
 * and the TypeORM CLI. Connection settings follow the runtime DataSource
 * (models/index.ts); entities and migrations come from ./schema so both agree.
 */
export default new DataSource({
  type: "postgres",
  host: process.env.REACTORY_POSTGRES_HOST || process.env.POSTGRES_DB_HOST || "localhost",
  port: parseInt(process.env.REACTORY_POSTGRES_PORT || process.env.POSTGRES_DB_PORT || "5432", 10),
  username: process.env.REACTORY_POSTGRES_USER || process.env.POSTGRES_USER || "reactory",
  password: process.env.REACTORY_POSTGRES_PASSWORD || process.env.POSTGRES_PASSWORD || "reactory",
  database: process.env.REACTORY_POSTGRES_DB || process.env.POSTGRES_DB || "reactory",
  synchronize: false,
  migrationsRun: false,
  entities: CORE_ENTITIES,
  ...CORE_MIGRATIONS,
});
