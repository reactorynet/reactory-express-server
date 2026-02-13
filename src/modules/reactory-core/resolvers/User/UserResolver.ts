import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver';
import { roles } from '@reactory/server-core/authentication/decorators';
import Reactory from '@reactory/reactory-core';
import { ObjectId } from 'mongodb';
import lodash from 'lodash';
import crypto from 'crypto';
import { PagedUserResults, ReactoryUserFilterInput, ReactoryUserQueryFailed, ReactoryUserQueryResult } from './types';

//@ts-ignore
@resolver
class UserResolver {
  // --- User Type Properties ---
  @property('User', 'id')
  id(obj: { _id: any }) {
    return obj._id;
  }

  @property('User', 'avatar')
  avatar(obj: { avatar: string, _id: any }) {
    if (obj.avatar && obj.avatar.length > 0) {
      if (obj.avatar.startsWith('http')) {
        return obj.avatar;
      }
      return `${process.env.CDN_ROOT}profiles/${obj._id}/${obj.avatar}`;
    }
    return `${process.env.CDN_ROOT}profiles/default/default.png`;
  }

  @property('User', 'fullName')
  fullName(user: { fullName: () => any; firstName: any; lastName: any }) {
    if (!user) return 'null-user';
    if (typeof user.fullName === 'function') return user.fullName();
    return `${user.firstName} ${user.lastName}`;
  }

  @property('User', 'fullNameWithEmail')
  fullNameWithEmail(user: { firstName: any; lastName: any; email: any }) {
    const { firstName, lastName, email } = user;
    return `${firstName} ${lastName}<${email}>`;
  }

  @property('User', 'peers')
  async peers(usr: Reactory.Models.IUserDocument, args: any, context: Reactory.Server.IReactoryContext) {
    if (usr && usr?.memberships?.length > 0 && usr.memberships[0]?.organizationId) {
      return context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0').getUserPeers(usr._id, usr.memberships[0]?.organizationId);
    }
    return null;
  }

  @property('User', 'memberships')
  memberships(usr: { memberships: Reactory.Models.IMembership[] }, args: any, context: Reactory.Server.IReactoryContext) {
    // For admin users or when memberships are requested in admin contexts,
    // return all memberships. Otherwise filter by current partner for security.
    if (context?.user?.hasRole && context.user.hasRole(context.partner._id, 'ADMIN')) {
      return usr.memberships || [];
    }
    
    if (Array.isArray(usr.memberships)) {
      return lodash.filter(usr.memberships, {
        clientId: context.partner._id,
      });
    }
    return [];
  }

  @property('User', 'deleted')
  deleted(user: { deleted: any }) {
    return user.deleted || false;
  }

  @property('User', 'mobileNumber')
  mobileNumber(user: { mobileNumber: any }) {
    return user.mobileNumber || 'Not Set';
  }

  @property('User', 'authProvider')
  authProvider(user: { authProvider: any }) {
    return user.authProvider || 'LOCAL';
  }
  

  // --- Query Resolvers ---
  @query('allUsers')
  async allUsers(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    return context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0').listAllUsers();
  }

  @query('userWithId')
  async userWithId(obj: any, { id }: any, context: Reactory.Server.IReactoryContext) {
    return context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0').findUserById(id);
  }

  @query('userPeers')
  async userPeers(obj: any, { id, organizationId }: any, context: Reactory.Server.IReactoryContext) {
    if (!organizationId || organizationId === '*') return null;
    return context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0').getUserPeers(id, organizationId);
  }

  @query('authenticatedUser')
  authenticatedUser(obj: any, args: any, context: Reactory.Server.IReactoryContext) {
    return context.user;
  }

  @query('searchUser')
  async searchUser(parent: any, { searchString, sort = 'email' }: any, context: Reactory.Server.IReactoryContext) {
    return context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0').searchUser(searchString, sort);
  }

  @property('UserAuthentication', 'props')  
  userAuthProps(auth: { props: any }, context: Reactory.Server.IReactoryContext) {        
    if (auth.props) {
      const filteredProps: any = {};
      // we don't send any sensitive information back unless the user has elevated permissions
      const allowedKeys = ['lastLogin', 'loginCount', 'failedLoginAttempts', 'lockoutExpiry', 'twoFactorEnabled'];
      Object.keys(auth.props).forEach((key) => {
        if (allowedKeys.includes(key)) {
          filteredProps[key] = auth.props[key];
        }
      });
      return filteredProps;
    }
    return null;
  }

