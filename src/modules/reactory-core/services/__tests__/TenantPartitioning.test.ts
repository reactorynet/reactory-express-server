/**
 * Tenant partitioning of Postgres-backed core services (pre-B2 leak fixes).
 *
 * - Calendars: client_id is the request's ReactoryClient _id, never the
 *   caller's input; reads, writes and ClientReactoryCalendars stay inside it.
 * - Form submissions: rows without a client_key are no longer visible to, or
 *   changeable by, every client.
 */
import { PostgresDataSource } from '@reactory/server-modules/reactory-core/models';
import { ReactoryCalendar } from '@reactory/server-modules/reactory-core/models/ReactoryCalendar';
import { ReactoryCalendarService } from '../ReactoryCalendarService';
import { ReactoryFormSubmissionService } from '../FormSubmission/FormSubmissionService';

const TENANT_A = { _id: { toString: () => 'client-a-id' }, key: 'tenant-a' };

const contextFor = (partner: any = TENANT_A) => ({
  partner,
  user: { _id: { toString: () => 'user-1' } },
  hasAnyRole: () => true,
  hasRole: () => true,
  log: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}) as any;

/** A query builder that records its where clauses and returns `rows`. */
const recordingQuery = (rows: any[] = [], raw: any = {}) => {
  const clauses: Array<{ sql: string; params?: any }> = [];
  const qb: any = {
    clauses,
    where: jest.fn((sql, params) => { clauses.push({ sql, params }); return qb; }),
    andWhere: jest.fn((sql, params) => { clauses.push({ sql, params }); return qb; }),
    select: jest.fn(() => qb),
    addSelect: jest.fn(() => qb),
    limit: jest.fn(() => qb),
    offset: jest.fn(() => qb),
    orderBy: jest.fn(() => qb),
    getMany: jest.fn(async () => rows),
    getRawOne: jest.fn(async () => raw),
  };
  return qb;
};

describe('ReactoryCalendarService tenant partitioning', () => {
  let repo: any;
  const initialised = Object.getOwnPropertyDescriptor(PostgresDataSource, 'isInitialized');

  // getTenantRepository resolves the owning DataSource through the registry
  // (models/index.ts registers PostgresDataSource); make it look live.
  beforeEach(() => {
    Object.defineProperty(PostgresDataSource, 'isInitialized', { value: true, configurable: true, writable: true });
    jest.spyOn(PostgresDataSource, 'hasMetadata').mockReturnValue(true);
  });

  afterEach(() => {
    if (initialised) Object.defineProperty(PostgresDataSource, 'isInitialized', initialised);
  });

  beforeEach(() => {
    repo = {
      metadata: {
        name: 'ReactoryCalendar',
        findColumnWithPropertyName: (p: string) => (p === 'clientKey' ? { propertyName: 'clientKey' } : undefined),
        primaryColumns: [{ propertyName: 'id' }],
      },
      create: jest.fn((v) => v),
      save: jest.fn(async (v) => v),
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    jest.spyOn(PostgresDataSource, 'getRepository').mockReturnValue(repo);
  });

  afterEach(() => jest.restoreAllMocks());

  it('stores the request client on create, ignoring a clientId in the input', async () => {
    const service = new ReactoryCalendarService({}, contextFor());
    const saved = await service.createCalendar({ name: 'Cal', visibility: 'private' as any, clientId: 'client-b-id' }, 'user-1');
    expect(saved.clientId).toBe('client-a-id');
    expect(saved.clientKey).toBe('tenant-a');
  });

  it('cannot move a calendar to another client on update', async () => {
    const calendar = { id: 1, ownerId: 'user-1', clientId: 'client-a-id', isActive: true };
    repo.findOne.mockResolvedValue(calendar);
    const service = new ReactoryCalendarService({}, contextFor());
    const updated = await service.updateCalendar(1, { name: 'x', clientId: 'client-b-id' } as any, 'user-1');
    expect(updated.clientId).toBe('client-a-id');
  });

  it('scopes every by-id lookup to the request client', async () => {
    repo.findOne.mockResolvedValue(null);
    const service = new ReactoryCalendarService({}, contextFor());
    await service.getCalendar(7);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 7, isActive: true, clientId: 'client-a-id', clientKey: 'tenant-a' } });
  });

  it('rejects ClientReactoryCalendars for another client', async () => {
    const service = new ReactoryCalendarService({}, contextFor());
    await expect(service.getClientCalendars('client-b-id')).rejects.toThrow(/another client/);
  });

  it('lists the request client when the argument names it by _id or key', async () => {
    const find = jest.spyOn(ReactoryCalendar, 'findClientCalendars').mockResolvedValue([] as any);
    const service = new ReactoryCalendarService({}, contextFor());
    await service.getClientCalendars('tenant-a');
    await service.getClientCalendars('client-a-id');
    // The model helper now takes the tenant repository first (WP-B2).
    expect(find).toHaveBeenNthCalledWith(1, expect.objectContaining({ clientKeys: ['tenant-a'] }), 'client-a-id');
    expect(find).toHaveBeenNthCalledWith(2, expect.objectContaining({ clientKeys: ['tenant-a'] }), 'client-a-id');
  });

  it('actually filters by read access (the async predicate let everything through)', async () => {
    const calendars = [
      { id: 1, ownerId: 'user-1', clientId: 'client-a-id', visibility: 'private', isActive: true },
      { id: 2, ownerId: 'someone-else', clientId: 'client-a-id', visibility: 'private', isActive: true },
    ];
    jest.spyOn(ReactoryCalendar, 'findOrganizationCalendars').mockResolvedValue(calendars as any);
    repo.findOne.mockImplementation(async ({ where }: any) => calendars.find((c) => c.id === where.id) || null);
    const service = new ReactoryCalendarService({}, contextFor());
    const readable = await service.getOrganizationCalendars('org-1', 'user-1');
    expect(readable.map((c) => c.id)).toEqual([1]);
  });

  it('drops other clients from organization calendars (an organization can span clients)', async () => {
    jest.spyOn(ReactoryCalendar, 'findOrganizationCalendars').mockResolvedValue([
      { id: 1, ownerId: 'user-1', clientId: 'client-a-id', isActive: true },
      { id: 2, ownerId: 'user-1', clientId: 'client-b-id', isActive: true },
    ] as any);
    const service = new ReactoryCalendarService({}, contextFor());
    const result = await service.getOrganizationCalendars('org-1');
    expect(result.map((c) => c.id)).toEqual([1]);
  });

  it('forces listCalendars onto the request client and returns nothing for a foreign filter', async () => {
    const qb = recordingQuery([{ id: 1 }]);
    repo.createQueryBuilder.mockReturnValue(qb);
    const service = new ReactoryCalendarService({}, contextFor());

    await service.listCalendars({});
    expect(qb.clauses).toContainEqual({ sql: 'calendar.client_id = :tenantClientId', params: { tenantClientId: 'client-a-id' } });

    await expect(service.listCalendars({ clientId: 'client-b-id' } as any)).resolves.toEqual([]);
  });
});

