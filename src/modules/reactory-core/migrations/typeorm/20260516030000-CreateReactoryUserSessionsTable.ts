import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateReactoryUserSessionsTable20260516030000 implements MigrationInterface {
  name = "CreateReactoryUserSessionsTable20260516030000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reactory_user_sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        host VARCHAR(255) NULL,
        client_key VARCHAR(255) NULL,
        issuer VARCHAR(255) NULL,
        subject VARCHAR(255) NULL,
        audience VARCHAR(255) NULL,
        refresh_token VARCHAR(255) NULL,
        issued_at BIGINT NULL,
        expires_at BIGINT NULL,
        lifetime VARCHAR(50) NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        revoked_at TIMESTAMP NULL,
        revocation_reason VARCHAR(255) NULL,
        revoked_by VARCHAR(255) NULL,
        user_agent VARCHAR(500) NULL,
        ip_address VARCHAR(100) NULL,
        metadata TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS IDX_reactory_user_sessions_session_id ON reactory_user_sessions (session_id)`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_reactory_user_sessions_user_id_created_at ON reactory_user_sessions (user_id, created_at)`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_reactory_user_sessions_email_created_at ON reactory_user_sessions (email, created_at)`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_reactory_user_sessions_status_expires_at ON reactory_user_sessions (status, expires_at)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_user_sessions_status_expires_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_user_sessions_email_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_user_sessions_user_id_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_user_sessions_session_id`);
    await queryRunner.query(`DROP TABLE IF EXISTS reactory_user_sessions`);
  }
}
