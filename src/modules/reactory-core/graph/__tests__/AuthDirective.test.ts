/**
 * WP-A7: @auth directive scope, denial and OBJECT coverage.
 */
import fs from 'fs';
import path from 'path';
import { graphql } from 'graphql';
import { makeExecutableSchema } from '@graphql-tools/schema';
import authDirectiveProvider, { AUTH_DIRECTIVE_STRICT_FLAG } from '../directives/AuthDirective';

const DIRECTIVES_SDL = fs.readFileSync(path.resolve(__dirname, '../types/System/Directives.graphql'), 'utf8');

const typeDefs = `
  ${DIRECTIVES_SDL}

  type Query {
    tenantThing: String @auth(roles: ["ADMIN"])
    orgThing(organizationId: String): String @auth(roles: ["ORG_ADMIN"], scope: ORGANIZATION, orgArg: "organizationId")
    nestedOrgThing(input: OrgInput): String @auth(roles: ["ORG_ADMIN"], scope: ORGANIZATION, orgArg: "input.organizationId")
    buThing(organizationId: String, businessUnitId: String): String
      @auth(roles: ["BU_LEAD"], scope: BUSINESS_UNIT, orgArg: "organizationId", buArg: "businessUnitId")
    secured: Secured
    open: String
  }

  input OrgInput { organizationId: String }

  type Secured @auth(roles: ["ADMIN"]) {
    inherited: String
    overridden: String @auth(roles: ["USER"])
  }
`;

const resolvers = {
  Query: {
    tenantThing: () => 'tenant-ok',
    orgThing: () => 'org-ok',
    nestedOrgThing: () => 'nested-ok',
    buThing: () => 'bu-ok',
    secured: () => ({ inherited: 'inherited-ok', overridden: 'overridden-ok' }),
    open: () => 'open-ok',
  },
};

const schema = authDirectiveProvider.transformer(makeExecutableSchema({ typeDefs, resolvers }));

/**
 * memberships: [{ roles, org?, bu? }] — hasRole mirrors User.hasRole: an exact
 * match on (organization, businessUnit), where absent means "none".
 */
const contextFor = (memberships: Array<{ roles: string[]; org?: string; bu?: string }>, extra: any = {}) => ({
  user: { _id: { toString: () => 'user-1' } },
  partner: { _id: 'partner-1', key: 'tenant', featureFlags: extra.featureFlags },
  hasRole: (role: string, _partner?: any, organization?: any, businessUnit?: any) =>
    memberships.some((m) =>
      m.roles.includes(role)
      && (m.org ?? null) === (organization?._id ?? null)
      && (m.bu ?? null) === (businessUnit?._id ?? null)),
  ...extra,
});

const run = async (query: string, context: any) => graphql({ schema, source: query, contextValue: context });

