import Reactory from '@reactorynet/reactory-core';
import { resolver, property } from '@reactory/server-core/models/graphql/decorators/resolver';
import { integrityForCdnUri } from '@reactory/server-core/utils/url/subresourceIntegrity';

type WithIntegrity = { uri?: string; integrity?: string | null };

/**
 * `integrity` for the scripts the client injects: application plugins and
 * form UI resources, compiled modules included (WP-C4). An explicit value on
 * the record wins, for a plugin hosted elsewhere; otherwise it is the hash of
 * the file this server's CDN serves, recomputed when the file changes.
 */
const integrityOf = (record: WithIntegrity): string | null =>
  record?.integrity || integrityForCdnUri(record?.uri);

// @ts-ignore - resolver() is a marker decorator
@resolver
class SubresourceIntegrityResolver {
  resolver: any;

  @property('ApplicationPlugin', 'integrity')
  pluginIntegrity(plugin: Reactory.Platform.IReactoryApplicationPlugin & WithIntegrity): string | null {
    return integrityOf(plugin);
  }

  @property('ReactoryFormUIResource', 'integrity')
  resourceIntegrity(resource: Reactory.Forms.IReactoryFormResource & WithIntegrity): string | null {
    return integrityOf(resource);
  }
}

export default SubresourceIntegrityResolver;
