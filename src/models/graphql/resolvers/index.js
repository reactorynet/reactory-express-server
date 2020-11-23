
import co from 'co';
import { ObjectId } from 'mongodb';
import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql/language';
import { merge, isNil, isArray, sortBy, filter, intersection } from 'lodash';
import moment from 'moment';

import { execql } from '@reactory/server-core/graph/client';

import orgnizationResolvers from './OrganizationResolver';
import assessmentResolvers from './AssessmentResolver';
import reactoryClientResolver from './ReactoryClient';
import leadershipBrandResolver from './LeadershipBrandResolver';
import projectResolver from './ProjectResolver';
import scaleResolver from './ScaleResolver';
import { MenuItem, Menu, ClientComponent, User, ReactoryClient } from '../../../models';
import logger from '../../../logging';
import { UserValidationError } from '../../../exceptions';

import modules from '../../../modules';

const packageJson = require('../../../../package.json');

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
    id: (status) => {
      return status.id || 'anon'
    },
    menus: (status) => {
      logger.debug('Getting menus');
      return Menu.find({ client: ObjectId(status.menus) });
    },
    server: (status) => {

      return {
        id: process.env.SERVER_ID || 'reactory.local',
        version:  packageJson.version,
        started:  global.REACTORY_SERVER_STARTUP,
        license: packageJson.license || 'NONE',
        access: 'open',
        administrator: process.env.REACTORY_ADMIN || 'none',
        contact: process.env.REACTORY_ADMIN_CONTANCT || 'none',
        mode: process.env.MODE,
        clients: ReactoryClient.find({ _id: { $in: global.user.memberships.map((m) => m.clientId) }}).then()
      }
    }
  },
  Query: {
    apiStatus: async (obj, args, context, info) => {
      const { user, partner } = global;   
      let skipResfresh = false;
      let _user = user;
      let isAnon = false;
      let uxmessages = [];

      const roles = [];
      const alt_roles = [];
      const memberships = isArray(user.memberships) === true ? user.memberships : [];

      if(user.anon === true) {
        skipResfresh = true;
        isAnon = true;
        roles.push('ANON');
      }

      
      if(skipResfresh === false && isAnon === false) {
        logger.debug(`apiStatus called for ${user.firstName} ${user.lastName}, performing profile refresh`);
         
        try {
          const refreshResult = await execql(`
          query RefreshProfile($id:String, $skipImage: Boolean) {
            refreshProfileData(id: $id, skipImage: $skipImage) {
              user {
                id
                fullNameWithEmail
                avatar 
                authentications {
                  id
                  provider
                  props
                }      
              }
              messages {
                id
                title
                text
                data
                via
                icon
                actions {
                  id
                  action
                  title
                  icon
                  componentFqn
                  componentProps
                  modal
                  modalSize
                  priority
                }                
              }
            }
          }
        `).then();
        
        if(refreshResult && refreshResult.data && refreshResult.data.refreshProfileData) {          
          const { user, messages } = refreshResult.data.refreshProfileData;          
          uxmessages = [ ...uxmessages, ...messages ];
          logger.debug(`Result from profile refresh ${user.fullNameWithEmail}, has ${uxmessages.length} messages`);
        }
        } catch (profileRefreshError) {
          logger.error(`Error refreshing profile data for user ${user.firstName}`, profileRefreshError);
        }                        
      }
      
      if(isAnon === false) {

        const login_partner_keys_setting = partner.getSetting("login_partner_keys", {
          partner_keys: [partner.key, 'reactory'],
          defaultAction: 'add_default_membership',
          organization_excludes: [],
          organization_includes: [],
        }, true, "core.ReactoryPartnerKeysConfig");
  
        const login_partner_keys = login_partner_keys_setting.data; 
  
        logger.debug(`Partner has Keys (${login_partner_keys.partner_keys.length})`);
        //get a list of all partner / cross partner logins allowed
        const partnerLogins = await ReactoryClient.find({ key: { $in: [ ...login_partner_keys.partner_keys ] } }).then();
      
        let root_partner_memberships = filter(memberships, { clientId: partner._id });
        logger.debug(`${user.firstName} has (${root_partner_memberships.length})`);
                
        root_partner_memberships.forEach((membership) => {        
          if (isArray(membership.roles)) {
            membership.roles.forEach((r) => { 
              roles.push(r); 
            });
          }        
        });       
        
  
        partnerLogins.forEach((alt_partner) => {
          const alt_partner_memberships = filter(memberships, { clientId: alt_partner._id });
          
          alt_partner_memberships.forEach((alt_partner_membership) => {
            if (isArray(alt_partner_membership.roles)) {
              
              if(roles.length === 0) {
                logger.debug(`${user.fullName} did not have a membership for ${partner.name} - assigning default roles`);
                //we have no roles in the primary partner, 
                //but we have one or more roles on the alt_partner
                //so we create our OWN PARTNER default role for the user and add the membership.
                let _default_roles = partner.getSetting('new_user_roles', ['USER'], true, 'core.SecurityNewUserRolesForReactoryClient');
                roles.push(_default_roles || 'USER');
                _default_roles.data.forEach(r => user.addRole(partner._id,r, null, null ));              
              }
  
              alt_partner_membership.roles.forEach((r) => { 
                alt_roles.push(`${r}\\${alt_partner._id.toString()}\\${alt_partner_membership.clientId}\\${alt_partner_membership.organizationId || '*'}\\${alt_partner_membership.organizationId || '*'}`);           
              });
            }
          });        
        });

      }      
      
      let navigationComponents = [];
      const settingKey = `navigation_components/${process.env.MODE}`;
      const navigationComponentsSetting = partner.getSetting(settingKey, [], false);      

      if(navigationComponentsSetting && navigationComponentsSetting.data) {
        navigationComponents = [ ...navigationComponentsSetting.data ];
      }
      
      return {
        when: moment(),
        status: 'API OK',        
        firstName: isNil(user) === false ? user.firstName : 'An',
        lastName: isNil(user) === false ? user.lastName : 'Anon',
        avatar: isNil(user) === false ? user.avatar : null,
        email: isNil(user) === false ? user.email : null,
        id: isNil(user) === false ? user._id : null,
        roles,
        alt_roles,
        memberships: isNil(user) === false && isArray(user.memberships) ? user.memberships : [],
        organization: user.organization,
        routes: (partner.routes || []).map((route) => {
          if(!route.roles) return route;          
          if(intersection(route.roles, route.roles).length > 0) return route;
        }),
        applicationAvatar: partner.avatar,
        applicationName: partner.name,
        menus: partner._id,
        theme: partner.theme,
        themeOptions: partner.themeOptions || {},
        themes: [],
        colorSchemes: {
          primary: partner.colorScheme(partner.themeOptions.palette.primary.main.replace('#', '')),
          secondary: partner.colorScheme(partner.themeOptions.palette.primary.main.replace('#', '')),
        },
        messages: uxmessages, 
        navigationComponents       
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

const installedModulesResolvers = [];

modules.enabled.forEach((installedModule) => {
  if (installedModule.graphDefinitions) {
    logger.debug(`Extending Reactory Graph Resolvers with ${installedModule.name}`);
    if (installedModule.graphDefinitions.Resolvers) {
      installedModulesResolvers.push(installedModule.graphDefinitions.Resolvers);
    }
  }
});


merge(
  resolvers,  
  orgnizationResolvers,
  assessmentResolvers,
  reactoryClientResolver,
  leadershipBrandResolver,
  scaleResolver,
  projectResolver,
  require('./BusinessUnitResolver').default,
  require('./Custom/PaymentGatewayResolver').default,
  require('./TeamResolver').default,
  //require('./Template').default,
  require('./System/Statistics').default,
  ...installedModulesResolvers,
);


export default resolvers;
