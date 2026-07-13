import Reactory from '@reactorynet/reactory-core';
import {
  ISearchProvider,
  ISearchProviderConstructor,
  SearchProviderConfig,
  SearchProviderId,
} from '../types';
import MeiliSearchProvider from './MeiliSearchProvider';
import ElasticSearchProvider from './ElasticSearchProvider';

export { MeiliSearchProvider, ElasticSearchProvider };

/**
 * Registry of known search providers. Additional backends can be registered at
 * runtime via `registerSearchProvider`.
 */
const registry: Record<string, ISearchProviderConstructor> = {
  meilisearch: MeiliSearchProvider,
  elasticsearch: ElasticSearchProvider,
};

/** The default backend when none is configured. MeiliSearch drives local dev. */
export const DEFAULT_SEARCH_PROVIDER: SearchProviderId = 'meilisearch';

/** Register (or override) a provider implementation by id. */
export const registerSearchProvider = (
  id: string,
  ctor: ISearchProviderConstructor,
): void => {
  registry[id.toLowerCase()] = ctor;
};

/** List the ids of all registered providers. */
export const listSearchProviders = (): string[] => Object.keys(registry);

/**
 * Instantiate a search provider by id. Falls back to the default provider and
 * logs a warning when an unknown id is requested, so a mis-set env var can
 * never take search offline.
 */
export const createSearchProvider = (
  id: string | undefined,
  config: SearchProviderConfig,
  context: Reactory.Server.IReactoryContext,
): ISearchProvider => {
  const key = (id || DEFAULT_SEARCH_PROVIDER).toLowerCase();
  let Ctor = registry[key];
  if (!Ctor) {
    context.warn?.(
      `Unknown search provider '${id}', falling back to '${DEFAULT_SEARCH_PROVIDER}'`,
    );
    Ctor = registry[DEFAULT_SEARCH_PROVIDER];
  }
  return new Ctor(config, context);
};
