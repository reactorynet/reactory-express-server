import { resolver, property, query, mutation } from '@reactory/server-core/models/graphql/decorators/resolver';
import { roles } from '@reactory/server-core/authentication/decorators';
import Reactory from '@reactorynet/reactory-core';
import { ObjectId } from 'mongodb';
import lodash from 'lodash';
import crypto from 'crypto';
import ApiError, { InsufficientPermissions } from '@reactory/server-core/exceptions';
import { getAvailableLanguages } from '@reactory/server-core/express/i18n/language';
import { validateUserLocale } from '@reactory/server-modules/reactory-core/utils/userLanguage';
import { PagedUserResults, ReactoryUserFilterInput, ReactoryUserQueryFailed, ReactoryUserQueryResult } from './types';
import { safeCDNUrl } from '@reactory/server-core/utils/url/safeUrl';
import { assertCanAdministerPartner, assertCanGrantRoles } from '@reactory/server-modules/reactory-core/utils/partnerAuthority';
import { redactAuthenticationProps, redactSession } from '@reactory/server-modules/reactory-core/utils/userCredentialRedaction';

/**
 * A 24 character hexadecimal object id.
 *
 * Stricter than `ObjectId.isValid`, which also accepts any 12 byte string: the
 * mutation has to tell "that is not an id" apart from "no such organization",
 * and a 12 character string is a malformed id, not a missing record.
 */
const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

/**
 * The organization lookup `UserService` implements but the packaged
 * `IReactoryUserService` interface has never declared (the same gap
 * `setUserLanguage` works around for `updateUser`). Declaring the extra
 * signature locally keeps this file type-safe without editing the published
 * types - the approach `OrganizationResolver` takes for the administration
 * methods.
 */
interface IUserServiceWithOrganizationLookup extends Reactory.Service.IReactoryUserService {
  findOrganizationById(organizationId: string): Promise<Reactory.Models.IOrganizationDocument>;
}

const CREDENTIAL_READER_ROLES = ['ADMIN', 'SUPPORT_ADMIN'];

/** The enabled memberships `user` holds in partner `partnerId`. */
const membershipsInPartner = (user: any, partnerId: string): any[] => {
  if (!user || partnerId.length === 0 || !Array.isArray(user.memberships)) return [];
  return user.memberships.filter((membership: any) =>
    membership
    && membership.enabled !== false
    && String(membership.clientId ?? '') === partnerId);
};

/**
 * Whether the caller may read a user record's credential-bearing fields
 * (`sessionInfo`, `authentications`).
 *
 * The account owner may always read their own. ADMIN and SUPPORT_ADMIN are the
 * documented escalation path for account support, but only within one partner:
 * the caller must hold the role in an enabled membership of the CURRENT
 * partner, and the target must be a member of that partner too.
 *
 * `context.hasRole` is deliberately not used: `User.hasRole` falls back to the
 * document-level `roles`, which aggregates roles from every partner, so an
 * ADMIN of any tenant would pass it everywhere.
 *
 * Everybody else - including a plain USER reading a colleague, a ticket author
 * or a comment author - gets `null` rather than an error, so one refused field
 * cannot break a shared query.
 */
const canReadUserCredentials = (usr: any, context?: Reactory.Server.IReactoryContext): boolean => {
  if (!usr || !context) return false;

  const targetId = String(usr._id ?? usr.id ?? '');
  const callerId = String(context.user?._id ?? '');
  if (targetId.length > 0 && targetId === callerId) return true;

  const partnerId = String(context.partner?._id ?? '');
  const callerIsPartnerAdmin = membershipsInPartner(context.user, partnerId).some((membership: any) =>
    Array.isArray(membership.roles)
    && membership.roles.some((role: string) => CREDENTIAL_READER_ROLES.includes(role)));
  if (!callerIsPartnerAdmin) return false;

  return membershipsInPartner(usr, partnerId).length > 0;
};

//@ts-ignore
@resolver
class UserResolver {
  // --- User Type Properties ---
  @property('User', 'id')
  id(obj: any) {
    if (!obj) return null;
    const raw = obj._id || obj.id;
    if (!raw) return null;
    return typeof raw === 'string' ? raw : (raw.toString ? raw.toString() : String(raw));
  }