describe('WP-A7: @auth directive', () => {
  describe('TENANT scope', () => {
    it('allows a tenant role holder', async () => {
      const result = await run('{ tenantThing }', contextFor([{ roles: ['USER', 'ADMIN'] }]));
      expect(result.errors).toBeUndefined();
      expect(result.data?.tenantThing).toBe('tenant-ok');
    });

    it('raises FORBIDDEN for a signed-in user without the role', async () => {
      const result = await run('{ tenantThing }', contextFor([{ roles: ['USER'] }]));
      expect(result.data?.tenantThing).toBeNull();
      expect(result.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    });

    it('raises UNAUTHENTICATED for the anonymous user', async () => {
      const result = await run('{ tenantThing }', contextFor([{ roles: ['ANON'] }]));
      expect(result.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
      // A field-level denial must not change the HTTP status of the response.
      expect(result.errors?.[0].extensions?.http).toBeUndefined();
    });

    it('raises UNAUTHENTICATED when there is no user at all', async () => {
      const result = await run('{ tenantThing }', { ...contextFor([]), user: null });
      expect(result.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('does not count a role held only inside an organization', async () => {
      const result = await run('{ tenantThing }', contextFor([{ roles: ['USER'] }, { roles: ['ADMIN'], org: 'org-1' }]));
      expect(result.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    });
  });

  describe('ORGANIZATION scope', () => {
    const orgAdmin = [{ roles: ['USER'] }, { roles: ['ORG_ADMIN'], org: 'org-1' }];

    it('allows the role in the organization named by orgArg', async () => {
      const result = await run('{ orgThing(organizationId: "org-1") }', contextFor(orgAdmin));
      expect(result.data?.orgThing).toBe('org-ok');
    });

    it('denies the same user for a different organization', async () => {
      const result = await run('{ orgThing(organizationId: "org-2") }', contextFor(orgAdmin));
      expect(result.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    });

    it('lets a tenant-wide holder of the role through (scope inheritance)', async () => {
      const result = await run('{ orgThing(organizationId: "org-2") }', contextFor([{ roles: ['USER', 'ORG_ADMIN'] }]));
      expect(result.data?.orgThing).toBe('org-ok');
    });

    it('denies when the organization argument is missing', async () => {
      const result = await run('{ orgThing }', contextFor(orgAdmin));
      expect(result.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    });

    it('reads a dotted orgArg path', async () => {
      const result = await run('{ nestedOrgThing(input: { organizationId: "org-1" }) }', contextFor(orgAdmin));
      expect(result.data?.nestedOrgThing).toBe('nested-ok');
    });
  });

  describe('BUSINESS_UNIT scope', () => {
    it('allows the role in the business unit', async () => {
      const ctx = contextFor([{ roles: ['USER'] }, { roles: ['BU_LEAD'], org: 'org-1', bu: 'bu-1' }]);
      const result = await run('{ buThing(organizationId: "org-1", businessUnitId: "bu-1") }', ctx);
      expect(result.data?.buThing).toBe('bu-ok');
    });

    it('allows the role held on the parent organization', async () => {
      const ctx = contextFor([{ roles: ['USER'] }, { roles: ['BU_LEAD'], org: 'org-1' }]);
      const result = await run('{ buThing(organizationId: "org-1", businessUnitId: "bu-9") }', ctx);
      expect(result.data?.buThing).toBe('bu-ok');
    });

    it('denies the role held on a sibling business unit', async () => {
      const ctx = contextFor([{ roles: ['USER'] }, { roles: ['BU_LEAD'], org: 'org-1', bu: 'bu-1' }]);
      const result = await run('{ buThing(organizationId: "org-1", businessUnitId: "bu-2") }', ctx);
      expect(result.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    });
  });

  describe('OBJECT application', () => {
    it('applies the type directive to fields without their own @auth', async () => {
      const result = await run('{ secured { inherited overridden } }', contextFor([{ roles: ['USER'] }]));
      expect(result.data?.secured).toEqual({ inherited: null, overridden: 'overridden-ok' });
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0].path).toEqual(['secured', 'inherited']);
      expect(result.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    });

    it('leaves undecorated fields alone', async () => {
      const result = await run('{ open }', contextFor([]));
      expect(result.data?.open).toBe('open-ok');
    });
  });

  describe(`${AUTH_DIRECTIVE_STRICT_FLAG} (legacy mode)`, () => {
    it('resolves a denied field to null without an error when the tenant opts out of strict', async () => {
      const ctx = contextFor([{ roles: ['USER'] }], {
        featureFlags: [{ feature: AUTH_DIRECTIVE_STRICT_FLAG, enabled: true, value: false }],
      });
      const result = await run('{ tenantThing }', ctx);
      expect(result.errors).toBeUndefined();
      expect(result.data?.tenantThing).toBeNull();
    });

    it('stays strict when the flag is disabled', async () => {
      const ctx = contextFor([{ roles: ['USER'] }], {
        featureFlags: [{ feature: AUTH_DIRECTIVE_STRICT_FLAG, enabled: false, value: false }],
      });
      const result = await run('{ tenantThing }', ctx);
      expect(result.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    });
  });
});
