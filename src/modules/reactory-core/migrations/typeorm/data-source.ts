import "reflect-metadata";
import { DataSource } from "typeorm";
import AuditModel from "../../models/Audit";

export default new DataSource({
  type: "postgres",
  host: process.env.REACTORY_POSTGRES_HOST || "localhost",
  port: parseInt(process.env.REACTORY_POSTGRES_PORT || "5432"),
  username: process.env.REACTORY_POSTGRES_USER || "reactory",
  password: process.env.REACTORY_POSTGRES_PASSWORD || "reactory",
  database: process.env.REACTORY_POSTGRES_DB || "reactory",
  synchronize: false,
  migrationsRun: false,
  entities: [AuditModel],
  migrations: [__dirname + "/[0-9]*-*.ts", __dirname + "/[0-9]*-*.js"],
  migrationsTableName: "reactory_migrations_reactory_core",
});
