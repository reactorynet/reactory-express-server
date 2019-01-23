
import co from 'co';
import { ObjectId } from 'mongodb';
import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';
import { merge, isNil, isArray, sortBy } from 'lodash';
import moment from 'moment';

import userResolvers from './UserResolver';
import orgnizationResolvers from './OrganizationResolver';
import assessmentResolvers from './AssessmentResolver';
import reactoryClientResolver from './ReactoryClient';
import leadershipBrandResolver from './LeadershipBrandResolver';
import surveyResolver from './SurveyResolver';
import projectResolver from './ProjectResolver';
import scaleResolver from './ScaleResolver';
import { MenuItem, Menu, ClientComponent, User } from '../../../models';
import logger from '../../../logging';
import { UserValidationError } from '../../../exceptions';

const getComponentWithFqn = (fqn) => {
  const parts = fqn.split('@');
  const v = parts[1];
  const ns = parts[0].split('.')[0];
  const nm = parts[0].split('.')[1];

  return ClientComponent.find({ nameSpace: ns, name: nm, version: v });
};

const resolvers = {
  MenuItem: {
    id: menuItem => menuItem._id,
  },
  Menu: {
    id: menu => (menu._id.toString() || null),
    key: menu => (menu.key || 'na'),
    name: menu => (menu.name || 'na'),
    target: menu => (menu.target || 'na'),
    roles: menu => menu.roles || [],
    entries: menu => sortBy(menu.entries, 'ordinal'),
  },
  ComponentArgs: {
    key: arg => arg.key,
    value: arg => arg.value,
  },
  ClientComponent: {
    id: component => component._id,
    name: component => component.name,
    nameSpace: component => component.nameSpace,
    version: component => component.version,
    title: component => component.title,
    description: component => component.description,
    args: component => component.args,
    author: component => User.findById(component.author),
  },
  ClientRoute: {
    id: route => route._id,
    path: route => route.path,
    roles: route => route.roles,
    component: (route) => {
      debugger //eslint-disable-line
      if (!route.componentFqn) {
        return {
          nameSpace: 'core',
          name: 'EmptyComponent',
          version: '1.0.0',
          title: `Component for Route ${route.path} not defined, check settings`,
        };
      }
      return getComponentWithFqn(route.componentFqn);
    },
  },
  ApiStatus: {
    menus: (status) => {
      logger.debug('Getting menus');
      return Menu.find({ client: ObjectId(status.menus) });
    },
  },
  Query: {
    apiStatus: (obj, args, context, info) => {
      const { user, partner } = global;

      return {
        when: moment(),
        status: 'API OK',
        firstName: isNil(user) === false ? user.firstName : 'An',
        lastName: isNil(user) === false ? user.lastName : 'Anon',
        avatar: isNil(user) === false ? user.avatar : null,
        email: isNil(user) === false ? user.email : null,
        id: isNil(user) === false ? user._id : null,
        roles: isNil(user) === false && isArray(user.memberships) && user.memberships.length > 0 ? user.memberships[0].roles : ['ANON'],
        memberships: isNil(user) === false && isArray(user.memberships) ? user.memberships : [],
        organization: user.organization,
        routes: partner.routes || [],
        applicationAvatar: partner.avatar,
        applicationName: partner.name,
        menus: partner._id,
        theme: partner.theme,
        themeOptions: partner.themeOptions || {},
      };
    },
  },
  Any: new GraphQLScalarType({
    name: 'Any',
    description: 'Arbitrary object',
    parseValue: (value) => {
      return typeof value === 'object' ? value
        : typeof value === 'string' ? JSON.parse(value)
          : null;
    },
    serialize: (value) => {
      return typeof value === 'object' ? value
        : typeof value === 'string' ? JSON.parse(value)
          : null;
    },
    parseLiteral: (ast) => {
      switch (ast.kind) {
        case Kind.STRING: return JSON.parse(ast.value);
        case Kind.OBJECT: throw new Error('Not sure what to do with OBJECT for ObjectScalarType');
        default: return null;
      }
    },
  }),
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
  projectResolver,
  require('./BusinessUnitResolver').default,
  require('./Custom/PaymentGatewayResolver').default,
  require('./TeamResolver').default,
);


export default resolvers;
