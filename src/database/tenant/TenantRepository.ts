/**
 * Tenant row scoping for TypeORM entities (WP-B2).
 *
 * Every tenant-owned Postgres table carries its own `client_key` column: the
 * `key` of the ReactoryClient (tenant) that owns the row. The value comes only
 * from the request context (`context.partner.key`), never from caller input.
 *
 * `getTenantRepository(context, Entity)` returns a TenantRepository that:
 *   - adds `client_key = <tenant>` to every find / count / exists
 *   - stamps `client_key` on save and refuses rows that belong to another tenant
 *   - scopes update / delete criteria and refuses to move a row between tenants
 *   - returns query builders that already filter on the tenant; a later
 *     `.where()` becomes `.andWhere()`, and a top-level `.orWhere()` throws
 *     because it would escape the filter (use `Brackets` instead)
 *
 * Deliberate escapes:
 *   - `unsafeUnscoped(reason)` returns the raw repository and logs a warning
 *     with the caller, for system jobs and migrations
 *   - `getCrossTenantRepository(context, Entity, keys)` reads across tenants (read-only) and requires the
 *     CROSS_TENANT role (for example staff who work across Zepz brands)
 *
 * Mark a tenant-owned column with `@ClientKeyColumn()` (or extend
 * `TenantScopedEntity`). Entities without it are not tenant-scoped, and
 * getTenantRepository refuses them rather than silently returning everything.
 */

import {
  Brackets,
  DataSource,
  DeepPartial,
  EntityManager,
  EntityTarget,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  In,
  ObjectLiteral,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import logger from '@reactory/server-core/logging';

import { CLIENT_KEY_COLUMN, CLIENT_KEY_PROPERTY, CROSS_TENANT_ROLE } from './constants';

export { CLIENT_KEY_COLUMN, CLIENT_KEY_PROPERTY, CROSS_TENANT_ROLE };

export class TenantScopeError extends Error {
  constructor(message: string, public readonly meta: Record<string, unknown> = {}) {
    super(message);
    this.name = 'TenantScopeError';
  }
}

// ── data source registry ─────────────────────────────────────────────────────

const dataSources = new Set<DataSource>();

/**
 * Register a DataSource so getTenantRepository can find the one that owns an
 * entity. Each module that defines a Postgres DataSource registers it.
 */
export const registerTenantDataSource = (dataSource: DataSource): void => {
  dataSources.add(dataSource);
};

export const dataSourceFor = (entity: EntityTarget<any>): DataSource => {
  for (const dataSource of dataSources) {
    if (dataSource.isInitialized && dataSource.hasMetadata(entity)) return dataSource;
  }
  const name = typeof entity === 'function' ? entity.name : String(entity);
  throw new TenantScopeError(`No initialized DataSource owns the entity ${name}`, { entity: name });
};

export const isTenantScoped = (repository: Repository<any>): boolean =>
  !!repository.metadata.findColumnWithPropertyName(CLIENT_KEY_PROPERTY);

// ── scope helpers ────────────────────────────────────────────────────────────

type Where<T> = FindOptionsWhere<T> | FindOptionsWhere<T>[];

/**
 * Merge the tenant scope into a find-style where. A caller that names the same
 * tenant is fine; one that names a different tenant is a bug in the caller,
 * so it throws instead of quietly answering with this tenant's rows.
 */
const scopeWhere = <T>(where: Where<T> | undefined, scope: unknown, allowed: string[]): Where<T> => {
  const clause = { [CLIENT_KEY_PROPERTY]: scope } as FindOptionsWhere<T>;
  const check = (w: any) => {
    const named = w?.[CLIENT_KEY_PROPERTY];
    if (named !== undefined && (typeof named !== 'string' || !allowed.includes(named))) {
      throw new TenantScopeError('A tenant-scoped query cannot name another client', { clientKey: named });
    }
  };
  if (!where) return clause;
  if (Array.isArray(where)) {
    where.forEach(check);
    return where.length === 0 ? clause : where.map((w) => ({ ...w, ...clause }));
  }
  check(where);
  return { ...where, ...clause };
};

const callerOf = (): string => {
  const lines = (new Error().stack || '').split('\n').slice(3, 4);
  return lines.map((l) => l.trim()).join(' ');
};

/**
 * A query builder whose tenant condition cannot be replaced or bypassed by
 * the caller's own where clauses.
 */
const scopedQueryBuilder = <T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  alias: string,
  scopeSql: string,
  params: Record<string, unknown>,
): SelectQueryBuilder<T> => {
  qb.where(scopeSql, params);
  return new Proxy(qb, {
    get(target, prop, receiver) {
      if (prop === 'where') {
        return (...args: any[]) => {
          (target.andWhere as any)(...args);
          return receiver;
        };
      }
      if (prop === 'delete' || prop === 'update' || prop === 'softDelete' || prop === 'restore' || prop === 'insert') {
        return () => {
          throw new TenantScopeError(
            `${String(prop)}() on a tenant-scoped query builder (${alias}) creates a new builder whose where() would replace the tenant filter; use the TenantRepository ${String(prop) === 'insert' ? 'insert/save' : String(prop)} method instead.`,
            { alias },
          );
        };
      }
      if (prop === 'orWhere') {
        return () => {
          throw new TenantScopeError(
            `A top-level orWhere on a tenant-scoped query (${alias}) would escape the tenant filter; wrap the OR in Brackets and use andWhere.`,
            { alias },
          );
        };
      }
      const value = Reflect.get(target, prop, target);
      if (typeof value !== 'function') return value;
      return (...args: any[]) => {
        const result = value.apply(target, args);
        // Keep chaining through the proxy so later where/orWhere stay guarded.
        return result === target ? receiver : result;
      };
    },
  });
};

