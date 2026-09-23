import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * reactory-core baseline (WP-B3). Generated with `typeorm migration:generate` from
 * the entities, then made idempotent so that every existing database can adopt
 * it. Until now every database was built by `synchronize`, so it already
 * matches the entities:
 *   - CREATE TABLE / INDEX use IF NOT EXISTS
 *   - enum types and constraints are created only when absent
 *   - indexes that differ from the entity only by name are renamed in place,
 *     not dropped and rebuilt
 * On an empty database it creates the full schema. On a database that already
 * has it, it only records itself in the migrations table.
 */

export class CoreBaseline20260923120000 implements MigrationInterface {
    name = 'CoreBaseline20260923120000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "reactory_audit" (
                "id" SERIAL NOT NULL,
                "user_id" character varying(255) NOT NULL,
                "action" character varying(255) NOT NULL,
                "source" character varying(255) NOT NULL,
                "signature" character varying(255) NOT NULL,
                "before" text,
                "after" text,
                "actor_type" character varying(100),
                "actor_id" character varying(255),
                "resource_type" character varying(100),
                "resource_id" character varying(255),
                "event_type" character varying(100),
                "metadata" text,
                "ip_address" character varying(100),
                "user_agent" character varying(500),
                "session_id" character varying(255),
                "success" boolean NOT NULL DEFAULT true,
                "error_message" text,
                "organization_id" character varying(255),
                "module_name" character varying(255),
                "module_version" character varying(255),
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_007b7c4ef6e8f00d2bd86e8f49f" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_5d52bbd873c683b8c479a9a475" ON "reactory_audit" ("module_name", "module_version")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_632b6499d056f3a18dd40d0d0a" ON "reactory_audit" ("resource_type", "resource_id")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_21828393ca03105d135aa8bb2a" ON "reactory_audit" ("source", "created_at")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_1867d736b5758d316b59c8dfba" ON "reactory_audit" ("user_id", "action", "created_at")
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "reactory_rate_limits" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "key" character varying(255) NOT NULL,
                "count" integer NOT NULL DEFAULT '0',
                "windowStart" bigint NOT NULL,
                "windowEnd" bigint NOT NULL,
                "maxAttempts" integer NOT NULL DEFAULT '0',
                "identifierType" character varying(50),
                "identifier" character varying(255),
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_1da3c662db8d8f6b3204f271a8e" UNIQUE ("key"),
                CONSTRAINT "PK_cda2ce5093dd46982de56bf7421" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_e2a50966941ffd817445a25041" ON "reactory_rate_limits" ("key", "windowStart")
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "reactory_user_sessions" (
                "id" SERIAL NOT NULL,
                "session_id" character varying(255) NOT NULL,
                "user_id" character varying(255) NOT NULL,
                "email" character varying(255) NOT NULL,
                "host" character varying(255),
                "client_key" character varying(255),
                "issuer" character varying(255),
                "subject" character varying(255),
                "audience" character varying(255),
                "refresh_token" character varying(255),
                "issued_at" bigint,
                "expires_at" bigint,
                "lifetime" character varying(50),
                "status" character varying(50) NOT NULL DEFAULT 'active',
                "revoked_at" TIMESTAMP,
                "revocation_reason" character varying(255),
                "revoked_by" character varying(255),
                "user_agent" character varying(500),
                "ip_address" character varying(100),
                "metadata" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_5303e7724acb1fc5615c20b7739" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_a1494aeef7fe382e79508d32ff" ON "reactory_user_sessions" ("status", "expires_at")
        `);
        await queryRunner.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS "IDX_6a0f1d237b74cb2c772ea25168" ON "reactory_user_sessions" ("session_id")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_fe80acf6e687efad1772b75a64" ON "reactory_user_sessions" ("email", "created_at")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_8c9330797de5eb988c7cb89f9e" ON "reactory_user_sessions" ("user_id", "created_at")
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "reactory_form_submission" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "fqn" character varying(255) NOT NULL,
                "client_key" character varying(255),
                "user_id" character varying(255),
                "form_data" jsonb NOT NULL DEFAULT '{}'::jsonb,
                "ip_address" character varying(64),
                "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_c2def154090ea1fc03875232865" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_e3cf9082dbc9de366b4d3a287d" ON "reactory_form_submission" ("fqn")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_542b8bff7cdd51f0e481730c9f" ON "reactory_form_submission" ("client_key")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_4074ff28a8ffa1371db64b3020" ON "reactory_form_submission" ("user_id")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_470311df0ea7d964856f859988" ON "reactory_form_submission" ("client_key", "fqn", "created_at")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_bad9e02491ec6a7aca0410b0e2" ON "reactory_form_submission" ("fqn", "user_id")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_7496aefd840b808fbb3f102038" ON "reactory_form_submission" ("fqn", "created_at")
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."reactory_calendar_visibility_enum" AS ENUM(
                'private',
                'shared',
                'application',
                'organization',
                'public'
            );
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "reactory_calendar" (
                "id" SERIAL NOT NULL,
                "name" character varying(255) NOT NULL,
                "description" text,
                "color" character varying(7),
                "visibility" "public"."reactory_calendar_visibility_enum" NOT NULL DEFAULT 'private',
                "owner_id" character varying NOT NULL,
                "client_id" character varying,
                "organization_id" character varying,
                "business_unit_id" character varying,
                "allowed_user_ids" json,
                "allowed_team_ids" json,
                "is_default" boolean NOT NULL DEFAULT false,
                "is_active" boolean NOT NULL DEFAULT true,
                "timeZone" character varying(50) NOT NULL DEFAULT 'UTC',
                "workingHours" json,
                "settings" json,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_by" character varying NOT NULL,
                "updated_by" character varying NOT NULL,
                CONSTRAINT "PK_e349d7d346e7c1370bd8e9f2c1c" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_1287f3578d7bb1065986185a79" ON "reactory_calendar" ("owner_id")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_67fd9d4de6a32f54bd7230ac71" ON "reactory_calendar" ("client_id")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_9361b68885301c17e8e6aa647c" ON "reactory_calendar" ("organization_id")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_eaf49af8dfa6549ec6f6a7a9b0" ON "reactory_calendar" ("owner_id", "is_default")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_aa671f1b5a30f76bfe286c0782" ON "reactory_calendar" ("is_active", "created_at")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_a47f4bdae7a40f9d8b581af0df" ON "reactory_calendar" ("organization_id", "visibility", "is_active")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_6d0337735564fb6311e0a49393" ON "reactory_calendar" ("client_id", "visibility", "is_active")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_fbf64cd6123af0322a5114ddac" ON "reactory_calendar" ("owner_id", "visibility", "is_active")
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."reactory_calendar_entry_status_enum" AS ENUM('draft', 'confirmed', 'cancelled', 'completed');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."reactory_calendar_entry_priority_enum" AS ENUM('low', 'normal', 'high', 'urgent');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "reactory_calendar_entry" (
                "id" SERIAL NOT NULL,
                "calendar_id" integer NOT NULL,
                "title" character varying(255) NOT NULL,
                "description" text,
                "location" character varying(500),
                "start_date" TIMESTAMP WITH TIME ZONE NOT NULL,
                "end_date" TIMESTAMP WITH TIME ZONE NOT NULL,
                "timeZone" character varying(50) NOT NULL,
                "is_all_day" boolean NOT NULL DEFAULT false,
                "recurrence" json,
                "organizer_id" character varying NOT NULL,
                "status" "public"."reactory_calendar_entry_status_enum" NOT NULL DEFAULT 'confirmed',
                "priority" "public"."reactory_calendar_entry_priority_enum" NOT NULL DEFAULT 'normal',
                "category" character varying(100),
                "tags" json,
                "attachment_ids" json,
                "workflowTrigger" json,
                "serviceTrigger" json,
                "metadata" json,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "created_by" character varying NOT NULL,
                "updated_by" character varying NOT NULL,
                CONSTRAINT "PK_ed39df198d17270c9d143656189" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_1324d28c107e1240efcff2fbd0" ON "reactory_calendar_entry" ("calendar_id")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_7a2dc943093d0cb213ea0e33e8" ON "reactory_calendar_entry" ("start_date")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_2e60dfba823c11eb21e6dd53ca" ON "reactory_calendar_entry" ("end_date")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_142148925f93ae6b308cb9e800" ON "reactory_calendar_entry" ("organizer_id")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_0c0be4c412f19cab7095a277eb" ON "reactory_calendar_entry" ("calendar_id", "status", "start_date")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_6d0daf23c425ee261bc5851dfd" ON "reactory_calendar_entry" ("status", "start_date")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_01a5d33c74d09b4a24dcff5c41" ON "reactory_calendar_entry" ("start_date", "end_date")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_dc7dc116873b1229ab83628bd9" ON "reactory_calendar_entry" ("organizer_id", "status")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_cc675b0387201611d655018f81" ON "reactory_calendar_entry" ("calendar_id", "start_date", "end_date")
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."reactory_calendar_participant_role_enum" AS ENUM('organizer', 'required', 'optional', 'resource');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."reactory_calendar_participant_status_enum" AS ENUM('pending', 'accepted', 'declined', 'tentative');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "reactory_calendar_participant" (
                "id" SERIAL NOT NULL,
                "entry_id" integer NOT NULL,
                "user_id" character varying NOT NULL,
                "role" "public"."reactory_calendar_participant_role_enum" NOT NULL DEFAULT 'optional',
                "status" "public"."reactory_calendar_participant_status_enum" NOT NULL DEFAULT 'pending',
                "invited_at" TIMESTAMP WITH TIME ZONE NOT NULL,
                "responded_at" TIMESTAMP WITH TIME ZONE,
                "notes" text,
                CONSTRAINT "PK_b95253b37236f0ff89a4233e0fa" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_771434ed87c1a0360f40a8ade9" ON "reactory_calendar_participant" ("entry_id")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_a919f61a7189ea830328337c10" ON "reactory_calendar_participant" ("user_id")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_5185dcc53e7b2d88f4cfd8c714" ON "reactory_calendar_participant" ("invited_at")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_313e28fff769cd38f660597d4e" ON "reactory_calendar_participant" ("entry_id", "status")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_fe30644e597f638f04db1a3f24" ON "reactory_calendar_participant" ("user_id", "status")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_41eccbd1f29e8df663d00c7cf7" ON "reactory_calendar_participant" ("entry_id", "user_id")
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."reactory_calendar_recurrence_pattern_frequency_enum" AS ENUM('daily', 'weekly', 'monthly', 'yearly');
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "reactory_calendar_recurrence_pattern" (
                "id" SERIAL NOT NULL,
                "frequency" "public"."reactory_calendar_recurrence_pattern_frequency_enum" NOT NULL,
                "interval" integer NOT NULL DEFAULT '1',
                "end_date" TIMESTAMP WITH TIME ZONE,
                "count" integer,
                "by_day" json,
                "by_month" json,
                "by_month_day" json,
                "exceptions" json,
                CONSTRAINT "PK_a07e414bb6591b4100af255b8d2" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_4bb7433521b7eb9649ff64c40d" ON "reactory_calendar_recurrence_pattern" ("frequency", "interval")
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."reactory_calendar_workflow_trigger_trigger_type_enum" AS ENUM(
                'on_create',
                'on_update',
                'on_delete',
                'time_based',
                'participant_response'
            );
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "reactory_calendar_workflow_trigger" (
                "id" SERIAL NOT NULL,
                "entry_id" integer NOT NULL,
                "workflow_id" character varying NOT NULL,
                "workflow_version" character varying NOT NULL,
                "trigger_type" "public"."reactory_calendar_workflow_trigger_trigger_type_enum" NOT NULL,
                "trigger_offset" integer,
                "parameters" json,
                CONSTRAINT "PK_1bda6b2d2e862a2fa59ed8521ea" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_2a7f905ceb5b2ae133221256db" ON "reactory_calendar_workflow_trigger" ("entry_id")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_369ae461695b205715a407134c" ON "reactory_calendar_workflow_trigger" ("workflow_id", "workflow_version")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_cda26672f5d65179c218e84644" ON "reactory_calendar_workflow_trigger" ("entry_id", "trigger_type")
        `);
        await queryRunner.query(`
            DO $$ BEGIN
                CREATE TYPE "public"."reactory_calendar_service_trigger_trigger_type_enum" AS ENUM(
                'on_create',
                'on_update',
                'on_delete',
                'time_based',
                'participant_response'
            );
            EXCEPTION WHEN duplicate_object THEN NULL;
            END $$
        `);
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "reactory_calendar_service_trigger" (
                "id" SERIAL NOT NULL,
                "entry_id" integer NOT NULL,
                "service_id" character varying NOT NULL,
                "service_version" character varying NOT NULL,
                "method" character varying NOT NULL,
                "trigger_type" "public"."reactory_calendar_service_trigger_trigger_type_enum" NOT NULL,
                "trigger_offset" integer,
                "parameters" json,
                CONSTRAINT "PK_e229e7aa46d35ded133fe9a2849" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_54c882372ed926b85c70fa9ae2" ON "reactory_calendar_service_trigger" ("entry_id")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_ab41c2a44336e47f91d92d4b6f" ON "reactory_calendar_service_trigger" ("service_id", "service_version")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_6f22b3af9f429ccc1b6a970dc4" ON "reactory_calendar_service_trigger" ("entry_id", "trigger_type")
        `);
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_reactory_form_submission_data" ON "reactory_form_submission" USING GIN ("form_data" jsonb_path_ops)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "public"."IDX_6f22b3af9f429ccc1b6a970dc4"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_ab41c2a44336e47f91d92d4b6f"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_54c882372ed926b85c70fa9ae2"
        `);
        await queryRunner.query(`
            DROP TABLE "reactory_calendar_service_trigger"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."reactory_calendar_service_trigger_trigger_type_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_cda26672f5d65179c218e84644"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_369ae461695b205715a407134c"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_2a7f905ceb5b2ae133221256db"
        `);
        await queryRunner.query(`
            DROP TABLE "reactory_calendar_workflow_trigger"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."reactory_calendar_workflow_trigger_trigger_type_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_4bb7433521b7eb9649ff64c40d"
        `);
        await queryRunner.query(`
            DROP TABLE "reactory_calendar_recurrence_pattern"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."reactory_calendar_recurrence_pattern_frequency_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_41eccbd1f29e8df663d00c7cf7"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_fe30644e597f638f04db1a3f24"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_313e28fff769cd38f660597d4e"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_5185dcc53e7b2d88f4cfd8c714"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_a919f61a7189ea830328337c10"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_771434ed87c1a0360f40a8ade9"
        `);
        await queryRunner.query(`
            DROP TABLE "reactory_calendar_participant"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."reactory_calendar_participant_status_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."reactory_calendar_participant_role_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_cc675b0387201611d655018f81"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_dc7dc116873b1229ab83628bd9"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_01a5d33c74d09b4a24dcff5c41"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_6d0daf23c425ee261bc5851dfd"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_0c0be4c412f19cab7095a277eb"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_142148925f93ae6b308cb9e800"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_2e60dfba823c11eb21e6dd53ca"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_7a2dc943093d0cb213ea0e33e8"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_1324d28c107e1240efcff2fbd0"
        `);
        await queryRunner.query(`
            DROP TABLE "reactory_calendar_entry"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."reactory_calendar_entry_priority_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."reactory_calendar_entry_status_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_fbf64cd6123af0322a5114ddac"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_6d0337735564fb6311e0a49393"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_a47f4bdae7a40f9d8b581af0df"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_aa671f1b5a30f76bfe286c0782"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_eaf49af8dfa6549ec6f6a7a9b0"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_9361b68885301c17e8e6aa647c"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_67fd9d4de6a32f54bd7230ac71"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_1287f3578d7bb1065986185a79"
        `);
        await queryRunner.query(`
            DROP TABLE "reactory_calendar"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."reactory_calendar_visibility_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_7496aefd840b808fbb3f102038"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_bad9e02491ec6a7aca0410b0e2"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_470311df0ea7d964856f859988"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_4074ff28a8ffa1371db64b3020"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_542b8bff7cdd51f0e481730c9f"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_e3cf9082dbc9de366b4d3a287d"
        `);
        await queryRunner.query(`
            DROP TABLE "reactory_form_submission"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_8c9330797de5eb988c7cb89f9e"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_fe80acf6e687efad1772b75a64"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_6a0f1d237b74cb2c772ea25168"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_a1494aeef7fe382e79508d32ff"
        `);
        await queryRunner.query(`
            DROP TABLE "reactory_user_sessions"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_e2a50966941ffd817445a25041"
        `);
        await queryRunner.query(`
            DROP TABLE "reactory_rate_limits"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_1867d736b5758d316b59c8dfba"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_21828393ca03105d135aa8bb2a"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_632b6499d056f3a18dd40d0d0a"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_5d52bbd873c683b8c479a9a475"
        `);
        await queryRunner.query(`
            DROP TABLE "reactory_audit"
        `);
    }

}