describe('ReactoryFormSubmissionService tenant partitioning', () => {
  let repo: any;

  const service = (partner: any = TENANT_A) => {
    const s = new ReactoryFormSubmissionService({} as any, contextFor(partner));
    s.setFormService({ get: jest.fn(async () => ({ id: 'test.Form@1.0.0' })) } as any);
    jest.spyOn(s, 'getSubmissionConfig').mockReturnValue({
      enabled: true, readRoles: ['USER'], deleteRoles: ['USER'], writeRoles: ['USER'], allowAnonymous: false,
    } as any);
    return s;
  };

  const initialised = Object.getOwnPropertyDescriptor(PostgresDataSource, 'isInitialized');

  beforeEach(() => {
    repo = {
      findOne: jest.fn(), delete: jest.fn(), createQueryBuilder: jest.fn(), save: jest.fn(),
      // Enough entity metadata for the TenantRepository wrapper.
      metadata: {
        name: 'ReactoryFormSubmission',
        findColumnWithPropertyName: (p: string) => (p === 'clientKey' ? { propertyName: 'clientKey' } : undefined),
        primaryColumns: [{ propertyName: 'id' }],
      },
    };
    jest.spyOn(PostgresDataSource, 'getRepository').mockReturnValue(repo);
    // The service refuses to run before the data source is up.
    Object.defineProperty(PostgresDataSource, 'isInitialized', { value: true, configurable: true, writable: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (initialised) Object.defineProperty(PostgresDataSource, 'isInitialized', initialised);
  });

  it('partitions queries on the request client through the tenant repository', async () => {
    const qb = recordingQuery([], { total: '0' });
    repo.createQueryBuilder.mockReturnValue(qb);
    await service().stats('test.Form@1.0.0');
    const partition = qb.clauses.find((c: any) => c.sql.includes('clientKey'));
    expect(partition.sql).not.toMatch(/IS NULL/);
    expect(partition.params).toEqual({ __reactoryTenantScope: 'tenant-a' });
    // The service's own where() became an andWhere, so the tenant filter survived it.
    expect(qb.clauses[0]).toBe(partition);
  });

  it('refuses a submission made without a client', async () => {
    await expect(service(null).submit({ fqn: 'test.Form@1.0.0', formData: {} } as any))
      .rejects.toThrow(/on behalf of a client/);
  });

  it('refuses to read a submission that has no client_key', async () => {
    repo.findOne.mockResolvedValue({ id: 's1', fqn: 'test.Form@1.0.0', clientKey: null });
    await expect(service().get('s1')).rejects.toThrow(/another client/);
  });

  it('refuses to delete a submission that has no client_key', async () => {
    repo.findOne.mockResolvedValue({ id: 's1', fqn: 'test.Form@1.0.0', clientKey: null });
    await expect(service().delete('s1')).rejects.toThrow(/another client/);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('still lets the owning client read its submission', async () => {
    repo.findOne.mockResolvedValue({ id: 's1', fqn: 'test.Form@1.0.0', clientKey: 'tenant-a', formData: {} });
    await expect(service().get('s1')).resolves.toEqual(expect.objectContaining({ id: 's1', clientKey: 'tenant-a' }));
  });
});
