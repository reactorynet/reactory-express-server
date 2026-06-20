/**
 * PostgresSQLStep - execute a PostgreSQL query via the Reactory SQL service.
 * Placeholders use `$1..$n`. See SqlStep for the full config shape.
 */

import { SqlStep, SqlEngine } from './SqlStep';

export class PostgresSQLStep extends SqlStep {
  public readonly stepType = 'postgres';

  protected readonly engine: SqlEngine = 'postgres';
}
