import { ObjectId } from 'mongodb';
import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';
import { merge } from 'lodash';
import moment from 'moment';

import userResolvers from './UserResolver';
import orgnizationResolvers from './OrganizationResolver';
import assessmentResolvers from './AssessmentResolver';

let resolvers = {
  Query : {
    apiStatus: () => { 
      console.log('Checking API status');
      return {
        when: moment(),
        status: `API OK`
      }
    }
  },
  ObjID: new GraphQLScalarType({
    name: 'ObjID',
    description: 'Id representation, based on Mongo Object Ids',
    parseValue(value) {
      console.log('Parsing scalar value', value)
      if(value === null || value === undefined ) return null;

      if(value instanceof String) return ObjectId(value);

      if(value instanceof ObjectId) return value;      
    },
    serialize(value) {
      if(value instanceof Object) {
        if(value.$oid) return value.$oid;         
      }      

      return value.toString();
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) {
        return ObjectId(ast.value);
      }
      return ast.value;
    },
  }),
  Date : new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    parseValue(value) {
      return new moment(value); // value from the client
    },
    serialize(value) {
      return value.format(); // value sent to the client
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return parseInt(ast.value, 10); // ast value is always in string format
      }
      return null;
    },
  }),    
};

merge( resolvers, userResolvers, orgnizationResolvers, assessmentResolvers );


export default resolvers;
