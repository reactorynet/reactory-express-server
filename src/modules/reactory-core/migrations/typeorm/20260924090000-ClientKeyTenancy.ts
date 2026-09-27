import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * WP-B2: tenant key (client_key) on every tenant-owned reactory-core table.
 *
 * Expand, backfill, contract in one step:
 *   1. add client_key (nullable) to the six calendar tables and to audit
 *   2. backfill: calendar entries from their calendar, participants and
 *      triggers from their entry, everything else (and form submissions
 *      without one) with REACTORY_TENANT_BACKFILL_KEY, default "reactory"
 *   3. NOT NULL on the calendar tables and form submissions; audit stays
 *      nullable because system events belong to no tenant
 */
const backfillKey = (): string => process.env.REACTORY_TENANT_BACKFILL_KEY || "reactory";

export class ClientKeyTenancy20260924090000 implements MigrationInterface {
    name = 'ClientKeyTenancy20260924090000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const key = backfillKey();
        await queryRunner.query(`
            ALTER TABLE "reactory_audit" ADD "client_key" character varying(255)
        `);
        await queryRunner.query(`
            ALTER TABLE "reactory_calendar" ADD "client_key" character varying(255)
        `);
        await queryRunner.query(`
            ALTER TABLE "reactory_calendar_entry" ADD "client_key" character varying(255)
        `);
        await queryRunner.query(`
            ALTER TABLE "reactory_calendar_participant" ADD "client_key" character varying(255)
        `);
        await queryRunner.query(`
            ALTER TABLE "reactory_calendar_recurrence_pattern" ADD "client_key" character varying(255)
        `);
        await queryRunner.query(`
            ALTER TABLE "reactory_calendar_workflow_trigger" ADD "client_key" character varying(255)
        `);
        await queryRunner.query(`
            ALTER TABLE "reactory_calendar_service_trigger" ADD "client_key" character varying(255)
        `);
        // Backfill. Children inherit their parent's tenant where the link exists.
        await queryRunner.query(`UPDATE "reactory_calendar" SET "client_key" = $1 WHERE "client_key" IS NULL`, [key]);
        await queryRunner.query(`
            UPDATE "reactory_calendar_entry" e SET "client_key" = c."client_key"
            FROM "reactory_calendar" c WHERE e."calendar_id" = c."id" AND e."client_key" IS NULL
        `);
        await queryRunner.query(`
            UPDATE "reactory_calendar_participant" x SET "client_key" = e."client_key"
            FROM "reactory_calendar_entry" e WHERE x."entry_id" = e."id" AND x."client_key" IS NULL
        `);
        await queryRunner.query(`
            UPDATE "reactory_calendar_workflow_trigger" x SET "client_key" = e."client_key"
            FROM "reactory_calendar_entry" e WHERE x."entry_id" = e."id" AND x."client_key" IS NULL
        `);
        await queryRunner.query(`
            UPDATE "reactory_calendar_service_trigger" x SET "client_key" = e."client_key"
            FROM "reactory_calendar_entry" e WHERE x."entry_id" = e."id" AND x."client_key" IS NULL
        `);
        await queryRunner.query(`UPDATE "reactory_calendar" SET "client_key" = $1 WHERE "client_key" IS NULL`, [key]);
        await queryRunner.query(`UPDATE "reactory_calendar_entry" SET "client_key" = $1 WHERE "client_key" IS NULL`, [key]);
        await queryRunner.query(`UPDATE "reactory_calendar_participant" SET "client_key" = $1 WHERE "client_key" IS NULL`, [key]);
        await queryRunner.query(`UPDATE "reactory_calendar_recurrence_pattern" SET "client_key" = $1 WHERE "client_key" IS NULL`, [key]);
        await queryRunner.query(`UPDATE "reactory_calendar_workflow_trigger" SET "client_key" = $1 WHERE "client_key" IS NULL`, [key]);
        await queryRunner.query(`UPDATE "reactory_calendar_service_trigger" SET "client_key" = $1 WHERE "client_key" IS NULL`, [key]);
        await queryRunner.query(`UPDATE "reactory_form_submission" SET "client_key" = $1 WHERE "client_key" IS NULL`, [key]);
        // Contract: every tenant-owned row now has an owner.
        await queryRunner.query(`
            ALTER TABLE "reactory_calendar" ALTER COLUMN "client_key" SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "reactory_calendar_entry" ALTER COLUMN "client_key" SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "reactory_calendar_participant" ALTER COLUMN "client_key" SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "reactory_calendar_recurrence_pattern" ALTER COLUMN "client_key" SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "reactory_calendar_workflow_trigger" ALTER COLUMN "client_key" SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "reactory_calendar_service_trigger" ALTER COLUMN "client_key" SET NOT NULL
        `);
        await queryRunner.query(`
            ALTER TABLE "reactory_form_submission" ALTER COLUMN "client_key" SET NOT NULL
        `);
        await queryRunner.query(`
            DROP INDEX IF EXISTS "public"."IDX_470311df0ea7d964856f859988"
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_92dfbc61d2fbc784a3d9e481b8" ON "reactory_audit" ("client_key")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_470311df0ea7d964856f859988" ON "reactory_form_submission" ("client_key", "fqn", "created_at")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_3445b44351a038fcd2031e6880" ON "reactory_calendar" ("client_key")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_82b204cb894e3cef549076771a" ON "reactory_calendar_entry" ("client_key")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_900aab2f18a5021f1a7d3ecacb" ON "reactory_calendar_participant" ("client_key")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_40ad3a10276ce27a6365c0dae4" ON "reactory_calendar_recurrence_pattern" ("client_key")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_661a3a68d616306b3f6babba54" ON "reactory_calendar_workflow_trigger" ("client_key")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_546f9d075917135e9b98871380" ON "reactory_calendar_service_trigger" ("client_key")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP INDEX "public"."IDX_546f9d075917135e9b98871380"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_661a3a68d616306b3f6babba54"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_40ad3a10276ce27a6365c0dae4"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_900aab2f18a5021f1a7d3ecacb"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_82b204cb894e3cef549076771a"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_3445b44351a038fcd2031e6880"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_470311df0ea7d964856f859988"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_92dfbc61d2fbc784a3d9e481b8"
        `);
        await queryRunner.query(`
            ALTER TABLE "reactory_form_submission"
            ALTER COLUMN "client_key" DROP NOT NULL
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_470311df0ea7d964856f859988" ON "reactory_form_submission" ("client_key", "created_at", "fqn")
        `);
        await queryRunner.query(`
            ALTER TABLE "reactory_calendar_service_trigger" DROP COLUMN "client_key"
        `);
        await queryRunner.query(`
            ALTER TABLE "reactory_calendar_workflow_trigger" DROP COLUMN "client_key"
        `);
        await queryRunner.query(`
            ALTER TABLE "reactory_calendar_recurrence_pattern" DROP COLUMN "client_key"
        `);
        await queryRunner.query(`
            ALTER TABLE "reactory_calendar_participant" DROP COLUMN "client_key"
        `);
        await queryRunner.query(`
            ALTER TABLE "reactory_calendar_entry" DROP COLUMN "client_key"
        `);
        await queryRunner.query(`
            ALTER TABLE "reactory_calendar" DROP COLUMN "client_key"
        `);
        await queryRunner.query(`
            ALTER TABLE "reactory_audit" DROP COLUMN "client_key"
        `);
    }

}
