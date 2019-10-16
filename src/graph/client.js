import { ApolloClient } from 'apollo-client';
import { createHttpLink } from 'apollo-link-http';
import { setContext } from 'apollo-link-context';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { gql } from 'graphql';
import AuthConfig from '../authentication';

const httpLink = createHttpLink({
  uri: `${process.env.API_URI_ROOT}/api`,
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

export const clientFor = (user, partner) => {
  
  return new ApolloClient({
    link: setContext((_, { headers }) => {
      // get the authentication token from local storage if it exists  
      // return the headers to the context so httpLink can read them
      const token = AuthConfig.jwtMake(AuthConfig.jwtTokenForUser(user));
      return {
        headers: {
          ...headers,
          'x-client-key': partner.key,
          'x-reactory-pass': `${partner.password}+${partner.salt}`,
          authorization: token ? `Bearer ${token}` : "",
        }
      }
    }).concat(httpLink),
    cache: new InMemoryCache(),
  });
};

export const ql = gql;