  @property('User', 'avatar')
  avatar(obj: { avatar: string, _id: any }) {
    if (obj.avatar && obj.avatar.length > 0) {
      if (obj.avatar.startsWith('http')) {
        return obj.avatar;
      }
      return safeCDNUrl(`profiles/${obj._id}/${obj.avatar}`);
    }
    return safeCDNUrl('profiles/default/default.png');
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

  @property('User', 'linked_agents')
  linked_agents(user: { linked_agents: any }) {
    return user.linked_agents || [];
  }

  /**
   * Session history, owner/admin only.
   *
   * `sessionInfo[].jwtPayload.refresh` is a LIVE refresh token: it can mint new
   * access tokens for that session. Exposing the field to every caller that can
   * reach a User (support ticket authors, comment authors, team members) turned
   * any of those reads into a credential dump.
   *
   * Even for an allowed caller the refresh token is stripped: the session list
   * is device/session metadata, and nothing in the product reads the token from
   * GraphQL (the client never refreshes through it - the server does).
   */
  @property('User', 'sessionInfo')
  sessionInfo(usr: any, args: any, context: Reactory.Server.IReactoryContext) {
    if (!canReadUserCredentials(usr, context)) return null;

    const sessions: any[] = Array.isArray(usr?.sessionInfo) ? usr.sessionInfo : [];
    return sessions.map(redactSession);
  }

  /**
   * Linked authentication providers, owner/admin only.
   *
   * `props` already projects down to non-secret bookkeeping fields (see
   * `UserAuthentication.props`), but the collection itself still names every
   * provider the account can be used with, so it is not public.
   */
  @property('User', 'authentications')
  authentications(usr: any, args: any, context: Reactory.Server.IReactoryContext) {
    if (!canReadUserCredentials(usr, context)) return null;
    return Array.isArray(usr?.authentications) ? usr.authentications : [];
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
    // Never the provider tokens/secrets: the shared allowlist keeps bookkeeping only.
    return redactAuthenticationProps(auth.props);
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
    // UserService.updateUser has no guard of its own: without this check any
    // signed-in user could rewrite any other user's profile by id.
    const targetId = String(profileData?.id || id || '');
    const selfId = context.user?._id?.toString();
    if (!targetId || (targetId !== selfId && context.hasRole('ADMIN') !== true)) {
      throw new InsufficientPermissions(`User [${selfId}] may only update their own profile`, { targetId });
    }
    return context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0').updateUser({ ...profileData, id: targetId });
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

  /**
   * Persists the signed-in user's language choice.
   *
   * Self-service on purpose: the target is always `context.user`, so this cannot
   * be used to rewrite someone else's preference. The value is validated
   * against the shipped locales — accepting an arbitrary tag would store a
   * locale with no bundles and silently pin the account to English forever.
   *
   * A language the server does not ship is rejected rather than ignored: a
   * silent success would leave the client believing the choice was saved.
   */
  @mutation('setUserLanguage')
  async setUserLanguage(
    obj: any,
    { language }: { language: string },
    context: Reactory.Server.IReactoryContext
  ) {
    const userId = context.user?._id?.toString();
    if (!userId) throw new InsufficientPermissions('A signed-in user is required to set a language');

    const locale = validateUserLocale(language);
    if (!locale) {
      throw new ApiError(`Unsupported language \"${language}\"`, {
        available: getAvailableLanguages(),
      });
    }

    return context
      .getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0')
      .updateUser({ id: userId, il8n: { locale } } as any);
  }

  /**
   * Switches the signed-in user's active organization.
   *
   * The active organization used to be a browser-local choice
   * (`localStorage['CoreDefaultOrganization']`), so it diverged across devices
   * and every other surface kept reporting the old organization. This mutation
   * makes it server state: it writes `organization` on the caller's own user
   * document, which is exactly what `ApiStatus.getApiStatus` projects into
   * `organization` (`resolvers/ApiStatus/ApiStatus.ts`).
   *
   * Self-service on purpose: the target is always `context.user` and the
   * mutation takes no user id, so an ADMIN cannot use it to move somebody
   * else's session. Authorization to *administer* an organization lives in
   * `OrganizationService`, not here.
   *
   * Membership is the only authority. `user.hasRole(...)` is not used for this
   * check: a partner-level role satisfies its organization-scoped form, and this
   * switch requires an enabled membership of the organization itself.
   *
   * Failures are typed, and deliberately distinct so the client can pick the
   * right message:
   *   UNAUTHENTICATED               no signed-in user
   *   ORGANIZATION_ID_INVALID       not a 24 character object id
   *   ORGANIZATION_NOT_FOUND        well formed id that names nothing
   *   ORGANIZATION_MEMBERSHIP_REQUIRED  no enabled membership in this tenant
   * Each rejection happens before the write, so a refused switch leaves the
   * previous active organization untouched.
   */
  @mutation('setActiveOrganization')
  async setActiveOrganization(
    obj: any,
    { organizationId }: { organizationId: string },
    context: Reactory.Server.IReactoryContext
  ): Promise<Reactory.Models.IOrganizationDocument> {
    const userId = context.user?._id?.toString();
    if (!userId) {
      throw new ApiError('A signed-in user is required to change the active organization', {
        code: 'UNAUTHENTICATED',
      });
    }

    if (typeof organizationId !== 'string' || OBJECT_ID_PATTERN.test(organizationId) === false) {
      throw new ApiError(`"${organizationId}" is not a valid organization id`, {
        code: 'ORGANIZATION_ID_INVALID',
        organizationId: organizationId === undefined ? null : organizationId,
      });
    }

    const userService = context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0') as unknown as IUserServiceWithOrganizationLookup;

    // Resolve the organization first: an id that names nothing is a different
    // answer from "you are not a member of it", and the client shows a
    // different message for each.
    const organization = await userService.findOrganizationById(organizationId);
    if (!organization) {
      throw new ApiError(`Organization ${organizationId} not found`, {
        code: 'ORGANIZATION_NOT_FOUND',
        organizationId,
      });
    }

    const user = await userService.findUserById(userId) as Reactory.Models.IUserDocument;
    if (!user) {
      // The session names a user that no longer exists; treat it as signed out
      // rather than writing to a document we could not load.
      throw new ApiError('A signed-in user is required to change the active organization', {
        code: 'UNAUTHENTICATED',
      });
    }

    const partnerId = (context.partner as any)?._id ? `${(context.partner as any)._id}` : null;
    // Compare against the *stored* id: object ids are canonically lower case
    // hex, so a caller sending the same id in upper case must still match the
    // membership it holds.
    const organizationKey = (organization as any)?._id ? `${(organization as any)._id}` : organizationId;
    const memberships: any[] = Array.isArray(user.memberships) ? (user.memberships as any[]) : [];
    const isMember = memberships.some((membership) => {
      if (!membership || !membership.organizationId) return false;
      if (`${membership.organizationId}` !== organizationKey) return false;
      // A deactivated membership confers nothing; the account still carries it.
      if (membership.enabled === false) return false;
      // A membership held in another tenant does not apply to this session.
      if (partnerId !== null && `${membership.clientId || ''}` !== partnerId) return false;
      return true;
    });

    if (isMember === false) {
      throw new ApiError(`User ${userId} is not an active member of organization ${organizationId}`, {
        code: 'ORGANIZATION_MEMBERSHIP_REQUIRED',
        organizationId,
      });
    }

    // Only the caller's own document is ever written; the id came from the
    // session, never from the arguments.
    (user as any).organization = (organization as any)._id || organizationId;
    await user.save();

    return organization;
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
    // An existing email gets a membership added instead of a new account, so
    // this is a membership grant: authority over `clientId`, never platform roles.
    assertCanAdministerPartner(context, clientId);
    assertCanGrantRoles(context, userRoles);
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

  @roles(['ADMIN'])
  @mutation('ReactoryCoreUpdateUserSocials')
  async ReactoryCoreUpdateUserSocials(
    obj: any,
    params: { userId: string; socials: Array<{ provider: string; url: string }> },
    context: Reactory.Server.IReactoryContext
  ) {
    const { userId, socials } = params;
    const userService = context.getService<Reactory.Service.IReactoryUserService>('core.UserService@1.0.0');
    const user = await userService.findUserById(userId) as Reactory.Models.IUserDocument;
    if (!user) {
      throw new Error(`User with id ${userId} not found`);
    }

    (user as any).socials = socials.map(s => ({
      provider: s.provider,
      url: s.url,
      valid: true,
      created: new Date(),
      updated: new Date(),
    }));

    await user.save();
    return user;
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
