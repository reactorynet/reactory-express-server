/**
 * Column convention for tenant-owned rows (WP-B2): property `clientKey`,
 * column `client_key`, the owning ReactoryClient's `key`, indexed.
 *
 * `nullable: true` is for the expand step of a migration only (add the
 * column, backfill, then tighten); new tables declare it NOT NULL.
 */
import { Column, Index } from 'typeorm';
import { CLIENT_KEY_COLUMN } from './constants';

export interface ClientKeyColumnOptions {
  nullable?: boolean;
}

export function ClientKeyColumn(options: ClientKeyColumnOptions = {}): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    Column({ name: CLIENT_KEY_COLUMN, type: 'varchar', length: 255, nullable: options.nullable ?? false })(target, propertyKey);
    Index()(target, propertyKey);
  };
}

/** Base class for new tenant-owned entities. */
export abstract class TenantScopedEntity {
  @ClientKeyColumn()
  clientKey!: string;
}
