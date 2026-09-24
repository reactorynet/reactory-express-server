import Reactory from '@reactorynet/reactory-core';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { service } from '@reactory/server-core/application/decorators/service';
import ApiError, { InsufficientPermissions } from '@reactory/server-core/exceptions';
import ReactoryFormSubmission from '../../models/ReactoryFormSubmission';
import { getTenantRepository } from '@reactory/server-core/database/tenant/TenantRepository';
import { PostgresDataSource } from '../../models';
import {
  ReactoryFormSubmissionConfig,
  ReactoryFormSubmissionFilter,
  ReactoryFormSubmissionListResult,
  ReactoryFormSubmissionPaging,
  ReactoryFormSubmissionResult,
  ReactoryFormSubmissionSort,
  ReactoryFormSubmissionStats,
} from '../../types/FormSubmission';
import { compileSubmissionFilter, parsePath } from './SubmissionFilter';
import { resolveSubmissionConfig } from './SubmissionConfig';
import type RateLimiterService from '../RateLimiterService';

const ALIAS = 'submission';
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 250;

export interface SubmitArgs {
  /** The fully qualified name of the form, i.e. `contact.Form@1.0.0`. */
  fqn: string;
  formData: Record<string, unknown>;
  /**
   * When present the existing submission is amended instead of a new row being
   * written. Only honoured when the form declares `submission.allowUpdate`.
   */
  id?: string;
}

/**
 * ReactoryFormSubmissionService - the storage and query side of the generic
 * form submission pipeline.
 *
 * Forms that declare a `submission` block do not ship a GraphQL mutation of
 * their own; `ReactoryFormService` injects the generic `ReactoryFormSubmit`
 * mutation into the resolved definition and it lands here. The service owns the
 * permission model for both writing and reading submissions so that the
 * resolver stays a thin transport layer.
 */
/**
 * What the service needs from its repository; satisfied by both the
 * TenantRepository (requests with a partner) and the raw one (CLI).
 */
interface SubmissionStore {
  create(entityLike: Partial<ReactoryFormSubmission>): ReactoryFormSubmission;
  save(entity: ReactoryFormSubmission): Promise<ReactoryFormSubmission>;
  findOne(options: { where: Record<string, unknown> }): Promise<ReactoryFormSubmission | null>;
  createQueryBuilder(alias: string): SelectQueryBuilder<ReactoryFormSubmission>;
  delete(criteria: Record<string, unknown>): Promise<unknown>;
}

@service({
  id: 'core.ReactoryFormSubmissionService@1.0.0',
  nameSpace: 'core',
  name: 'ReactoryFormSubmissionService',
  version: '1.0.0',
  description: 'Stores and queries submissions captured by the generic form submission pipeline',
  serviceType: 'data',
  lifeCycle: 'instance',
  dependencies: [
    { id: 'core.ReactoryFormService@1.0.0', alias: 'formService' },
    { id: 'core.RateLimiterService@1.0.0', alias: 'rateLimiter' },
  ],
})
export class ReactoryFormSubmissionService implements Reactory.Service.IReactoryDefaultService {

  name = 'ReactoryFormSubmissionService';
  nameSpace = 'core';
  version = '1.0.0';
  context: Reactory.Server.IReactoryContext;
  props: Reactory.Service.IReactoryServiceProps;

  // @ts-ignore
  private formService: Reactory.Service.IReactoryFormService;
  // @ts-ignore
  private rateLimiter: RateLimiterService;

  constructor(props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.props = props;
    this.context = context;
  }

  setFormService(formService: Reactory.Service.IReactoryFormService) {
    this.formService = formService;
  }

  setRateLimiter(rateLimiter: RateLimiterService) {
    this.rateLimiter = rateLimiter;
  }

  onStartup(): Promise<void> {
    return Promise.resolve();
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }

  setExecutionContext(context: Reactory.Server.IReactoryContext): boolean {
    this.context = context;
    return true;
  }

