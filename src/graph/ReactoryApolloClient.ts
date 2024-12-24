import fetch from 'node-fetch';
import { 
  ApolloClient,
  Resolvers,
  split,
  NormalizedCacheObject, 
  ApolloCache,
  HttpLink,
  ApolloQueryResult,
  FetchResult,
} from '@apollo/client';

import { createClient } from 'graphql-ws'
import { GraphQLWsLink  } from "@apollo/client/link/subscriptions";
import { setContext } from "@apollo/client/link/context";
import { getMainDefinition } from '@apollo/client/utilities';

import gql from 'graphql-tag';
import Helpers from '@reactory/server-core/authentication/strategies/helpers';
import Reactory from '@reactory/reactory-core';
import { getCache, ReactoryCachePersistor } from './ReactoryApolloCache';

const packageInfo: any = require('../../package.json');

export const clientFor = async (context: Reactory.Server.IReactoryContext): Promise<ApolloClient<NormalizedCacheObject>> => {

  // return new ApolloClient({
  //   link: setContext((_, { headers }) => {
  //     // get the authentication token from local storage if it exists  
  //     // return the headers to the context so httpLink can read them
  //     const token = AuthConfig.jwtMake(AuthConfig.jwtTokenForUser(user));
  //     return {
  //       headers: {
  //         ...headers,
  //         'Accept-Encoding': 'gzip, deflate, br',
  //         'Accept-Language': 'en-US,en;q=0.9,af;q=0.8,nl;q=0.7',
  //         'User-Agent': 'Reactory Server',
  //         'content-type': 'application/json',
  //         'Origin': `http://${process.env.SERVER_ID}`,
  //         Host: process.env.SERVER_ID,
  //         Referer: process.env.SERVER_ID,
  //         'x-client-key': partner.key,
  //         'x-reactory-pass': `${partner.password}+${partner.salt}`,
  //         'authorization': token ? `Bearer ${token}` : "",
  //       }
  //     }
  //   }).concat(httpLink),
  //   cache: new InMemoryCache(),
  // });
  const token = Helpers.jwtTokenForUser(context.user);
  let persistedCache: any = null;
  let cache: ApolloCache<{}> = null;
  let persistor: ReactoryCachePersistor = null;
  try {
    persistedCache = await getCache(context);
    cache = persistedCache.cache ? persistedCache.cache : null;
    persistor = persistedCache.persistor ? persistedCache.persistor : null;
  } catch (cacheGetError) {
    context.error(`${cacheGetError.message}`);
  }

  const clearCache = () => {
    if (!persistor) return;
    persistor.purge();
  }

  const authLink = setContext((_, { headers }) => {
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : "",
        'x-client-key': `${process.env.REACT_APP_CLIENT_KEY}`,
        'x-client-pwd': `${process.env.REACT_APP_CLIENT_PASSWORD}`,
        'x-client-version': `${packageInfo.version}`,
        'x-client-name': packageInfo.name
      }
    }
  });

  // const uploadLink = createUploadLink({
  //   uri: `${localStorage.getItem('REACT_APP_API_ENDPOINT')}/graph`,
  //   fetch: fetch
  // });

  let clientTypeDefs: string[] = [];
  let resolvers: Resolvers[] = [];

  createClient({  
    url: `${process.env.API_URI_ROOT}graph`.replace('http', 'ws'),    
    retryAttempts: 5,
    connectionParams: {
      Authorization: `Bearer ${token}`,
      authToken: token
    }    
  })

  const ws_client = createClient({
    url: `${process.env.API_URI_ROOT}graph`.replace('http', 'ws'),
    retryAttempts: 5,
    connectionParams: {
      Authorization: `Bearer ${token}`,
      authToken: token
    }
  })

  const ws_link = new GraphQLWsLink(ws_client);

  const splitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === 'OperationDefinition' &&
        definition.operation === 'subscription'
      );
    },
    ws_link,
    authLink,
  );

  const client: ApolloClient<NormalizedCacheObject> = new ApolloClient<NormalizedCacheObject>({
    link: splitLink,//authLink.concat(uploadLink),
    cache,
    defaultOptions: {

      watchQuery: {
        fetchPolicy: 'network-only',
        errorPolicy: 'ignore',
      },

      query: {
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
      },

      mutate: {
        errorPolicy: 'all',
      },
    },
    typeDefs: clientTypeDefs,
    resolvers: resolvers,
    assumeImmutableResults: false,
  });


  return client;

};

export const ql = gql;

export const queryGraph = async (query: string, variables = {}, options = {}, context: Reactory.Server.IReactoryContext): Promise<ApolloQueryResult<any>> => {
  const client = await clientFor(context);
  return await client.query({
    query: gql(query),
    variables
  });
};

export const mutateGraph = async (mutation: string, variables = {}, options = {}, context: Reactory.Server.IReactoryContext): Promise<FetchResult<any, Record<string, any>, Record<string, any>>> => {
  const client = await clientFor(context);
  return await client.mutate({ mutation: gql(mutation), variables, ...options }).then();
};