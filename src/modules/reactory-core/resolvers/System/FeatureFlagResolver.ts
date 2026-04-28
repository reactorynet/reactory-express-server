import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import {
  resolver,
  query,
} from '@reactory/server-core/models/graphql/decorators/resolver';
import ReactoryFeatureFlagModel from '../../models/ReactoryFeatureFlag';

/**
 * Test whether a flag value applies to a user given the user's role set.
 * The roles list on the flag is treated as OR semantics: an empty/missing
 * list means the flag applies regardless of role.
 */
function flagAppliesToRoles(
  flag: Reactory.Server.IReactoryFeatureFlagValue<unknown>,
  userRoles: string[],
): boolean {
  if (!flag.roles || flag.roles.length === 0) return true;
  return flag.roles.some((r) => userRoles.includes(r));
}

/**
 * Resolver for feature flag catalogue queries and per-user effective
 * feature flag resolution.
 */
@resolver
export class FeatureFlagResolver {
  resolver: any;

  @roles(['ADMIN'])
  @query('ReactoryFeatureFlagCatalogue')
  async featureFlagCatalogue(
    _obj: unknown,
    _args: unknown,
    context: Reactory.Server.IReactoryContext,
  ): Promise<Reactory.Server.IReactoryFeatureFlag[]> {
    context.log('Fetching feature flag catalogue');
    const flags = await ReactoryFeatureFlagModel.find({}).lean().exec();
    return flags as Reactory.Server.IReactoryFeatureFlag[];
  }

  /**
   * Returns the user's effective feature flags: the partner's declared
   * featureFlags array filtered by the user's role set so the client
   * receives only the flags it can act on.
   *
   * The PWA reads this via Apollo and caches the result for the
   * form-engine (and any future runtime feature-flag consumers) to read
   * synchronously from the cache. See docs/forms-engine in
   * reactory-pwa-client for the client-side integration.
   */
  @roles(['USER', 'ADMIN', 'DEVELOPER'])
  @query('ReactoryEffectiveFeatureFlags')
  async effectiveFeatureFlags(
    _obj: unknown,
    _args: unknown,
    context: Reactory.Server.IReactoryContext,
  ): Promise<Reactory.Server.IReactoryFeatureFlagValue<unknown>[]> {
    const partner = context.partner as
      | (Reactory.Models.IReactoryClient & {
          featureFlags?: Reactory.Server.IReactoryFeatureFlagValue<unknown>[];
        })
      | undefined;
    const flags = partner?.featureFlags;
    if (!flags || !Array.isArray(flags) || flags.length === 0) {
      return [];
    }
    const userRoles: string[] = (
      context.user as { memberships?: Array<{ roles?: string[] }> }
    )?.memberships?.flatMap((m) => m.roles ?? []) ?? [];
    return flags.filter((flag) => flagAppliesToRoles(flag, userRoles));
  }
}

export default FeatureFlagResolver;
