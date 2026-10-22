import { ObjectId } from 'mongodb';
import { DemographicsService } from '../DemographicsService';

/**
 * ORG-035: aggregate reporting at the service boundary.
 *
 * The arithmetic is covered by `demographics/__tests__/demographicAggregates.test.ts`.
 * This suite covers the parts that need a caller and a database: authorization,
 * member-set resolution, the policy threshold, the audit trail and the CSV
 * export. Models are mocked; the `User` model is the real one so the
 * authorization matrix exercises the shipped `hasRole` implementation (the
 * same approach ORG-005/ORG-006 take).
 */

jest.mock('@reactory/server-core/logging', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('@reactory/server-modules/reactory-core/models', () => {
  const DemographicDefinition: any = jest.fn();
  DemographicDefinition.find = jest.fn();
  DemographicDefinition.findOne = jest.fn();

  const DemographicValue: any = jest.fn();
  DemographicValue.find = jest.fn();
  DemographicValue.findOne = jest.fn();
  DemographicValue.countDocuments = jest.fn();

  const OrganizationDemographicsPolicy: any = jest.fn();
  OrganizationDemographicsPolicy.findOne = jest.fn();

  const Team: any = jest.fn();
  Team.findOne = jest.fn();

  const User: any = jest.fn();
  User.find = jest.fn();

  return { DemographicDefinition, DemographicValue, OrganizationDemographicsPolicy, Team, User };
});

const models = require('@reactory/server-modules/reactory-core/models');

const RealUserModel = jest.requireActual(
  '@reactory/server-modules/reactory-core/models/User',
).default;

interface IRolePolicy {
  admin?: boolean;
  orgAdminOf?: string[];
  memberOf?: string[];
  system?: boolean;
}

const makeContext = (policy: IRolePolicy = {}) => {
  const partnerId = new ObjectId();
  const orgAdminOf = policy.orgAdminOf || [];

  const memberships: any[] = [
    {
      clientId: partnerId,
      organizationId: null,
      businessUnitId: null,
      roles: ['USER'],
      enabled: true,
    },
    ...(policy.memberOf || []).map((organizationId) => ({
      clientId: partnerId,
      organizationId: new ObjectId(organizationId),
      businessUnitId: null,
      roles: ['USER'],
      enabled: true,
    })),
    ...orgAdminOf.map((organizationId) => ({
      clientId: partnerId,
      organizationId: new ObjectId(organizationId),
      businessUnitId: null,
      roles: ['USER', 'ORGANIZATION_ADMIN'],
      enabled: true,
    })),
  ];

  const documentRoles: string[] = ['USER'];
  if (policy.admin) documentRoles.push('ADMIN');
  if (policy.system) documentRoles.push('SYSTEM');
  if (orgAdminOf.length > 0) documentRoles.push('ORGANIZATION_ADMIN');

  const user: any = new RealUserModel({
    _id: new ObjectId(),
    email: `operator-${new ObjectId()}@example.com`,
    roles: documentRoles,
    memberships,
  });
  user.save = jest.fn().mockResolvedValue(user);

  const audit = { logAuditEvent: jest.fn().mockResolvedValue({}) };

  const context: any = {
    user,
    partner: { _id: partnerId },
    hasRole: jest.fn((role: string) => documentRoles.indexOf(role) >= 0),
    hasAnyRole: jest.fn(() => true),
    log: jest.fn(),
    error: jest.fn(),
    getService: jest.fn((id: string) =>
      id === 'core.ReactoryAuditService@1.0.0' ? audit : null,
    ),
  };

  return { context, audit, partnerId, user };
};

/** Minimal Mongoose query stand-in: chainable and awaitable. */
const makeQuery = (rows: any) => {
  const query: any = {};
  ['sort', 'skip', 'limit', 'select', 'lean'].forEach((method) => {
    query[method] = jest.fn(() => query);
  });
  query.then = (resolve?: any, reject?: any) => Promise.resolve(rows).then(resolve, reject);
  return query;
};

const ORGANIZATION_ID = `${new ObjectId()}`;
const OTHER_ORGANIZATION_ID = `${new ObjectId()}`;

const makeDefinition = (overrides: Record<string, any> = {}): any => ({
  _id: new ObjectId(),
  organization: new ObjectId(ORGANIZATION_ID),
  key: 'gender',
  title: 'Gender',
  category: 'personal',
  valueType: 'enum',
  options: [
    { key: 'male', label: 'Male', ordinal: 1 },
    { key: 'female', label: 'Female', ordinal: 2 },
  ],
  multiValued: false,
  sensitive: false,
  enabled: true,
  ordinal: 0,
  deleted: false,
  ...overrides,
});

const valuesFor = (definition: any, value: string, count: number): any[] =>
  Array.from({ length: count }, () => ({
    _id: new ObjectId(),
    organization: new ObjectId(ORGANIZATION_ID),
    definition: definition._id,
    key: definition.key,
    // A fresh ObjectId per member: counts are over distinct members.
    user: new ObjectId(),
    value,
  }));

const serviceFor = (policy: IRolePolicy, orgId: string = ORGANIZATION_ID) => {
  const { context, audit } = makeContext({ ...policy, orgAdminOf: policy.admin ? [] : [orgId] });
  return {
    service: new DemographicsService({}, context),
    audit,
    context,
  };
};

const adminService = (orgId: string = ORGANIZATION_ID) => serviceFor({}, orgId);

/** Wires the model mocks for one aggregate run. */
const primeModels = (options: {
  definitions: any[];
  values: any[];
  policy?: any;
  members?: string[];
  team?: any;
  regionValues?: any[];
}) => {
  models.DemographicDefinition.find.mockReturnValue(makeQuery(options.definitions));
  models.OrganizationDemographicsPolicy.findOne.mockReturnValue(
    makeQuery(options.policy === undefined ? null : options.policy),
  );
  models.Team.findOne.mockReturnValue(makeQuery(options.team === undefined ? null : options.team));

  // A real Mongo query only returns the ids it was asked for; the mock must do
  // the same or an intersection assertion would silently pass against the
  // whole member list.
  models.User.find.mockImplementation((query: any) => {
    const all = (options.members || []).map((memberId) => ({ _id: new ObjectId(memberId) }));
    const requested = query?._id?.$in;
    if (!Array.isArray(requested)) return makeQuery(all);
    const allowed = new Set(requested.map((id: any) => `${id}`));
    return makeQuery(all.filter((member) => allowed.has(`${member._id}`)));
  });

  // `DemographicValue.find` is used twice: once to resolve a region cohort and
  // once for the aggregation itself. Queue the region rows first.
  if (options.regionValues) {
    models.DemographicValue.find
      .mockReturnValueOnce(makeQuery(options.regionValues))
      .mockReturnValue(makeQuery(options.values));
    return;
  }

  models.DemographicValue.find.mockReturnValue(makeQuery(options.values));
};

describe('DemographicsService.aggregate (ORG-035)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    models.OrganizationDemographicsPolicy.findOne.mockReturnValue(makeQuery(null));
    models.DemographicDefinition.find.mockReturnValue(makeQuery([]));
    models.DemographicValue.find.mockReturnValue(makeQuery([]));
  });

  describe('counts and distributions', () => {
    it('reports one aggregate per definition with counts and percentages', async () => {
      const gender = makeDefinition();
      const employment = makeDefinition({
        key: 'employmentType',
        title: 'Employment type',
        options: [
          { key: 'permanent', label: 'Permanent' },
          { key: 'contract', label: 'Contract' },
        ],
      });

      primeModels({
        definitions: [gender, employment],
        values: [
          ...valuesFor(gender, 'male', 9),
          ...valuesFor(gender, 'female', 6),
          ...valuesFor(employment, 'permanent', 8),
          ...valuesFor(employment, 'contract', 7),
        ],
      });

      const { service } = adminService();
      const report = await service.aggregate(ORGANIZATION_ID);

      expect(report.organization).toBe(ORGANIZATION_ID);
      expect(report.reportedDefinitions).toBe(2);
      expect(report.suppressedDefinitions).toBe(0);

      const genderReport = report.definitions.find((entry) => entry.definitionKey === 'gender')!;
      expect(genderReport.buckets).toEqual([
        { key: 'male', label: 'Male', count: 9, percentage: 60 },
        { key: 'female', label: 'Female', count: 6, percentage: 40 },
      ]);
      expect(genderReport.cohortTotal).toBe(15);

      const employmentReport = report.definitions.find(
        (entry) => entry.definitionKey === 'employmentType',
      )!;
      expect(employmentReport.buckets.map((bucket) => bucket.count)).toEqual([8, 7]);

      // Values are always read through the definition join and the org scope.
      const valueQuery = models.DemographicValue.find.mock.calls[0][0];
      expect(valueQuery.organization).toEqual(new ObjectId(ORGANIZATION_ID));
      expect(valueQuery.definition.$in).toHaveLength(2);
    });

    it('reports only enabled definitions unless specific keys are requested', async () => {
      primeModels({ definitions: [], values: [] });

      const { service } = adminService();
      await service.aggregate(ORGANIZATION_ID);

      expect(models.DemographicDefinition.find.mock.calls[0][0]).toMatchObject({
        organization: new ObjectId(ORGANIZATION_ID),
        deleted: { $ne: true },
        enabled: true,
      });

      models.DemographicDefinition.find.mockClear();
      models.DemographicDefinition.find.mockReturnValue(makeQuery([]));
      await service.aggregate(ORGANIZATION_ID, ['gender', 'disabilityStatus']);

      expect(models.DemographicDefinition.find.mock.calls[0][0]).toMatchObject({
        key: { $in: ['gender', 'disabilitystatus'] },
      });
      expect(models.DemographicDefinition.find.mock.calls[0][0]).not.toHaveProperty('enabled');
    });
  });

  describe('suppression threshold', () => {
    it('suppresses a cohort below the policy threshold and reports the threshold', async () => {
      const gender = makeDefinition();
      primeModels({
        definitions: [gender],
        values: [...valuesFor(gender, 'male', 6), ...valuesFor(gender, 'female', 3)],
        policy: { minimumAggregationGroupSize: 5 },
      });

      const { service } = adminService();
      const report = await service.aggregate(ORGANIZATION_ID);
      const aggregate = report.definitions[0];

      expect(report.minimumAggregationGroupSize).toBe(5);
      expect(aggregate.suppressed).toBe(false);
      expect(aggregate.suppressedCohorts).toBe(1);
      expect(aggregate.buckets.map((bucket) => bucket.key)).toEqual(['male']);
      expect(aggregate.cohortTotal).toBe(6);
    });

    it('reads the threshold from the policy on every call - a hardcoded 5 would fail here', async () => {
      const gender = makeDefinition();
      const values = [...valuesFor(gender, 'male', 6), ...valuesFor(gender, 'female', 3)];

      primeModels({
        definitions: [gender],
        values,
        policy: { minimumAggregationGroupSize: 3 },
      });
      const relaxed = await adminService().service.aggregate(ORGANIZATION_ID);

      expect(relaxed.minimumAggregationGroupSize).toBe(3);
      expect(relaxed.definitions[0].buckets.map((bucket) => bucket.key)).toEqual([
        'male',
        'female',
      ]);
      expect(relaxed.definitions[0].suppressedCohorts).toBe(0);

      jest.clearAllMocks();
      primeModels({
        definitions: [gender],
        values,
        policy: { minimumAggregationGroupSize: 8 },
      });
      const strict = await adminService().service.aggregate(ORGANIZATION_ID);

      expect(strict.minimumAggregationGroupSize).toBe(8);
      // The 6-person cohort is now below the threshold too.
      expect(strict.definitions[0].suppressed).toBe(true);
      expect(strict.definitions[0].buckets).toEqual([]);
    });

    it('falls back to the documented policy default when no policy document exists', async () => {
      const gender = makeDefinition();
      primeModels({
        definitions: [gender],
        values: [...valuesFor(gender, 'male', 6), ...valuesFor(gender, 'female', 3)],
        policy: null,
      });

      const report = await adminService().service.aggregate(ORGANIZATION_ID);

      expect(report.minimumAggregationGroupSize).toBe(5);
      expect(report.definitions[0].suppressedCohorts).toBe(1);
    });

    it('masks suppressedCohorts in the response when nothing survives', async () => {
      const gender = makeDefinition();
      primeModels({
        definitions: [gender],
        values: [...valuesFor(gender, 'male', 3), ...valuesFor(gender, 'female', 2)],
        policy: { minimumAggregationGroupSize: 5 },
      });

      const report = await adminService().service.aggregate(ORGANIZATION_ID);
      const aggregate = report.definitions[0];

      // Two cohorts were withheld. Saying so would confirm the definition has
      // two distinct answers, each held by 1..k-1 members, so the count is
      // masked - the same null an unanswered definition returns.
      expect(aggregate.suppressed).toBe(true);
      expect(aggregate.suppressedCohorts).toBeNull();
      expect(report.suppressedDefinitions).toBe(1);
    });

    it('never returns a total a suppressed cohort could be derived from', async () => {
      const gender = makeDefinition();
      primeModels({
        definitions: [gender],
        values: [...valuesFor(gender, 'male', 6), ...valuesFor(gender, 'female', 3)],
        policy: { minimumAggregationGroupSize: 5 },
      });

      const report = await adminService().service.aggregate(ORGANIZATION_ID);
      const aggregate = report.definitions[0];

      // 9 people answered; the payload only states 6.
      expect(aggregate.cohortTotal).toBe(6);
      expect(aggregate.percentageDenominator).toBe(6);
      expect(aggregate.buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(6);
      // No headcount/population field exists to subtract from.
      expect(report).not.toHaveProperty('totalMembers');
      expect(report).not.toHaveProperty('respondents');
      expect(aggregate).not.toHaveProperty('respondents');
      expect(aggregate).not.toHaveProperty('total');
    });
  });

  describe('filters', () => {
    it('narrows the cohort by business unit without treating client-wide members as org members', async () => {
      const gender = makeDefinition();
      const businessUnit = `${new ObjectId()}`;
      const memberA = `${new ObjectId()}`;
      const memberB = `${new ObjectId()}`;

      primeModels({
        definitions: [gender],
        values: [],
        members: [memberA, memberB],
      });

      const { service } = adminService();
      await service.aggregate(ORGANIZATION_ID, [], { businessUnit });

      const userQuery = models.User.find.mock.calls[0][0];
      const membershipMatch = userQuery.memberships.$elemMatch;

      // The trap: client-wide memberships carry organizationId null. The
      // predicate must require an exact organization, or every member of the
      // tenant would satisfy the business-unit filter.
      expect(membershipMatch.organizationId).toEqual(new ObjectId(ORGANIZATION_ID));
      expect(membershipMatch.organizationId).not.toBeNull();
      expect(membershipMatch.clientId).toBeDefined();
      expect(membershipMatch.businessUnitId).toEqual(new ObjectId(businessUnit));

      const valueQuery = models.DemographicValue.find.mock.calls[0][0];
      expect(valueQuery.user.$in).toEqual([new ObjectId(memberA), new ObjectId(memberB)]);
    });

    it('narrows by team through the team roster', async () => {
      const gender = makeDefinition();
      const teamId = `${new ObjectId()}`;
      const memberA = new ObjectId();
      const memberB = new ObjectId();

      primeModels({
        definitions: [gender],
        values: [],
        team: { _id: new ObjectId(teamId), organization: new ObjectId(ORGANIZATION_ID), members: [memberA] },
        members: [`${memberA}`, `${memberB}`],
      });

      const { service } = adminService();
      await service.aggregate(ORGANIZATION_ID, [], { team: teamId });

      expect(models.Team.findOne.mock.calls[0][0]).toMatchObject({
        organization: new ObjectId(ORGANIZATION_ID),
        deleted: { $ne: true },
      });

      // The team roster intersects the organization membership set; memberB is
      // an org member but not in this team and must not be in the cohort.
      const valueQuery = models.DemographicValue.find.mock.calls[0][0];
      expect(valueQuery.user.$in).toEqual([memberA]);
    });

    it('narrows by region through the region demographic value', async () => {
      const gender = makeDefinition();
      const regionId = `${new ObjectId()}`;
      const memberA = new ObjectId();
      const memberB = new ObjectId();
      const memberOutside = new ObjectId();

      primeModels({
        definitions: [gender],
        values: [],
        regionValues: [{ user: memberA }, { user: memberB }],
        members: [`${memberA}`, `${memberB}`, `${memberOutside}`],
      });

      const { service } = adminService();
      await service.aggregate(ORGANIZATION_ID, [], { region: regionId });

      expect(models.DemographicValue.find.mock.calls[0][0]).toMatchObject({
        organization: new ObjectId(ORGANIZATION_ID),
        key: 'region',
      });

      const valueQuery = models.DemographicValue.find.mock.calls[1][0];
      expect(valueQuery.user.$in).toEqual([memberA, memberB]);
    });

    it('does not widen an empty cohort to every member', async () => {
      const gender = makeDefinition();
      primeModels({ definitions: [gender], values: [], members: [] });

      const { service } = adminService();
      const report = await service.aggregate(ORGANIZATION_ID, [], { businessUnit: `${new ObjectId()}` });

      // No values were read at all: the report is computed on an empty cohort.
      expect(models.DemographicValue.find).not.toHaveBeenCalled();
      expect(report.filter.cohortRestricted).toBe(true);
      expect(report.definitions[0].suppressed).toBe(true);
      expect(report.definitions[0].buckets).toEqual([]);
    });

    it('does not widen when the requested team has no members', async () => {
      const gender = makeDefinition();
      primeModels({
        definitions: [gender],
        values: [],
        team: { _id: new ObjectId(), organization: new ObjectId(ORGANIZATION_ID), members: [] },
        members: [`${new ObjectId()}`],
      });

      const { service } = adminService();
      const report = await service.aggregate(ORGANIZATION_ID, [], { team: `${new ObjectId()}` });

      expect(models.DemographicValue.find).not.toHaveBeenCalled();
      expect(report.definitions[0].suppressed).toBe(true);
    });

    it('leaves the cohort unrestricted when no structural filter is supplied', async () => {
      const gender = makeDefinition();
      primeModels({ definitions: [gender], values: valuesFor(gender, 'male', 6) });

      const { service } = adminService();
      const report = await service.aggregate(ORGANIZATION_ID);

      expect(report.filter.cohortRestricted).toBe(false);
      const valueQuery = models.DemographicValue.find.mock.calls[0][0];
      expect(valueQuery).not.toHaveProperty('user');
    });

    it('applies a period window to the value effective range', async () => {
      const gender = makeDefinition();
      primeModels({ definitions: [gender], values: [] });

      const { service } = adminService();
      const report = await service.aggregate(ORGANIZATION_ID, [], {
        effectiveFrom: '2026-01-01T00:00:00.000Z',
        effectiveTo: '2026-06-30T00:00:00.000Z',
      });

      const valueQuery = models.DemographicValue.find.mock.calls[0][0];
      expect(valueQuery.$and).toEqual([
        {
          $or: [
            { effectiveFrom: null },
            { effectiveFrom: { $lte: new Date('2026-06-30T00:00:00.000Z') } },
          ],
        },
        {
          $or: [
            { effectiveTo: null },
            { effectiveTo: { $gte: new Date('2026-01-01T00:00:00.000Z') } },
          ],
        },
      ]);
      expect(report.filter.effectiveFrom).toBe('2026-01-01T00:00:00.000Z');
      expect(report.filter.effectiveTo).toBe('2026-06-30T00:00:00.000Z');
    });

    it('rejects an inverted or unparseable period', async () => {
      const { service } = adminService();

      await expect(
        service.aggregate(ORGANIZATION_ID, [], {
          effectiveFrom: '2026-06-30T00:00:00.000Z',
          effectiveTo: '2026-01-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(/on or before/);

      await expect(
        service.aggregate(ORGANIZATION_ID, [], { effectiveFrom: 'not-a-date' }),
      ).rejects.toThrow(/not a valid date/);
    });
  });

  describe('authorization', () => {
    it('rejects a plain member of the organization', async () => {
      const { context } = makeContext({ memberOf: [ORGANIZATION_ID] });
      const service = new DemographicsService({}, context);

      await expect(service.aggregate(ORGANIZATION_ID)).rejects.toThrow(/permission to administer/i);
      expect(models.DemographicDefinition.find).not.toHaveBeenCalled();
    });

    it('rejects an unauthenticated caller', async () => {
      const context: any = { user: null, partner: { _id: new ObjectId() }, getService: jest.fn() };
      const service = new DemographicsService({}, context);

      await expect(service.aggregate(ORGANIZATION_ID)).rejects.toThrow(/authenticated user/i);
    });

    it('rejects an administrator of a different organization', async () => {
      const { service } = serviceFor({}, OTHER_ORGANIZATION_ID);

      await expect(service.aggregate(ORGANIZATION_ID)).rejects.toThrow(
        /permission to administer organization/i,
      );
      expect(models.DemographicDefinition.find).not.toHaveBeenCalled();
    });

    it('allows a platform administrator', async () => {
      const { context } = makeContext({ admin: true });
      const service = new DemographicsService({}, context);
      primeModels({ definitions: [], values: [] });

      await expect(service.aggregate(ORGANIZATION_ID)).resolves.toBeDefined();
    });
  });

  describe('audit of sensitive reads', () => {
    it('writes an audit entry for a sensitive definition but not for a normal one', async () => {
      const gender = makeDefinition();
      const disability = makeDefinition({
        key: 'disabilityStatus',
        title: 'Disability status',
        sensitive: true,
        options: [
          { key: 'disability', label: 'Disability' },
          { key: 'no-disability', label: 'No disability' },
        ],
      });

      primeModels({
        definitions: [gender, disability],
        values: [
          ...valuesFor(gender, 'male', 6),
          ...valuesFor(disability, 'no-disability', 7),
        ],
        policy: { minimumAggregationGroupSize: 5 },
      });

      const { service, audit } = adminService();
      const report = await service.aggregate(ORGANIZATION_ID, [], { region: null });

      expect(audit.logAuditEvent).toHaveBeenCalledTimes(1);
      const entry = audit.logAuditEvent.mock.calls[0][0];
      expect(entry.action).toBe('demographics.aggregate.read');
      expect(entry.organizationId).toBe(ORGANIZATION_ID);
      expect(entry.resourceType).toBe('DemographicDefinition');
      expect(entry.resourceId).toBe('disabilityStatus');
      expect(entry.source).toBe('core.DemographicsService@1.0.0');
      expect(entry.actorId).toBeDefined();
      expect(entry.metadata).toMatchObject({
        definitionKey: 'disabilityStatus',
        sensitive: true,
        valuesRead: 7,
        bucketsReturned: 1,
        cohortsWithheld: 0,
        cohortTotal: 7,
        definitionSuppressed: false,
      });
      expect(entry.metadata.filter).toEqual(report.filter);
    });

    it('still returns the report when the audit sink is unavailable', async () => {
      const gender = makeDefinition({ sensitive: true });
      primeModels({ definitions: [gender], values: valuesFor(gender, 'male', 5) });

      const { context } = makeContext({ orgAdminOf: [ORGANIZATION_ID] });
      context.getService = jest.fn(() => null);
      const service = new DemographicsService({}, context);

      const report = await service.aggregate(ORGANIZATION_ID);
      expect(report.definitions[0].cohortTotal).toBe(5);
    });
  });

  describe('CSV export', () => {
    it('returns a header row and one row per reported bucket, in stable order', async () => {
      const gender = makeDefinition();
      primeModels({
        definitions: [gender],
        values: [...valuesFor(gender, 'male', 9), ...valuesFor(gender, 'female', 6)],
        policy: { minimumAggregationGroupSize: 5 },
      });

      const { service } = adminService();
      const csv = await service.aggregateCsv(ORGANIZATION_ID);

      const lines = csv.trimEnd().split('\n');
      expect(lines[0]).toBe(
        'organization,minimum_group_size,definition_key,definition_title,category,value_type,sensitive,definition_suppressed,suppressed_cohorts,cohort_total,percentage_denominator,denominator_kind,bucket_key,bucket_label,count,percentage',
      );
      expect(lines[1].split(',')[12]).toBe('male');
      expect(lines[1].split(',')[15]).toBe('60.00');
      expect(lines[2].split(',')[12]).toBe('female');
      expect(lines[2].split(',')[15]).toBe('40.00');
    });

    it('applies the same authorization as the report', async () => {
      const { context } = makeContext({ memberOf: [ORGANIZATION_ID] });
      const service = new DemographicsService({}, context);

      await expect(service.aggregateCsv(ORGANIZATION_ID)).rejects.toThrow(
        /permission to administer/i,
      );
    });

    it('omits suppressed cohorts from the export', async () => {
      const gender = makeDefinition();
      primeModels({
        definitions: [gender],
        values: [...valuesFor(gender, 'male', 6), ...valuesFor(gender, 'female', 3)],
        policy: { minimumAggregationGroupSize: 5 },
      });

      const { service } = adminService();
      const csv = await service.aggregateCsv(ORGANIZATION_ID);

      expect(csv).not.toContain('female');
      expect(csv.split('\n').filter((line) => line.length > 0)).toHaveLength(2);
    });
  });
});