// ── repository ───────────────────────────────────────────────────────────────

export class TenantRepository<T extends ObjectLiteral> {
  private readonly scope: unknown;

  constructor(
    private readonly repository: Repository<T>,
    private readonly clientKeys: string[],
  ) {
    if (!isTenantScoped(repository)) {
      throw new TenantScopeError(
        `${repository.metadata.name} is not tenant-scoped (no ${CLIENT_KEY_PROPERTY} column)`,
        { entity: repository.metadata.name },
      );
    }
    if (clientKeys.length === 0) {
      throw new TenantScopeError('A tenant repository needs at least one client key');
    }
    this.scope = clientKeys.length === 1 ? clientKeys[0] : In(clientKeys);
  }

  get metadata() {
    return this.repository.metadata;
  }

  /** The single tenant this repository writes for. */
  get clientKey(): string {
    if (this.clientKeys.length !== 1) {
      throw new TenantScopeError('A cross-tenant repository is read-only', { clientKeys: this.clientKeys });
    }
    return this.clientKeys[0];
  }

  // reads

  find(options: FindManyOptions<T> = {}): Promise<T[]> {
    return this.repository.find({ ...options, where: scopeWhere(options.where as Where<T>, this.scope, this.clientKeys) });
  }

  findBy(where: Where<T>): Promise<T[]> {
    return this.repository.findBy(scopeWhere(where, this.scope, this.clientKeys));
  }

  findAndCount(options: FindManyOptions<T> = {}): Promise<[T[], number]> {
    return this.repository.findAndCount({ ...options, where: scopeWhere(options.where as Where<T>, this.scope, this.clientKeys) });
  }

  findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne({ ...options, where: scopeWhere(options.where as Where<T>, this.scope, this.clientKeys) });
  }

  findOneBy(where: Where<T>): Promise<T | null> {
    return this.repository.findOneBy(scopeWhere(where, this.scope, this.clientKeys));
  }

  async findOneOrFail(options: FindOneOptions<T>): Promise<T> {
    return this.repository.findOneOrFail({ ...options, where: scopeWhere(options.where as Where<T>, this.scope, this.clientKeys) });
  }

  count(options: FindManyOptions<T> = {}): Promise<number> {
    return this.repository.count({ ...options, where: scopeWhere(options.where as Where<T>, this.scope, this.clientKeys) });
  }

  countBy(where: Where<T>): Promise<number> {
    return this.repository.countBy(scopeWhere(where, this.scope, this.clientKeys));
  }

  exists(options: FindManyOptions<T> = {}): Promise<boolean> {
    return this.repository.exists({ ...options, where: scopeWhere(options.where as Where<T>, this.scope, this.clientKeys) });
  }

  existsBy(where: Where<T>): Promise<boolean> {
    return this.repository.existsBy(scopeWhere(where, this.scope, this.clientKeys));
  }

  createQueryBuilder(alias: string): SelectQueryBuilder<T> {
    const param = '__reactoryTenantScope';
    const sql = Array.isArray(this.clientKeys) && this.clientKeys.length > 1
      ? `${alias}.${CLIENT_KEY_PROPERTY} IN (:...${param})`
      : `${alias}.${CLIENT_KEY_PROPERTY} = :${param}`;
    const value = this.clientKeys.length > 1 ? this.clientKeys : this.clientKeys[0];
    return scopedQueryBuilder(this.repository.createQueryBuilder(alias), alias, sql, { [param]: value });
  }

  // writes

  create(entityLike: DeepPartial<T> = {} as DeepPartial<T>): T {
    return this.repository.create({ ...entityLike, [CLIENT_KEY_PROPERTY]: this.clientKey } as DeepPartial<T>);
  }

  private stamp(entity: any): void {
    const current = entity?.[CLIENT_KEY_PROPERTY];
    if (current !== undefined && current !== null && current !== this.clientKey) {
      throw new TenantScopeError(
        `Refusing to write a ${this.metadata.name} row that belongs to another client`,
        { entity: this.metadata.name, rowClientKey: current, clientKey: this.clientKey },
      );
    }
    entity[CLIENT_KEY_PROPERTY] = this.clientKey;
  }

  async save<E extends DeepPartial<T>>(entity: E): Promise<E & T>;
  async save<E extends DeepPartial<T>>(entities: E[]): Promise<(E & T)[]>;
  async save(entityOrEntities: any): Promise<any> {
    const list = Array.isArray(entityOrEntities) ? entityOrEntities : [entityOrEntities];
    list.forEach((entity) => this.stamp(entity));
    // An existing row id supplied by the caller must already be this tenant's.
    const primary = this.metadata.primaryColumns.map((c) => c.propertyName);
    for (const entity of list) {
      const id = primary.reduce((acc, key) => (entity[key] !== undefined ? { ...acc, [key]: entity[key] } : acc), {} as Record<string, unknown>);
      if (Object.keys(id).length === primary.length) {
        const owner = await this.repository.findOne({ where: id as any, select: [...primary, CLIENT_KEY_PROPERTY] as any });
        if (owner && (owner as any)[CLIENT_KEY_PROPERTY] !== this.clientKey) {
          throw new TenantScopeError(`Refusing to overwrite a ${this.metadata.name} row that belongs to another client`, { id });
        }
      }
    }
    return this.repository.save(entityOrEntities);
  }

  private criteria(criteria: unknown): Where<T> {
    if (criteria === undefined || criteria === null || criteria === '') {
      throw new TenantScopeError('Empty criteria are not allowed on a tenant-scoped update or delete');
    }
    if (typeof criteria === 'string' || typeof criteria === 'number' || criteria instanceof Date) {
      const [primary] = this.metadata.primaryColumns;
      return scopeWhere({ [primary.propertyName]: criteria } as FindOptionsWhere<T>, this.clientKey, [this.clientKey]);
    }
    if (Array.isArray(criteria) && criteria.every((c) => typeof c !== 'object')) {
      const [primary] = this.metadata.primaryColumns;
      return scopeWhere({ [primary.propertyName]: In(criteria) } as FindOptionsWhere<T>, this.clientKey, [this.clientKey]);
    }
    return scopeWhere(criteria as Where<T>, this.clientKey, [this.clientKey]);
  }

  /** Insert without the existing-row check of save(); rows are stamped first. */
  insert(entityOrEntities: DeepPartial<T> | DeepPartial<T>[]) {
    const list = Array.isArray(entityOrEntities) ? entityOrEntities : [entityOrEntities];
    list.forEach((entity) => this.stamp(entity));
    return this.repository.insert(entityOrEntities as any);
  }

  update(criteria: unknown, partial: Partial<T>) {
    const changes: any = { ...partial };
    if (CLIENT_KEY_PROPERTY in changes && changes[CLIENT_KEY_PROPERTY] !== this.clientKey) {
      throw new TenantScopeError(`Refusing to move ${this.metadata.name} rows to another client`, {
        entity: this.metadata.name,
      });
    }
    delete changes[CLIENT_KEY_PROPERTY];
    return this.repository.update(this.criteria(criteria) as any, changes);
  }

  delete(criteria: unknown) {
    return this.repository.delete(this.criteria(criteria) as any);
  }

  async remove(entity: T): Promise<T>;
  async remove(entities: T[]): Promise<T[]>;
  async remove(entityOrEntities: any): Promise<any> {
    const list = Array.isArray(entityOrEntities) ? entityOrEntities : [entityOrEntities];
    list.forEach((entity) => {
      if (entity?.[CLIENT_KEY_PROPERTY] !== this.clientKey) {
        throw new TenantScopeError(`Refusing to remove a ${this.metadata.name} row that belongs to another client`);
      }
    });
    return this.repository.remove(entityOrEntities);
  }

  // escapes

  /** The raw repository, without tenant scoping. Logged with the caller. */
  unsafeUnscoped(reason: string): Repository<T> {
    logger.warn(`[tenant] unscoped access to ${this.metadata.name}: ${reason} (${callerOf()})`);
    return this.repository;
  }
}

