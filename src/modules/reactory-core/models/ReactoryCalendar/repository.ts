import type { ObjectLiteral, SelectQueryBuilder } from "typeorm";

/**
 * What the calendar model helpers query through (WP-B2).
 *
 * The static helpers on the calendar entities used to query the whole table
 * through BaseEntity (`this.find`, `this.createQueryBuilder`), which no tenant
 * filter can reach. They now take the repository to use: services pass the
 * TenantRepository from getTenantRepository(context, Entity); an unscoped
 * caller has to pass `tenantRepo.unsafeUnscoped(reason)` explicitly.
 */
export interface CalendarRepository<T extends ObjectLiteral> {
  createQueryBuilder(alias: string): SelectQueryBuilder<T>;
  find(options?: any): Promise<T[]>;
  findOne(options: any): Promise<T | null>;
  update(criteria: any, partial: any): Promise<any>;
  delete(criteria: any): Promise<any>;
  insert(entities: any): Promise<any>;
  create(entityLike?: any): T;
}