  /**
   * Tenant-scoped whenever the request has a partner (WP-B2): reads, updates
   * and deletes only ever see the request client's rows, and saves are stamped
   * with its key. A context without a partner (the CLI) reads across clients.
   */
  private get repository(): SubmissionStore {
    if (PostgresDataSource.isInitialized !== true) {
      throw new ApiError(
        'The Postgres data source is not initialised, form submissions are unavailable',
        { where: 'ReactoryFormSubmissionService' },
      );
    }
    const raw = PostgresDataSource.getRepository(ReactoryFormSubmission);
    return (this.clientKey ? getTenantRepository(this.context, ReactoryFormSubmission, raw) : raw) as SubmissionStore;
  }

  /**
   * Resolves the effective submission configuration for a form, applying the
   * documented defaults. Returns null when the form has not opted in.
   *
   * Opt in is always explicit: a form with no `submission` block, or one with
   * `enabled` set to anything but true, never writes to the submission table.
   */
  getSubmissionConfig(form: Reactory.Forms.IReactoryForm): ReactoryFormSubmissionConfig | null {
    return resolveSubmissionConfig(form);
  }

  /**
   * Loads the form and its submission config, failing when the form does not
   * exist or has not opted into the pipeline.
   */
  private async requireSubmissionForm(fqn: string): Promise<{
    form: Reactory.Forms.IReactoryForm;
    config: ReactoryFormSubmissionConfig;
  }> {
    if (!fqn || typeof fqn !== 'string') {
      throw new ApiError('A form fqn is required', { where: 'ReactoryFormSubmissionService' });
    }

    const form = await this.formService.get(fqn);
    if (!form) {
      throw new ApiError(`No form found with the id ${fqn}`, {
        where: 'ReactoryFormSubmissionService', fqn,
      });
    }

    const config = this.getSubmissionConfig(form);
    if (!config) {
      throw new ApiError(
        `The form ${fqn} does not use the generic submission pipeline. Add a "submission: { enabled: true }" block to its definition to enable it.`,
        { where: 'ReactoryFormSubmissionService', fqn },
      );
    }

    return { form, config };
  }

  private hasAnyRole(roles: string[]): boolean {
    // An empty role list is treated as "nobody", not "everybody" - the
    // resolved config always supplies a non empty default, so an empty array
    // here means the form deliberately locked the operation down.
    if (!roles || roles.length === 0) return false;
    return this.context.hasAnyRole(roles) === true;
  }

  private get currentUserId(): string | null {
    const user = this.context.user as unknown as { _id?: unknown; anon?: boolean };
    if (!user || user.anon === true || !user._id) return null;
    return user._id.toString();
  }

  private get clientKey(): string | null {
    const partner = this.context.partner as unknown as { key?: string };
    return partner?.key || null;
  }

  /**
   * Best effort extraction of the caller's remote address. `x-forwarded-for`
   * holds a comma separated chain when the request passed through proxies - the
   * left most entry is the original client.
   */
  private get remoteAddress(): string | null {
    const request = this.context.request as unknown as {
      ip?: string;
      headers?: Record<string, string | string[]>;
      socket?: { remoteAddress?: string };
    };
    if (!request) return null;

    const forwarded = request.headers?.['x-forwarded-for'];
    if (forwarded) {
      const chain = Array.isArray(forwarded) ? forwarded[0] : forwarded;
      const first = chain.split(',')[0]?.trim();
      if (first) return first.substring(0, 64);
    }

    const address = request.ip || request.socket?.remoteAddress;
    return address ? address.substring(0, 64) : null;
  }