// ── entry points ─────────────────────────────────────────────────────────────

interface ContextLike {
  partner?: { key?: string } | null;
  hasRole?: (role: string, ...rest: any[]) => boolean;
}

/**
 * The tenant repository for an entity, scoped to `context.partner.key`.
 * Throws when the context has no partner: a request without a tenant must
 * not read or write tenant data by accident (system jobs use
 * `unsafeUnscoped` or a context carrying the partner they act for).
 */
export const getTenantRepository = <T extends ObjectLiteral>(
  context: ContextLike,
  entity: EntityTarget<T>,
  repository?: Repository<T>,
): TenantRepository<T> => {
  const clientKey = context?.partner?.key;
  if (!clientKey) {
    throw new TenantScopeError('Tenant data requires a request context with a partner (ReactoryClient)');
  }
  const repo = repository ?? dataSourceFor(entity).getRepository(entity);
  return new TenantRepository<T>(repo, [clientKey]);
};

/**
 * A read-only repository across several tenants. Requires CROSS_TENANT on
 * the request's partner.
 */
export const getCrossTenantRepository = <T extends ObjectLiteral>(
  context: ContextLike,
  entity: EntityTarget<T>,
  clientKeys: string[],
  repository?: Repository<T>,
): TenantRepository<T> => {
  if (context?.hasRole?.(CROSS_TENANT_ROLE) !== true) {
    throw new TenantScopeError(`Reading across tenants requires the ${CROSS_TENANT_ROLE} role`, { clientKeys });
  }
  const repo = repository ?? dataSourceFor(entity).getRepository(entity);
  return new TenantRepository<T>(repo, Array.from(new Set(clientKeys)));
};

/**
 * Tenant-scoped access inside a transaction. EntityManager calls
 * (`manager.save(Entity, row)`, `manager.findOne(Entity, ...)`) bypass any
 * repository wrapper; this gives transactional code the same scoped
 * operations, running on the transaction's connection.
 */
export const tenantManager = (context: ContextLike, manager: EntityManager) => {
  const repo = <T extends ObjectLiteral>(entity: EntityTarget<T>) =>
    getTenantRepository<T>(context, entity, manager.getRepository(entity));
  return {
    create: <T extends ObjectLiteral>(entity: EntityTarget<T>, data: DeepPartial<T> = {} as DeepPartial<T>): T => repo(entity).create(data),
    save: <T extends ObjectLiteral>(entity: EntityTarget<T>, row: any) => repo(entity).save(row),
    insert: <T extends ObjectLiteral>(entity: EntityTarget<T>, rows: any) => repo(entity).insert(rows),
    find: <T extends ObjectLiteral>(entity: EntityTarget<T>, options: FindManyOptions<T> = {}) => repo(entity).find(options),
    findOne: <T extends ObjectLiteral>(entity: EntityTarget<T>, options: FindOneOptions<T>) => repo(entity).findOne(options),
    update: <T extends ObjectLiteral>(entity: EntityTarget<T>, criteria: unknown, partial: Partial<T>) => repo(entity).update(criteria, partial),
    delete: <T extends ObjectLiteral>(entity: EntityTarget<T>, criteria: unknown) => repo(entity).delete(criteria),
    repository: repo,
  };
};

export { Brackets };
