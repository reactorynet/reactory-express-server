import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/**
 * What model-level query helpers query through (WP-B2). Services pass the
 * TenantRepository from getTenantRepository(context, Entity); an unscoped
 * caller must pass `tenantRepository.unsafeUnscoped(reason)` explicitly.
 * Alias-free and type-only, so entity files can import it.
 */
export interface QuerySource<T extends ObjectLiteral> {
  createQueryBuilder(alias: string): SelectQueryBuilder<T>;
  find(options?: any): Promise<T[]>;
  findOne(options: any): Promise<T | null>;
  update(criteria: any, partial: any): Promise<any>;
  delete(criteria: any): Promise<any>;
  count(options?: any): Promise<number>;
}
