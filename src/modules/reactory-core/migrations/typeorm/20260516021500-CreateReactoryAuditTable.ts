import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateReactoryAuditTable20260516021500 implements MigrationInterface {
  name = "CreateReactoryAuditTable20260516021500";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reactory_audit (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        action VARCHAR(255) NOT NULL,
        source VARCHAR(255) NOT NULL,
        signature VARCHAR(255) NOT NULL,
        before TEXT NULL,
        after TEXT NULL,
        actor_type VARCHAR(100) NULL,
        actor_id VARCHAR(255) NULL,
        resource_type VARCHAR(100) NULL,
        resource_id VARCHAR(255) NULL,
        event_type VARCHAR(100) NULL,
        metadata TEXT NULL,
        ip_address VARCHAR(100) NULL,
        user_agent VARCHAR(500) NULL,
        session_id VARCHAR(255) NULL,
        success BOOLEAN NOT NULL DEFAULT true,
        error_message TEXT NULL,
        organization_id VARCHAR(255) NULL,
        module_name VARCHAR(255) NULL,
        module_version VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_reactory_audit_user_action_created_at ON reactory_audit (user_id, action, created_at)`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_reactory_audit_source_created_at ON reactory_audit (source, created_at)`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_reactory_audit_resource_type_resource_id ON reactory_audit (resource_type, resource_id)`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS IDX_reactory_audit_module_name_module_version ON reactory_audit (module_name, module_version)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_audit_module_name_module_version`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_audit_resource_type_resource_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_audit_source_created_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS IDX_reactory_audit_user_action_created_at`);
    await queryRunner.query(`DROP TABLE IF EXISTS reactory_audit`);
  }
}
