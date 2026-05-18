import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateReactoryCalendarTables20260516031000 implements MigrationInterface {
  name = "CreateReactoryCalendarTables20260516031000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE reactory_calendar_visibility_enum AS ENUM ('private', 'shared', 'application', 'organization', 'public');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE reactory_calendar_entry_status_enum AS ENUM ('draft', 'confirmed', 'cancelled', 'completed');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE reactory_calendar_entry_priority_enum AS ENUM ('low', 'normal', 'high', 'urgent');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE reactory_calendar_participant_role_enum AS ENUM ('organizer', 'required', 'optional', 'resource');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE reactory_calendar_rsvp_status_enum AS ENUM ('pending', 'accepted', 'declined', 'tentative');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE reactory_calendar_recurrence_frequency_enum AS ENUM ('daily', 'weekly', 'monthly', 'yearly');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await queryRunner.query(`DO $$ BEGIN
      CREATE TYPE reactory_calendar_trigger_type_enum AS ENUM ('on_create', 'on_update', 'on_delete', 'time_based', 'participant_response');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reactory_calendar (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        color VARCHAR(7) NULL,
        visibility reactory_calendar_visibility_enum NOT NULL DEFAULT 'private',
        owner_id VARCHAR NOT NULL,
        client_id VARCHAR NULL,
        organization_id VARCHAR NULL,
        business_unit_id VARCHAR NULL,
        allowed_user_ids JSON NULL,
        allowed_team_ids JSON NULL,
        is_default BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        time_zone VARCHAR(50) NOT NULL DEFAULT 'UTC',
        working_hours JSON NULL,
        settings JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        created_by VARCHAR NOT NULL,
        updated_by VARCHAR NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reactory_calendar_entry (
        id SERIAL PRIMARY KEY,
        calendar_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        location VARCHAR(500) NULL,
        start_date TIMESTAMPTZ NOT NULL,
        end_date TIMESTAMPTZ NOT NULL,
        time_zone VARCHAR(50) NOT NULL,
        is_all_day BOOLEAN NOT NULL DEFAULT false,
        recurrence JSON NULL,
        organizer_id VARCHAR NOT NULL,
        status reactory_calendar_entry_status_enum NOT NULL DEFAULT 'confirmed',
        priority reactory_calendar_entry_priority_enum NOT NULL DEFAULT 'normal',
        category VARCHAR(100) NULL,
        tags JSON NULL,
        attachment_ids JSON NULL,
        workflow_trigger JSON NULL,
        service_trigger JSON NULL,
        metadata JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now(),
        created_by VARCHAR NOT NULL,
        updated_by VARCHAR NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reactory_calendar_participant (
        id SERIAL PRIMARY KEY,
        entry_id INTEGER NOT NULL,
        user_id VARCHAR NOT NULL,
        role reactory_calendar_participant_role_enum NOT NULL DEFAULT 'optional',
        status reactory_calendar_rsvp_status_enum NOT NULL DEFAULT 'pending',
        invited_at TIMESTAMPTZ NOT NULL,
        responded_at TIMESTAMPTZ NULL,
        notes TEXT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reactory_calendar_recurrence_pattern (
        id SERIAL PRIMARY KEY,
        frequency reactory_calendar_recurrence_frequency_enum NOT NULL,
        interval INTEGER NOT NULL DEFAULT 1,
        end_date TIMESTAMPTZ NULL,
        count INTEGER NULL,
        by_day JSON NULL,
        by_month JSON NULL,
        by_month_day JSON NULL,
        exceptions JSON NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reactory_calendar_service_trigger (
        id SERIAL PRIMARY KEY,
        entry_id INTEGER NOT NULL,
        service_id VARCHAR NOT NULL,
        service_version VARCHAR NOT NULL,
        method VARCHAR NOT NULL,
        trigger_type reactory_calendar_trigger_type_enum NOT NULL,
        trigger_offset INTEGER NULL,
        parameters JSON NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reactory_calendar_workflow_trigger (
        id SERIAL PRIMARY KEY,
        entry_id INTEGER NOT NULL,
        workflow_id VARCHAR NOT NULL,
        workflow_version VARCHAR NOT NULL,
        trigger_type reactory_calendar_trigger_type_enum NOT NULL,
        trigger_offset INTEGER NULL,
        parameters JSON NULL
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_owner_visibility_active ON reactory_calendar (owner_id, visibility, is_active)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_client_visibility_active ON reactory_calendar (client_id, visibility, is_active)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_org_visibility_active ON reactory_calendar (organization_id, visibility, is_active)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_active_created_at ON reactory_calendar (is_active, created_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_owner_default ON reactory_calendar (owner_id, is_default)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_owner_id ON reactory_calendar (owner_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_client_id ON reactory_calendar (client_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_organization_id ON reactory_calendar (organization_id)`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_entry_calendar_range ON reactory_calendar_entry (calendar_id, start_date, end_date)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_entry_organizer_status ON reactory_calendar_entry (organizer_id, status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_entry_date_range ON reactory_calendar_entry (start_date, end_date)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_entry_status_start ON reactory_calendar_entry (status, start_date)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_entry_calendar_status_start ON reactory_calendar_entry (calendar_id, status, start_date)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_entry_calendar_id ON reactory_calendar_entry (calendar_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_entry_start_date ON reactory_calendar_entry (start_date)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_entry_end_date ON reactory_calendar_entry (end_date)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_entry_organizer_id ON reactory_calendar_entry (organizer_id)`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_participant_entry_user ON reactory_calendar_participant (entry_id, user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_participant_user_status ON reactory_calendar_participant (user_id, status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_participant_entry_status ON reactory_calendar_participant (entry_id, status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_participant_invited_at ON reactory_calendar_participant (invited_at)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_participant_entry_id ON reactory_calendar_participant (entry_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_participant_user_id ON reactory_calendar_participant (user_id)`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_recurrence_frequency_interval ON reactory_calendar_recurrence_pattern (frequency, interval)`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_service_entry_trigger ON reactory_calendar_service_trigger (entry_id, trigger_type)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_service_service_version ON reactory_calendar_service_trigger (service_id, service_version)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_service_entry_id ON reactory_calendar_service_trigger (entry_id)`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_workflow_entry_trigger ON reactory_calendar_workflow_trigger (entry_id, trigger_type)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_workflow_workflow_version ON reactory_calendar_workflow_trigger (workflow_id, workflow_version)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS IDX_reactory_calendar_workflow_entry_id ON reactory_calendar_workflow_trigger (entry_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_workflow_entry_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_workflow_workflow_version`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_workflow_entry_trigger`);

    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_service_entry_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_service_service_version`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_service_entry_trigger`);

    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_recurrence_frequency_interval`);

    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_participant_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_participant_entry_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_participant_invited_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_participant_entry_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_participant_user_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_participant_entry_user`);

    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_entry_organizer_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_entry_end_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_entry_start_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_entry_calendar_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_entry_calendar_status_start`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_entry_status_start`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_entry_date_range`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_entry_organizer_status`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_entry_calendar_range`);

    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_organization_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_client_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_owner_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_owner_default`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_active_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_org_visibility_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_client_visibility_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_calendar_owner_visibility_active`);

    await queryRunner.query(`DROP TABLE IF EXISTS reactory_calendar_workflow_trigger`);
    await queryRunner.query(`DROP TABLE IF EXISTS reactory_calendar_service_trigger`);
    await queryRunner.query(`DROP TABLE IF EXISTS reactory_calendar_recurrence_pattern`);
    await queryRunner.query(`DROP TABLE IF EXISTS reactory_calendar_participant`);
    await queryRunner.query(`DROP TABLE IF EXISTS reactory_calendar_entry`);
    await queryRunner.query(`DROP TABLE IF EXISTS reactory_calendar`);

    await queryRunner.query(`DROP TYPE IF EXISTS reactory_calendar_trigger_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS reactory_calendar_recurrence_frequency_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS reactory_calendar_rsvp_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS reactory_calendar_participant_role_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS reactory_calendar_entry_priority_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS reactory_calendar_entry_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS reactory_calendar_visibility_enum`);
  }
}
