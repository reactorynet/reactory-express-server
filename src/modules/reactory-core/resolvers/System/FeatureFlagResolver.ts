import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import {
  resolver,
  query,
} from '@reactory/server-core/models/graphql/decorators/resolver';
import ReactoryFeatureFlagModel from '../../models/ReactoryFeatureFlag';

/**
 * Resolver for feature flag catalogue queries.
 * Exposes the full catalogue of registered feature flags
 * gathered from all modules.
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
}

export default FeatureFlagResolver;
