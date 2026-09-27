/**
 * The reactory-core Postgres schema: entities and migration settings shared by
 * the runtime DataSource (models/index.ts) and the migration CLI DataSource
 * (data-source.ts). One list, so the runtime's "pending migrations" check and
 * `bin/migrate-typeorm.sh` can never disagree.
 *
 * Relative imports only: the TypeORM CLI loads this file through ts-node
 * without the @reactory path aliases.
 */
import Audit from "../../models/Audit";
import RateLimit from "../../models/RateLimit";
import UserSession from "../../models/UserSession";
import ReactoryFormSubmission from "../../models/ReactoryFormSubmission";
import {
  ReactoryCalendar,
  ReactoryCalendarEntry,
  ReactoryCalendarParticipant,
  ReactoryCalendarRecurrencePattern,
  ReactoryCalendarWorkflowTrigger,
  ReactoryCalendarServiceTrigger,
} from "../../models/ReactoryCalendar";

export const CORE_ENTITIES = [
  Audit,
  RateLimit,
  ReactoryCalendar,
  ReactoryCalendarEntry,
  ReactoryCalendarParticipant,
  ReactoryCalendarRecurrencePattern,
  ReactoryCalendarWorkflowTrigger,
  ReactoryCalendarServiceTrigger,
  ReactoryFormSubmission,
  UserSession,
];

export const CORE_MIGRATIONS = {
  migrations: [__dirname + "/[0-9]*-*.ts", __dirname + "/[0-9]*-*.js"],
  migrationsTableName: "reactory_migrations_reactory_core",
};
