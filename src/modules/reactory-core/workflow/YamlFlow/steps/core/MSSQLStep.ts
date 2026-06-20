/**
 * MSSQLStep - execute a Microsoft SQL Server query via the Reactory SQL service.
 * Placeholders use `@p0..@pn`. See SqlStep for the full config shape.
 */

import { SqlStep, SqlEngine } from './SqlStep';

export class MSSQLStep extends SqlStep {
  public readonly stepType = 'mssql';

  protected readonly engine: SqlEngine = 'mssql';
}
