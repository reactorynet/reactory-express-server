import Reactory from '@reactorynet/reactory-core';
import { roles } from '@reactory/server-core/authentication/decorators';
import { resolver, query } from '@reactory/server-core/models/graphql/decorators/resolver';
import { buildRoleCatalogue, IReactoryRoleCatalogue } from '../../roles';

/**
 * Resolver for the backend role catalogue.
 *
 * The catalogue is derived from the modules loaded for the current context, so
 * it always matches what the server can actually enforce. It is used by the
 * application administration UI to distinguish roles that are provided by the
 * backend from roles an application has been configured with but that nothing
 * provides.
 */
// `resolver` is a no-op class decorator that returns undefined, so it must be
// applied bare. The cast satisfies TS1329 without emitting `resolver()` (which
// would crash at module load with "_dec is not a function").
@(resolver as unknown as ClassDecorator)
export class ReactoryRoleResolver {
  resolver: any;

  @roles(['ADMIN'])
  @query('ReactoryRoleCatalogue')
  async roleCatalogue(
    _obj: unknown,
    _args: unknown,
    context: Reactory.Server.IReactoryContext,
  ): Promise<IReactoryRoleCatalogue> {
    const catalogue = buildRoleCatalogue(context.modules);
    context.debug(
      `Role catalogue resolved: ${catalogue.roles.length} roles across ${catalogue.modules.length} modules`,
    );
    return catalogue;
  }
}

export default ReactoryRoleResolver;
