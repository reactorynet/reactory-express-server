import QuoteResolver from './QuoteResolver';
import TeamResolver from './TeamResolver';
import AuthenticationResolver from './AuthenticationResolver';
import ProductResolver from './ProductResolver';

const toMerge = [
  QuoteResolver,
  TeamResolver,
  AuthenticationResolver,
  ProductResolver
];

let resolvers = {
  Query: {

  },
  Mutation: {

  }
};

['Query', 'Mutation'].map( ( p ) => {

  toMerge.map( resolver => {
    if(resolver[p]) {
      resolvers[p] = { ...resolvers[p], ...resolver[p] };
    }

    delete resolver[p];
    resolvers = { ...resolvers, ...resolver };
  });

});

export default resolvers;