  private toResult(entity: ReactoryFormSubmission): ReactoryFormSubmissionResult {
    return {
      id: entity.id,
      fqn: entity.fqn,
      clientKey: entity.clientKey,
      userId: entity.userId,
      formData: entity.formData || {},
      ipAddress: entity.ipAddress,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  /**
   * Applies the per remote address rate limit for a form. Anonymous forms are
   * limited by default because the mutation is reachable without credentials.
   */
  private async enforceRateLimit(fqn: string, config: ReactoryFormSubmissionConfig): Promise<void> {
    if (!config.rateLimit || !this.rateLimiter) return;

    const identifier = this.currentUserId || this.remoteAddress || 'unknown';
    const key = `form-submission:${fqn}:${identifier}`;
    const { max, windowSeconds } = config.rateLimit;

    const result = await this.rateLimiter.checkLimit(
      key, max, windowSeconds, this.currentUserId ? 'user' : 'ip', identifier,
    );

    if (result.allowed !== true) {
      throw new ApiError(
        `Too many submissions for ${fqn}. Try again in ${result.resetIn} seconds.`,
        { where: 'ReactoryFormSubmissionService.submit', fqn, resetIn: result.resetIn },
      );
    }
  }

  /**
   * Persists a submission for a form that has opted into the generic pipeline.
   */
  async submit(args: SubmitArgs): Promise<ReactoryFormSubmissionResult> {
    const { fqn, formData, id } = args;
    const { config } = await this.requireSubmissionForm(fqn);

    if (!this.clientKey) {
      throw new ApiError('A form submission must be made on behalf of a client', {
        where: 'ReactoryFormSubmissionService.submit', fqn,
      });
    }

    const userId = this.currentUserId;

    if (userId === null && config.allowAnonymous !== true) {
      throw new InsufficientPermissions(
        `The form ${fqn} does not accept anonymous submissions`,
        { where: 'ReactoryFormSubmissionService.submit', fqn },
      );
    }

    if (userId !== null && this.hasAnyRole(config?.submitRoles as string[]) !== true) {
      throw new InsufficientPermissions(
        `You do not have permission to submit ${fqn}`,
        { where: 'ReactoryFormSubmissionService.submit', fqn, submitRoles: config.submitRoles },
      );
    }

    if (formData === null || formData === undefined || typeof formData !== 'object') {
      throw new ApiError('formData must be an object', {
        where: 'ReactoryFormSubmissionService.submit', fqn,
      });
    }

    await this.enforceRateLimit(fqn, config);

    if (id) {
      return this.update(fqn, id, formData, config);
    }

    const entity = this.repository.create({
      fqn,
      // @ts-ignore
      clientKey: this.clientKey,
      // @ts-ignore
      userId,
      formData: formData as Record<string, unknown>,
      // @ts-ignore
      ipAddress: this.remoteAddress,
    });

    const saved = await this.repository.save(entity);

    this.context.log(
      `Captured submission ${saved.id} for ${fqn}`,
      { fqn, userId, submissionId: saved.id }, 'info', 'ReactoryFormSubmissionService');

    return this.toResult(saved);
  }

  /**
   * Amends an existing submission. Only the original submitter (when the form
   * allows updates) or a holder of a read role may do so.
   */
  private async update(
    fqn: string,
    id: string,
    formData: Record<string, unknown>,
    config: ReactoryFormSubmissionConfig,
  ): Promise<ReactoryFormSubmissionResult> {
    const existing = await this.repository.findOne({ where: { id } });

    if (!existing || existing.fqn !== fqn) {
      throw new ApiError(`No submission ${id} found for ${fqn}`, {
        where: 'ReactoryFormSubmissionService.update', fqn, id,
      });
    }

    if (this.clientKey && existing.clientKey !== this.clientKey) {
      throw new InsufficientPermissions('That submission belongs to another client', {
        where: 'ReactoryFormSubmissionService.update', id,
      });
    }

    const userId = this.currentUserId;
    const isOwner = userId !== null && existing.userId === userId;
    const isAdministrator = this.hasAnyRole(config?.readRoles as string[]);

    if (isAdministrator !== true) {
      if (config.allowUpdate !== true) {
        throw new InsufficientPermissions(
          `The form ${fqn} does not allow submissions to be amended`,
          { where: 'ReactoryFormSubmissionService.update', fqn, id },
        );
      }
      if (isOwner !== true) {
        throw new InsufficientPermissions('You may only amend your own submissions', {
          where: 'ReactoryFormSubmissionService.update', fqn, id,
        });
      }
    }

    existing.formData = formData;
    existing.ipAddress = this.remoteAddress || existing.ipAddress;
    const saved = await this.repository.save(existing);
    return this.toResult(saved);
  }

  /**
   * Builds the base query for a form's submissions with the tenant partition
   * and the date / user / search / structured filters applied.
   */
  private buildQuery(
    fqn: string,
    filter: ReactoryFormSubmissionFilter = {},
  ): SelectQueryBuilder<ReactoryFormSubmission> {
    const query = this.repository
      .createQueryBuilder(ALIAS)
      .where(`"${ALIAS}"."fqn" = :fqn`, { fqn });

    // Partitioned per ReactoryClient by the tenant repository (see the
    // repository getter); a request without a partner (the CLI) sees all.

    if (filter.from) {
      query.andWhere(`"${ALIAS}"."created_at" >= :from`, { from: new Date(filter.from) });
    }

    if (filter.to) {
      query.andWhere(`"${ALIAS}"."created_at" <= :to`, { to: new Date(filter.to) });
    }

    if (filter.userId) {
      query.andWhere(`"${ALIAS}"."user_id" = :userId`, { userId: filter.userId });
    }

    if (filter.anonymous === true) {
      query.andWhere(`"${ALIAS}"."user_id" IS NULL`);
    } else if (filter.anonymous === false) {
      query.andWhere(`"${ALIAS}"."user_id" IS NOT NULL`);
    }

    if (filter.search && filter.search.trim().length > 0) {
      const needle = filter.search.trim().replace(/([\\%_])/g, '\\$1');
      query.andWhere(
        `"${ALIAS}"."form_data"::text ILIKE :search ESCAPE '\\'`,
        { search: `%${needle}%` },
      );
    }

    if (filter.query) {
      const compiled = compileSubmissionFilter(filter.query, { alias: ALIAS, paramPrefix: 'sf' });
      if (compiled) {
        query.andWhere(compiled.sql, compiled.params);
      }
    }

    return query;
  }

  /**
   * Resolves the ORDER BY clause. `createdAt` / `updatedAt` sort on the column;
   * anything else is treated as a path into the form data document and sorted
   * on its text projection.
   */
  private applySort(
    query: SelectQueryBuilder<ReactoryFormSubmission>,
    sort?: ReactoryFormSubmissionSort,
  ): void {
    const direction = sort?.direction === 'asc' ? 'ASC' : 'DESC';
    const field = sort?.field || 'createdAt';

    if (field === 'createdAt' || field === 'updatedAt') {
      const column = field === 'createdAt' ? 'created_at' : 'updated_at';
      query.orderBy(`"${ALIAS}"."${column}"`, direction);
      return;
    }

    const path = parsePath(field.replace(/^formData\./, ''));
    query
      .orderBy(`"${ALIAS}"."form_data" #>> :sortPath::text[]`, direction)
      .setParameter('sortPath', path)
      // A stable secondary key keeps pagination deterministic when many rows
      // share the same sort value.
      .addOrderBy(`"${ALIAS}"."created_at"`, 'DESC');
  }

  /**
   * Returns a page of submissions for a form. Requires one of the form's
   * configured read roles.
   */
  async list(
    fqn: string,
    filter: ReactoryFormSubmissionFilter = {},
    paging: ReactoryFormSubmissionPaging = {},
    sort?: ReactoryFormSubmissionSort,
  ): Promise<ReactoryFormSubmissionListResult> {
    const { config } = await this.requireSubmissionForm(fqn);

    if (this.hasAnyRole(config?.readRoles as string[]) !== true) {
      throw new InsufficientPermissions(
        `You do not have permission to read submissions for ${fqn}`,
        { where: 'ReactoryFormSubmissionService.list', fqn, readRoles: config.readRoles },
      );
    }

    const page = Math.max(1, paging.page || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, paging.pageSize || DEFAULT_PAGE_SIZE));

    const query = this.buildQuery(fqn, filter);
    this.applySort(query, sort);

    // offset / limit rather than skip / take: the sort expression can be a raw
    // JSONB projection, and skip/take routes through TypeORM's distinct-id
    // subquery, which cannot order by an expression that is not selected.
    const [entities, total] = await query
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getManyAndCount();

    return {
      paging: {
        page,
        pageSize,
        total,
        hasNext: page * pageSize < total,
      },
      submissions: entities.map((entity) => this.toResult(entity)),
    };
  }

  /** Returns a single submission, subject to the form's read roles. */
  async get(id: string): Promise<ReactoryFormSubmissionResult | null> {
    if (!id) throw new ApiError('A submission id is required', {
      where: 'ReactoryFormSubmissionService.get',
    });

    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) return null;

    const { config } = await this.requireSubmissionForm(entity.fqn);

    const isOwner = this.currentUserId !== null && entity.userId === this.currentUserId;
    if (isOwner !== true && this.hasAnyRole(config?.readRoles as string[]) !== true) {
      throw new InsufficientPermissions(
        `You do not have permission to read submissions for ${entity.fqn}`,
        { where: 'ReactoryFormSubmissionService.get', id },
      );
    }

    const clientKey = this.clientKey;
    if (clientKey && entity.clientKey !== clientKey) {
      throw new InsufficientPermissions('That submission belongs to another client', {
        where: 'ReactoryFormSubmissionService.get', id,
      });
    }

    return this.toResult(entity);
  }

