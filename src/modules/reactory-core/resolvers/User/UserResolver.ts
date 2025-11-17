import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver';
import { roles } from '@reactory/server-core/authentication/decorators';
import Reactory from '@reactory/reactory-core';
import { ObjectId } from 'mongodb';
import lodash from 'lodash';
import crypto from 'crypto';

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

  // Add more mutations/queries as needed, following the above pattern.
}

export default UserResolver;
