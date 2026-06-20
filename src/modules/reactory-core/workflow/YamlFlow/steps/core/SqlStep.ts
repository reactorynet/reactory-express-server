/**
 * SqlStep - shared base for relational-database workflow steps.
 *
 * Concrete steps (MySqlStep / PostgresSQLStep / MSSQLStep) only declare their
 * `stepType` and `engine`; all execution goes through the Reactory SQL service
 * (core.ReactorySQLService@1.0.0), which owns connection pooling — steps never
 * open raw driver connections themselves.
 *
 * Config shape (from YAML `inputs` JSON):
 *   sql:              "SELECT * FROM users WHERE status = ?"  (required)
 *   parameters:       ["active"]                              (optional positional params)
 *   connectionId:     "default"                               (optional — named connection from env)
 *   connection:       { host, port, user, password, database } (optional — explicit connection object)
 *   connectionString: "postgres://user:pass@host/db"          (optional — connection URL)
 *
 * Placeholder convention by engine: MySQL `?`, Postgres `$1..$n`, MSSQL `@p0..@pn`.
 *
 * Output: { rows, rowCount, fields }
 */

import { BaseYamlStep } from '../base/BaseYamlStep';
import { StepExecutionContext, StepExecutionResult, ValidationResult } from '../interfaces/IYamlStep';

export type SqlEngine = 'mysql' | 'postgres' | 'mssql';

export interface SqlStepConfig {
  /** SQL text with engine-appropriate placeholders. */
  sql: string;
  /** Positional parameters bound to the placeholders. */
  parameters?: any[];
  /** Named connection resolved from env (e.g. "default", "reporting"). */
  connectionId?: string;
  /** Explicit connection object passed to the driver. */
  connection?: Record<string, any>;
  /** Connection URL/DSN. */
  connectionString?: string;
  /** Whether step is enabled. */
  enabled?: boolean;
}

const SQL_SERVICE_ID = 'core.ReactorySQLService@1.0.0';

export abstract class SqlStep extends BaseYamlStep {
  /** Relational engine this step targets — set by the concrete subclass. */
  protected abstract readonly engine: SqlEngine;

  protected async executeStep(context: StepExecutionContext): Promise<StepExecutionResult> {
    const config = this.config as SqlStepConfig;

    if (!context.reactoryContext) {
      return {
        success: false,
        error: 'No Reactory context available — cannot execute SQL query',
        outputs: {},
        metadata: { engine: this.engine },
      };
    }

    const sql = this.resolveTemplate(config.sql, context);
    const parameters = Array.isArray(config.parameters)
      ? this.resolveParams(config.parameters, context)
      : [];
    const connectionId = config.connectionId
      ? this.resolveTemplate(config.connectionId, context)
      : undefined;
    const connectionString = config.connectionString
      ? this.resolveTemplate(config.connectionString, context)
      : undefined;
    const connection = config.connection ? this.resolveParams(config.connection, context) : undefined;

    const sqlService: any = this.getSqlService(context);
    if (!sqlService || typeof sqlService.query !== 'function') {
      return {
        success: false,
        error: `SQL service (${SQL_SERVICE_ID}) is not available — cannot execute ${this.engine} query`,
        outputs: {},
        metadata: { engine: this.engine },
      };
    }

    context.logger.info(
      `Executing ${this.engine} query (connection: ${connectionId || (connectionString || connection ? 'inline' : 'default')})`,
    );

    try {
      const result = await sqlService.query({
        engine: this.engine,
        connectionId,
        connection,
        connectionString,
        sql,
        parameters,
      });

      context.logger.info(`${this.engine} query returned ${result.rowCount} row(s)`);

      return {
        success: true,
        outputs: { rows: result.rows, rowCount: result.rowCount, fields: result.fields },
        metadata: { engine: this.engine, rowCount: result.rowCount },
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      context.logger.error(`${this.engine} query failed: ${message}`);
      return {
        success: false,
        error: message,
        outputs: {},
        metadata: { engine: this.engine },
      };
    }
  }

  public validateConfig(config: Record<string, any>): ValidationResult {
    const errors: string[] = [];
    if (!config.sql || typeof config.sql !== 'string') {
      errors.push('sql is required and must be a string');
    }
    if (config.parameters !== undefined && !Array.isArray(config.parameters)) {
      errors.push('parameters must be an array');
    }
    if (config.connection !== undefined && typeof config.connection !== 'object') {
      errors.push('connection must be an object');
    }
    return { valid: errors.length === 0, errors };
  }

  private getSqlService(context: StepExecutionContext): any {
    try {
      return context.reactoryContext.getService(SQL_SERVICE_ID);
    } catch {
      return null;
    }
  }

  /** Deep-resolve template strings inside params (arrays / objects / strings). */
  protected resolveParams(params: any, context: StepExecutionContext): any {
    if (typeof params === 'string') return this.resolveTemplate(params, context);
    if (Array.isArray(params)) return params.map((p) => this.resolveParams(p, context));
    if (params && typeof params === 'object') {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(params)) out[k] = this.resolveParams(v, context);
      return out;
    }
    return params;
  }
}
