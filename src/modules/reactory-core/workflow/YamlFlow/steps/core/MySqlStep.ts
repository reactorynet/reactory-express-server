/**
 * MySqlStep - execute a MySQL query via the Reactory SQL service.
 * Placeholders use `?`. See SqlStep for the full config shape.
 */

import { SqlStep, SqlEngine } from './SqlStep';

export class MySqlStep extends SqlStep {
  public readonly stepType = 'mysql';

  protected readonly engine: SqlEngine = 'mysql';
}
