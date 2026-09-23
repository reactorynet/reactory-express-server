import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils';
import Reactory from '@reactorynet/reactory-core';
import { GraphQLError, GraphQLSchema, defaultFieldResolver } from 'graphql';
import lodash from 'lodash';
import logger from '@reactory/server-core/logging';

/**
 * `@auth(roles, scope, orgArg, buArg)` schema directive.
 *
 *   directive @auth(
 *     roles: [String] = ["USER"],
 *     scope: AuthScope = TENANT,
 *     orgArg: String,
 *     buArg: String
 *   ) on OBJECT | FIELD_DEFINITION
 *
 * - `roles`: the caller needs any one of them.
 * - `scope`: where the role must be held.
 *     TENANT         membership on the request's tenant (partner).
 *     ORGANIZATION   membership on the organisation named by the `orgArg`
 *                    argument, or a tenant-wide membership.
 *     BUSINESS_UNIT  membership on the business unit named by `buArg` (within
 *                    `orgArg` when given), or on that organisation, or a
 *                    tenant-wide membership.
 *   A narrower scope inherits from the wider one, so a tenant ADMIN keeps
 *   access to every organisation. A scoped check whose argument is missing
 *   from the request is denied.
 * - `orgArg` / `buArg`: resolver argument holding the id. Dotted paths
 *   (`input.organizationId`) are allowed.
 *
 * On OBJECT the directive applies to every field of the type that does not
 * carry its own `@auth`.
 *
 * Denial throws a GraphQLError with `extensions.code`:
 *   UNAUTHENTICATED  no user, or the anonymous user
 *   FORBIDDEN        signed-in user without the role at the required scope
 *
 * Tenants can keep the legacy behaviour (field resolves to `null` on denial)
 * for one release by setting the feature flag `core.AuthDirectiveStrict@1.0.0`
 * to `enabled: true, value: false`. Strict is the default.
 */

export type AuthScope = 'TENANT' | 'ORGANIZATION' | 'BUSINESS_UNIT';

export interface AuthDirectiveArgs {
  roles?: string[];
  scope?: AuthScope;
  orgArg?: string;
  buArg?: string;
}

export const AUTH_DIRECTIVE_STRICT_FLAG = 'core.AuthDirectiveStrict@1.0.0';

const ANON_USER_IDS = ['anon'];

export const isAnonymous = (context: Reactory.Server.IReactoryContext): boolean => {
  const user: any = context?.user;
  if (!user) return true;
  if (user.anon === true) return true;
  if (ANON_USER_IDS.includes(String(user.id ?? '')) || ANON_USER_IDS.includes(String(user._id ?? ''))) return true;
  // The PWA's anonymous account is a real user holding only ANON.
  try {
    return context.hasRole('ANON') === true
      && context.hasRole('USER') !== true
      && context.hasRole('ADMIN') !== true;
  } catch {
    return false;
  }
};

/**
 * Strict unless the tenant pinned the legacy behaviour through the
 * `core.AuthDirectiveStrict@1.0.0` feature flag.
 */
export const isStrict = (context: Reactory.Server.IReactoryContext): boolean => {
  const flags: any[] = (context?.partner as any)?.featureFlags;
  if (!Array.isArray(flags)) return true;
  const flag = flags.find((f) => f && f.feature === AUTH_DIRECTIVE_STRICT_FLAG);
  if (!flag || flag.enabled === false) return true;
  return flag.value !== false;
};

const idFrom = (args: any, path?: string): string | undefined => {
  if (!path) return undefined;
  const value = lodash.get(args, path);
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'object' && value._id) return String(value._id);
  if (typeof value === 'object' && value.id) return String(value.id);
  return String(value);
};

const asDoc = (id?: string): any => (id ? { _id: id } : undefined);

/**
 * Evaluate the directive for one resolver call. Exported for unit tests.
 */
export const isPermitted = (
  directive: AuthDirectiveArgs,
  args: any,
  context: Reactory.Server.IReactoryContext,
): boolean => {
  const roles = directive.roles && directive.roles.length > 0 ? directive.roles : ['USER'];
  const scope: AuthScope = directive.scope || 'TENANT';
  const partner = context.partner as any;

  const holds = (organizationId?: string, businessUnitId?: string) =>
    roles.some((role) => context.hasRole(role, partner, asDoc(organizationId), asDoc(businessUnitId)) === true);

  switch (scope) {
    case 'ORGANIZATION': {
      const organizationId = idFrom(args, directive.orgArg);
      if (!organizationId) return false;
      return holds(organizationId) || holds();
    }
    case 'BUSINESS_UNIT': {
      const businessUnitId = idFrom(args, directive.buArg);
      if (!businessUnitId) return false;
      const organizationId = idFrom(args, directive.orgArg);
      if (organizationId && (holds(organizationId, businessUnitId) || holds(organizationId))) return true;
      return holds(undefined, businessUnitId) || holds();
    }
    case 'TENANT':
    default:
      return holds();
  }
};

const deny = (
  context: Reactory.Server.IReactoryContext,
  typeName: string,
  fieldName: string,
  directive: AuthDirectiveArgs,
): GraphQLError => {
  const anonymous = isAnonymous(context);
  const code = anonymous ? 'UNAUTHENTICATED' : 'FORBIDDEN';
  logger.warn(`@auth denied ${typeName}.${fieldName} (${code})`, {
    roles: directive.roles,
    scope: directive.scope || 'TENANT',
    user: (context?.user as any)?._id?.toString?.(),
    partner: (context?.partner as any)?.key,
  });
  return new GraphQLError(
    anonymous
      ? `You must be signed in to access ${typeName}.${fieldName}`
      : `You do not have permission to access ${typeName}.${fieldName}`,
    // No `http.status` override: a denied field must not turn the whole
    // response into a non-2xx. Apollo Client treats that as a network error,
    // and the PWA reads a 401 as an expired session and signs in again.
    { extensions: { code } },
  );
};

const authDirective = (schema: GraphQLSchema): GraphQLSchema => {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName, typeName) => {
      const fieldDirective = getDirective(schema, fieldConfig, 'auth')?.[0] as AuthDirectiveArgs | undefined;
      const parentType = schema.getType(typeName);
      const typeDirective = parentType
        ? (getDirective(schema, parentType as any, 'auth')?.[0] as AuthDirectiveArgs | undefined)
        : undefined;
      const directive = fieldDirective || typeDirective;

      if (!directive) return fieldConfig;

      const { resolve = defaultFieldResolver } = fieldConfig;
      return {
        ...fieldConfig,
        resolve: async function (source: any, args: any, context: Reactory.Server.IReactoryContext, info: any) {
          if (isPermitted(directive, args, context)) {
            return resolve(source, args, context, info);
          }
          if (!isStrict(context)) {
            return null;
          }
          throw deny(context, typeName, fieldName, directive);
        },
      };
    },
  });
};

const authDirectiveProvider: Reactory.Graph.IGraphDirectiveProvider = {
  name: 'auth',
  transformer: authDirective,
};

export { authDirective };
export default authDirectiveProvider;
