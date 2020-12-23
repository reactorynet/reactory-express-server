import fetch from 'node-fetch';
import { ApolloClient } from 'apollo-client';
import { createHttpLink } from 'apollo-link-http';
import { setContext } from 'apollo-link-context';
import { InMemoryCache } from 'apollo-cache-inmemory';
import gql from 'graphql-tag';
import AuthConfig from '../authentication';
import { Reactory } from '@reactory/server-core/types/reactory';

const httpLink = createHttpLink({
  uri: `${process.env.API_URI_ROOT}${process.env.API_URI_ROOT.endsWith('/') ? 'api' : '/api'}`,
  fetch: fetch 
});

const authLink = setContext((_, { headers }) => {
  // get the authentication token from local storage if it exists  
  // return the headers to the context so httpLink can read them
  
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  }
});

const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
});

export const clientFor = (user: Reactory.IUser, partner: Reactory.IPartner) => {
  
  return new ApolloClient({
    link: setContext((_, { headers }) => {
      // get the authentication token from local storage if it exists  
      // return the headers to the context so httpLink can read them
      const token = AuthConfig.jwtMake(AuthConfig.jwtTokenForUser(user));
      return {
        headers: {
          ...headers,
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'en-US,en;q=0.9,af;q=0.8,nl;q=0.7',
          'User-Agent': 'Reactory Server',
          'content-type': 'application/json',
          'Origin': `http://${process.env.SERVER_ID}`,
          'Host': process.env.SERVER_ID,
          'Referer': process.env.SERVER_ID,
          'x-client-key': partner.key,
          'x-reactory-pass': `${partner.password}+${partner.salt}`,
          'authorization': token ? `Bearer ${token}` : "",
        }
      }
    }).concat(httpLink),
    cache: new InMemoryCache(),
  });
};

export const ql = gql;

export const execql = async (query: string, variables = {}, options = {}, user = global.user, partner = global.partner) => {  
  return await clientFor(user, partner).query({
    query: gql(query), 
    variables
  }).then();

};

export const execml = async (mutation: string, variables = {}, options = {}, user = global.user, partner = global.partner) => {
  return await clientFor(user, partner).mutate({ mutation: gql(mutation), variables, ...options }).then();
};