  /** Deletes a submission. Requires one of the form's delete roles. */
  async delete(id: string): Promise<boolean> {
    if (!id) throw new ApiError('A submission id is required', {
      where: 'ReactoryFormSubmissionService.delete',
    });

    const entity = await this.repository.findOne({ where: { id } });
    if (!entity) return false;

    const { config } = await this.requireSubmissionForm(entity.fqn);

    if (this.hasAnyRole(config?.deleteRoles as string[]) !== true) {
      throw new InsufficientPermissions(
        `You do not have permission to delete submissions for ${entity.fqn}`,
        { where: 'ReactoryFormSubmissionService.delete', id },
      );
    }

    const clientKey = this.clientKey;
    if (clientKey && entity.clientKey !== clientKey) {
      throw new InsufficientPermissions('That submission belongs to another client', {
        where: 'ReactoryFormSubmissionService.delete', id,
      });
    }

    await this.repository.delete({ id });
    this.context.log(`Deleted submission ${id} for ${entity.fqn}`, { id }, 'info', 'ReactoryFormSubmissionService');
    return true;
  }

  /**
   * Summary counts for a form, used by the form list to show how much data a
   * form has collected without paging through it.
   */
  async stats(fqn: string): Promise<ReactoryFormSubmissionStats> {
    const { config } = await this.requireSubmissionForm(fqn);

    if (this.hasAnyRole(config?.readRoles as string[]) !== true) {
      throw new InsufficientPermissions(
        `You do not have permission to read submissions for ${fqn}`,
        { where: 'ReactoryFormSubmissionService.stats', fqn },
      );
    }

    const raw = await this.buildQuery(fqn)
      .select('COUNT(*)', 'total')
      .addSelect(`COUNT(*) FILTER (WHERE "${ALIAS}"."user_id" IS NULL)`, 'anonymousCount')
      .addSelect(`COUNT(DISTINCT "${ALIAS}"."user_id")`, 'uniqueUsers')
      .addSelect(`MIN("${ALIAS}"."created_at")`, 'firstSubmission')
      .addSelect(`MAX("${ALIAS}"."created_at")`, 'lastSubmission')
      .getRawOne();

    return {
      fqn,
      total: parseInt(raw?.total || '0', 10),
      anonymousCount: parseInt(raw?.anonymousCount || '0', 10),
      uniqueUsers: parseInt(raw?.uniqueUsers || '0', 10),
      firstSubmission: raw?.firstSubmission || undefined,
      lastSubmission: raw?.lastSubmission || undefined,
    };
  }
}

export default ReactoryFormSubmissionService;
