import { ApolloCache, InMemoryCache, InMemoryCacheConfig, makeVar } from '@apollo/client';
import Reactory from '@reactory/reactory-core';

const config: InMemoryCacheConfig = {}

export type ReactoryCachePersistor = { 
  purge: () => void
}

export type ReactoryCache = { 
  cache: ApolloCache<{}>,
  persistor: ReactoryCachePersistor
}

export const cache: InMemoryCache = new InMemoryCache(config);

export const getCache = async (context: Reactory.Server.IReactoryContext): Promise<ReactoryCache> => {

  return  { 
    cache,
    persistor: {
      purge: () => cache.restore
    }
  }
};

