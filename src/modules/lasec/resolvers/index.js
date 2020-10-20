import DashboardReolver from './Dashboard';
import QuoteResolver from './QuoteResolver';
import TeamResolver from './TeamResolver';
import AuthenticationResolver from './AuthenticationResolver';
import ProductResolver from './ProductResolver';
import CompanyResolver from './CompanyResolver';
import LasecUserResolver from './LasecUserResolver';
import CategoryResolver from './CategoryResolver';
import SalesOrderRevolver from './SalesOrderResolver';
import QuoteEmailResolver from '../forms/Quote/QuoteEmail/QuoteEmailResolver';

const toMerge = [
  DashboardReolver,
  QuoteResolver,
  TeamResolver,
  AuthenticationResolver,
  ProductResolver,
  CompanyResolver,
  LasecUserResolver,
  CategoryResolver, 
  SalesOrderRevolver,
  QuoteEmailResolver
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

