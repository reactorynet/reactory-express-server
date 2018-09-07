import { ObjectId } from 'mongodb';
import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';
import { merge, isNil } from 'lodash';
import moment from 'moment';

import userResolvers from './UserResolver';
import orgnizationResolvers from './OrganizationResolver';
import assessmentResolvers from './AssessmentResolver';
import reactoryClientResolver from './ReactoryClient';
import leadershipBrandResolver from './LeadershipBrandResolver';
import surveyResolver from './SurveyResolver';
import scaleResolver from './ScaleResolver';

const resolvers = {
  Query: {
    apiStatus: (obj, args, context, info) => {
      const { user } = global;
      return {
        when: moment(),
        status: 'API OK',
        firstName: isNil(user) === false ? user.firstName : 'An',
        lastName: isNil(user) === false ? user.lastName : 'Anon',
        avatar: isNil(user) === false ? user.avatar : null,
        email: isNil(user) === false ? user.email : null,
        id: isNil(user) === false ? user._id : null,
      };
    },
  },
  ObjID: new GraphQLScalarType({
    name: 'ObjID',
    description: 'Id representation, based on Mongo Object Ids',
    parseValue(value) {
      if (value === null || value === undefined) return null;
      if (value instanceof String) return ObjectId(value);
      if (value instanceof ObjectId) return value;
      return null;
    },
    serialize(value) {
      if (value instanceof Object) {
        if (value.$oid) return value.$oid;
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
  Date: new GraphQLScalarType({
    name: 'Date',
    description: 'Date custom scalar type',
    parseValue(value) {
      return moment(value); // value from the client
    },
    serialize(value) {
      if (isNil(value) === true) return null;
      if (moment.isMoment(value) === true) return value.format();
      if (moment.isMoment(moment(value)) === true) return moment(value).format();
      console.warn('type not supported', value);
      return null;
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return parseInt(ast.value, 10); // ast value is always in string format
      }
      return null;
    },
  }),
};

merge(
  resolvers,
  userResolvers,
  orgnizationResolvers,
  assessmentResolvers,
  reactoryClientResolver,
  leadershipBrandResolver,
  surveyResolver,
  scaleResolver,
);


export default resolvers;