  // --- Mutation Resolvers ---
  @mutation('createUser')
  async createUser(
    obj: any,
    params: { input: any; organizationId: string; password?: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const { input, organizationId, password = crypto.randomBytes(16).toString('hex') } = params;
    const userService = context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0');
    return userService.createUserForOrganization(
      input,
      password,
      organizationId ? await userService.findOrganizationById(organizationId) : null,
      ['USER'],
      'LOCAL',
      context.partner,
      null
    ).then((result: any) => result.user);
  }

  @mutation('updateUser')
  async updateUser(obj: any, { id, profileData }: any, context: Reactory.Server.IReactoryContext) {
    return context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0').updateUser(profileData);
  }

  @mutation('setPassword')
  async setPassword(
    obj: any,
    { input: { password, confirmPassword, authToken } }: any,
    context: Reactory.Server.IReactoryContext
  ) {
    if (typeof password !== 'string') throw new Error('password expects string input');
    if (password !== confirmPassword) throw new Error('Passwords do not match');
    return context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0').setUserPassword(context.user._id, password, authToken);
  }

  @mutation('deleteUser')
  async deleteUser(parent: any, { id }: any, context: Reactory.Server.IReactoryContext) {
    return context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0').deleteUser(id);
  }

  @roles(['ADMIN'])
  @mutation('ReactoryCoreCreateUserForApplication')
  async ReactoryCoreCreateUserForApplication(
    obj: any,
    params: { input: any; clientId: string; password?: string; roles?: string[] },
    context: Reactory.Server.IReactoryContext
  ) {
    const { input, clientId, password = crypto.randomBytes(16).toString('hex'), roles: userRoles = ['USER'] } = params;
    const userService = context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0');
    const systemService = context.getService<Reactory.Service.IReactorySystemService>('core.SystemService@1.0.0');
    
    const reactoryClient = await systemService.getReactoryClient(clientId);
    if (!reactoryClient) {
      throw new Error(`ReactoryClient with id ${clientId} not found`);
    }

    const result = await userService.createUserForOrganization(
      input,
      password,
      null, // no organization
      userRoles,
      'LOCAL',
      reactoryClient as Reactory.Models.IReactoryClientDocument,
      null  // no business unit
    );

    return result.user;
  }

   @query('ReactoryUsers')
    async ReactoryUsers(parent: any, { filter, paging }: {
      filter?: ReactoryUserFilterInput;
      paging?: Reactory.Data.PagingRequest;      
    }, context: Reactory.Server.IReactoryContext): Promise<ReactoryUserQueryResult> {
      const userService = context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0');
      const {
        organizationId,
        businessUnitId,
        searchString,
        roles,
        includeDeleted,
        createdAfter,
        createdBefore,
        lastLoginAfter,
        lastLoginBefore,
        firstName,
        lastName,
        email,
        customFilters
      } = filter || {};

      const { 
        page,
        pageSize
      } = paging || {};

      try {
        const result = await userService.search({
          search: searchString,
          limit: pageSize || 25,
          offset: page && pageSize ? (page - 1) * pageSize : 0,
          sortBy: 'lastName',
          sortOrder: 'asc',
          fields: ['firstName', 'lastName', 'email'],
        });

        return {
          __typename: 'PagedUserResults',
          paging: {
            hasNext: result.total > (page && pageSize ? (page - 1) * pageSize : 0) + (pageSize || 25),
            page: page || 1,
            pageSize: pageSize || 25,
            total: result.total,            
          },
          users: result.users as Partial<Reactory.Models.IUserDocument>[],
        } as PagedUserResults;
      } catch (error) {
        context.log('Error searching users', { error, filter, paging }, 'error');
        return {
          __typename: 'ReactoryUserQueryFailed',
          message: error.message,
          code: error.code || 'USER_SEARCH_ERROR'
        } as ReactoryUserQueryFailed;
      }            
    }
}

export default UserResolver;
