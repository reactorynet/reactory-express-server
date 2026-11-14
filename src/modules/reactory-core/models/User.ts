import mongoose from 'mongoose';
import * as mongo from 'mongodb';
import crypto from 'crypto';
import * as lodash from 'lodash';

import logger from '@reactory/server-core/logging';
import Reactory from '@reactorynet/reactory-core';
import PasswordHasher from '@reactory/server-core/authentication/password/PasswordHasher';
import { PLATFORM_ROLES } from '@reactory/server-modules/reactory-core/utils/platformRoles';
import { redactUserCredentials } from '@reactory/server-modules/reactory-core/utils/userCredentialRedaction';


const { ObjectId: ObjectIdSchema } = mongoose.Schema.Types;
const { isArray, find, filter } = lodash;
const { ObjectId } = mongo;

type Id = string | number | mongo.BSON.ObjectId | mongo.BSON.ObjectIdLike | Uint8Array

const meta = new mongoose.Schema({
  source: {},
  owner: String, // indicates what system owns this record
  reference: String, // a lookup string to use for the remote system
  lastSync: Date,
  nextSync: Date,
  mustSync: {
    type: Boolean,
    default: true,
  },
});

const SocialsSchema = new mongoose.Schema({
  provider: String,
  url: String,
  authenticated: Boolean,
  scope: {},
  auth: {},
  valid: Boolean,
  created: Date,
  updated: Date,
});

const LinkedAgentSchema = new mongoose.Schema({
  personaId: String,
  providerId: String,
  modelId: String,
  providerProps: {},
  description: String,
});

/**
 * The user's localisation preferences.
 *
 * `locale` is what makes a language choice survive a new browser or device.
 * Before this existed the client stored the choice in `localStorage` only, so a
 * user who picked Afrikaans on their laptop was back in English on their phone
 * even though the server knew exactly who they were. `localStorage` remains the
 * pre-auth/first-paint fallback; this field is the durable record.
 *
 * The value is the normalised language *code* (`af`, not `af-ZA`), because that
 * is the identity the bundle loader, the language filter and the selector all
 * agree on. `validateUserLocale` in `utils/userLanguage` is the only writer.
 */
const Il8nSchema = new mongoose.Schema(
  {
    locale: {
      type: String,
      required: false,
      trim: true,
      lowercase: true,
    },
    // Optional presentation preferences. Kept here (not invented) so a stored
    // profile has one place to record how dates and times should render.
    dateFormat: String,
    timeFormat: String,
    dateTimeFormat: String,
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema({
  id: ObjectIdSchema,
  username: {
    type: String,
    required: false,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    validate: {
      validator: (v: string) => /^[a-z0-9_]{3,50}$/.test(v) || /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(v),
      message: (props: { value: string }) => `${props.value} is not a valid username`,
    }
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  dateOfBirth: {
    type: Date,
    required: false,
    default: new Date('1900/01/01')
  },
  email: {
    type: String,
    unique: true,
    index: true,
    lowercase: true,
    trim: true,
    required: true,
    validate: {
      validator: (v: string) => /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(v),
      message: (props: { value: string }) => `${props.value} is not a valid email address`,
    },
  },
  mobileNumber: {
    type: String,
    required: false,
  },
  salt: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  avatar: String,
  avatarProvider: {
    type: String,
    default: 'reactory',
  },
  organization: {
    type: ObjectIdSchema,
    ref: 'Organization',
  },
  ownedTeams: [{
    type: ObjectIdSchema,
    ref: 'Team',
  }],
  teamMemberships: [{
    type: ObjectIdSchema,
    ref: 'Team',
  }],
  memberships: [
    {
      clientId: {
        type: ObjectIdSchema,
        ref: 'ReactoryClient',
      },
      organizationId: {
        type: ObjectIdSchema,
        ref: 'Organization',
      },
      businessUnitId: {
        type: ObjectIdSchema,
        ref: 'BusinessUnit',
      },
      enabled: Boolean,
      authProvider: String,
      providerId: String,
      lastLogin: Date,
      created: Date,
      roles: [String],
    },
  ],
  roles: [String],
  sessionInfo: [
    {
      id: String,
      host: String,
      client: String,
      // Identity of the slot this session occupies. Concurrent logins for the
      // same slot compete for it with a conditional update, so two tabs opening
      // at once converge on one session instead of stacking two.
      key: String,
      // The exact JSON that was signed for this session. `jwtPayload` below
      // cannot serve this purpose: it casts exp/iat to Date and drops claims it
      // does not declare, so re-signing it would not reproduce the original
      // token. Keeping the signed JSON verbatim lets a repeat login from the
      // same app and host hand back a byte-identical JWT. Only the payload is
      // stored - never the signature.
      jwtPayloadJson: String,
      jwtPayload: {
        iss: String,
        sub: String,
        exp: Date,
        aud: [String],
        iat: Date,
        userId: ObjectIdSchema,
        organizationId: ObjectIdSchema,
        refresh: String,
        roles: [String],
      },
    },
  ],
  authentications: [
    {
      provider: String,
      props: {},
      lastLogin: Date,
    },
  ],
  legacyId: Number,
  lastLogin: Date,
  // When the account completed email activation (the `GET /useraccount/activate`
  // flow). Null means "never activated", which is the state every self-registered
  // account starts in and the state every pre-existing account is in.
  //
  // A timestamp rather than a boolean because support's first question is
  // "did they activate, and when?", which a flag cannot answer. Activation is
  // deliberately additive: nothing in login or authorisation reads this field,
  // so an existing account that has never activated is not locked out by the
  // introduction of the flow.
  activatedAt: {
    type: Date,
    required: false,
    default: null,
  },
  deleted: {
    type: Boolean,
    required: false,
  },
  createdAt: {
    type: Date,
    required: true,
  },
  updatedAt: {
    type: Date,
    required: true,
  },
  meta,
  socials: [SocialsSchema],
  linked_agents: [LinkedAgentSchema],
  il8n: Il8nSchema,
});

UserSchema.methods.setPassword = async function setPassword(password: string) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.password = await PasswordHasher.hash(password);
  if (typeof this.markModified === 'function') {
    this.markModified('salt');
    this.markModified('password');
  }
};

UserSchema.methods.validatePassword = async function validatePassword(password: string) {
  const result = await PasswordHasher.verify(password, this.password, this.salt);
  if (result.ok && result.needsRehash) {
    await this.setPassword(password);
    if (typeof this.save === 'function') {
      try {
        await this.save();
      } catch (err) {
        logger.warn('Failed to save upgraded password hash for user', err);
      }
    }
  }
  return result.ok;
};

UserSchema.methods.fullName = function fullName(email = false) {
  return `${this.firstName} ${this.lastName}${email ? `<${this.email}>` : ''}`.trim();
};

/**
 * Whether the user holds `role` in partner `clientId`, optionally scoped to an
 * organization and business unit.
 *
 * Memberships are the only authority for users that have any. The document-level
 * `roles` array is consulted only:
 *  - for users with NO memberships (the seeded system administrator, legacy
 *    single-tenant accounts), and
 *  - for the platform roles (`PLATFORM_ROLES`), which are not partner roles.
 *
 * It used to be an unconditional final fallback. Because provisioning copied
 * every membership's roles onto the document, an ADMIN of one partner then held
 * ADMIN in every partner - a cross-tenant escalation.
 *
 * A role held at a wider scope of the SAME partner covers a narrower one: a
 * partner-level ADMIN passes an organization- or business-unit-scoped ADMIN
 * check, and an organization-level role passes a check for one of that
 * organization's business units. (Before, the document fallback answered those
 * checks; this keeps them working without reaching across partners.)
 */
UserSchema.methods.hasRole = function hasRole(clientId: string, role = 'USER',
  organizationId: string | typeof ObjectId = null, businessUnitId: string | typeof ObjectId = null) {
  const documentRoles: string[] = isArray(this.roles) ? this.roles : [];

  if (!this.memberships || this.memberships.length === 0) {
    return documentRoles.includes(role);
  }

  if (PLATFORM_ROLES.includes(role) && documentRoles.includes(role)) return true;

  if (ObjectId.isValid(clientId) === false) {
    return false;
  }

  const partnerMemberships = filter(this.memberships, (membership) =>
    !lodash.isNil(membership?.clientId)
    && new ObjectId(membership.clientId).equals(new ObjectId(clientId)));

  const scopeMatches = (value: any, wanted: any) => (wanted
    ? !lodash.isNil(value) && new ObjectId(value).equals(new ObjectId(wanted))
    : lodash.isNil(value));

  const holdsAt = (orgId: any, buId: any) => partnerMemberships.some((membership) =>
    scopeMatches(membership.organizationId, orgId)
    && scopeMatches(membership.businessUnitId, buId)
    && isArray(membership.roles)
    && membership.roles.includes(role));

  const org = ObjectId.isValid(organizationId as any) ? organizationId : null;
  const bu = ObjectId.isValid(businessUnitId as any) ? businessUnitId : null;

  if (holdsAt(org, bu)) return true;
  if (org && bu && holdsAt(org, null)) return true;
  if ((org || bu) && holdsAt(null, null)) return true;

  return false;
};

UserSchema.methods.hasAnyRole = function hasAnyRole(
  clientId: string | mongo.ObjectId, 
  organizationId: string | mongo.ObjectId, 
  businessUnitId: string | mongo.ObjectId) {
  
  if (!this.memberships || this.memberships.length === 0) {
    return isArray(this.roles) && this.roles.length > 0 && !this.roles.every((r: string) => r === 'ANON');
  }


  let matches = [];

  if (ObjectId.isValid(clientId) === false) {
    logger.warn('clientId parameter is supposed to be ObjectId');
    return false;
  }

  matches = filter(this.memberships, (membership) => {
    return new ObjectId(membership.clientId).equals(new ObjectId(clientId));
  });

  if (ObjectId.isValid(organizationId) === true) {
    matches = filter(
      matches,
      membership => new ObjectId(membership.organizationId).equals(new ObjectId(organizationId)),
    );
  }
 
  if (ObjectId.isValid(businessUnitId)) {
    matches = filter(
      matches,
      membership => new ObjectId(membership.businessUnitId).equals(new ObjectId(businessUnitId)),
    );
  }

  // A user with memberships is a member of exactly the partners they hold
  // memberships in; their document-level roles say nothing about this one.
  return isArray(matches) === true && matches.length > 0;
};

// eslint-disable-next-line max-len
UserSchema.methods.addRole = async function addRole
(clientId: Id, 
  role: string, 
  organizationId: Id, 
  businessUnitId: Id, 
  context: Reactory.Server.IReactoryContext): Promise<Reactory.Models.IMembership[]> {
  const $model: Reactory.Models.IUserDocument = this as Reactory.Models.IUserDocument;
  
  if (ObjectId.isValid(clientId) === false) return [];

  $model.memberships ??= new mongoose.Types.Array<Reactory.Models.IMembershipDocument>();

  if ($model.memberships.length === 0) {
    logger.info('User has no memberships, adding');
    $model.memberships.push({
      clientId,
      organizationId,
      businessUnitId,
      roles: [role],
      enabled: true,
      authProvider: 'default',
      lastLogin: null,
    });
  }  

  // @ts-ignore
  // TODO: update the type definition for memberships
  if ($model.hasRole(clientId, role, organizationId, businessUnitId) === false) {
    // check if there is an existing membership for the client / org / business unit

    const mIndex = lodash.findIndex(
      $model.memberships,
      (m: any) => {
        if (!m.clientId || !new ObjectId(m.clientId).equals(new ObjectId(clientId))) return false;
        if (ObjectId.isValid(organizationId)) {
          if (!m.organizationId || !new ObjectId(m.organizationId).equals(new ObjectId(organizationId))) return false;
        } else if (!lodash.isNil(m.organizationId)) {
          return false;
        }
        if (ObjectId.isValid(businessUnitId)) {
          if (!m.businessUnitId || !new ObjectId(m.businessUnitId).equals(new ObjectId(businessUnitId))) return false;
        } else if (!lodash.isNil(m.businessUnitId)) {
          return false;
        }
        return true;
      },
    );

    if (mIndex < 0) {
      $model.memberships.push({
        clientId,
        organizationId,
        businessUnitId,
        roles: [role],
        enabled: true,
        authProvider: 'default',
        lastLogin: null,
      });
    } else if (mIndex >= 0 && $model.memberships[mIndex]) {
      if (lodash.intersection($model.memberships[mIndex].roles, [role]).length === 0) {
        $model.memberships[mIndex].roles.push(role);
      }
    }

    $model.markModified('memberships');
    await $model.save().then();
    return $model.memberships;
  }

  return $model.memberships;
};

UserSchema.methods.removeRole = async function removeRole(clientId: Id, role: string, organizationId: Id) {
  let removed = 0;
  this.memberships.map((membership: Partial<Reactory.Models.IMembership & Reactory.Models.IMembershipDocument>) => {
    //@ts-ignore
    if (new ObjectId(membership.clientId).equals(new ObjectId(clientId))) {
      if (lodash.isNil(organizationId) === false && ObjectId.isValid(organizationId)) {
        // @ts-ignore
        if (new ObjectId(organizationId).equals(new ObjectId(membership.organizationId)) === true) {
          removed += lodash.remove(membership.roles, r => r === role).length;
        }
      } else {
        // we are not matching against org only client id, so we remove the role should on have one
        removed += lodash.remove(membership.roles, r => r === role).length;
      }
    }

    return membership;
  });
  logger.info(`Removed ${removed} Roles`);
  await this.save().then();

  return this.memberships;
};

UserSchema.methods.hasMembership = function hasMembership(clientId: Id, organizationId: Id, businessUnitId: Id) {
  if (!this.memberships || this.memberships.length === 0) return false;

  const targetClientIdStr = clientId ? clientId.toString() : null;
  const targetOrgIdStr = organizationId && organizationId.toString ? organizationId.toString() : null;
  const targetBuIdStr = businessUnitId && businessUnitId.toString ? businessUnitId.toString() : null;

  const found = find(this.memberships, (membership) => {
    const mClientIdStr = membership.clientId ? membership.clientId.toString() : null;
    if (mClientIdStr !== targetClientIdStr) return false;

    const mOrgIdStr = membership.organizationId ? membership.organizationId.toString() : null;
    if (mOrgIdStr !== targetOrgIdStr) return false;

    const mBuIdStr = membership.businessUnitId ? membership.businessUnitId.toString() : null;
    if (mBuIdStr !== targetBuIdStr) return false;

    return true;
  });

  if (found === null || found === undefined) return false;

  return true;
};

UserSchema.methods.getMembership = function getMembership(clientId: Id, organizationId?: Id, businessUnitId?: Id) {
  
  const $user: Reactory.Models.IUserDocument = this as Reactory.Models.IUserDocument;
  if (!$user.memberships || $user.memberships.length === 0) return null;

  let matches = [];

  if (ObjectId.isValid(clientId) === false) {
    logger.warn('clientId parameter is supposed to be ObjectId');
    return null;
  }

  matches = filter($user.memberships, (membership) => {
    return new ObjectId(membership.clientId).equals(new ObjectId(clientId));
  });

  if (ObjectId.isValid(organizationId) === true) {
    logger.info('Filtering by organization');
    matches = filter(
      matches,
      membership => new ObjectId(membership.organizationId).equals(new ObjectId(organizationId)),
    );
  } else {
    matches = filter(
      matches,
      membership => lodash.isNil(membership.organizationId) === true,
    );
  }

  if (ObjectId.isValid(businessUnitId)) {
    logger.info('Filtering by business unit id');
    matches = filter(
      matches,
      membership => new ObjectId(membership.businessUnitId).equals(new ObjectId(businessUnitId)),
    );
  } else {
    matches = filter(
      matches,
      membership => lodash.isNil(membership.businessUnitId) === true,
    );
  }

  if (isArray(matches) === true && matches.length > 0) {
    logger.debug(`Matched ${matches.length} memberships for user ${$user.email}`);
    return matches[0];    
  }

  return null;

};

UserSchema.methods.updateMembership = async function updateMembership(membership: Reactory.Models.IMembershipDocument) {
  
  const $model: Reactory.Models.IUserDocument = this as Reactory.Models.IUserDocument;
  
  if ($model.memberships.length === 0) return;
  
  // @ts-ignore
  $model.memberships.id(membership._id, membership);

  return await $model.save().then();

};

UserSchema.methods.fullName = function fullName(email: boolean = false) { 

  return `${this.firstName} ${this.lastName}${email ? ` <${this.email}>` : ''}`; 
};

UserSchema.methods.deleteUser = function deleteUser() {
  this.deleted = true;
  this.save();
};

UserSchema.methods.setAuthentication = async function setAuthentication(authentication = { provider: 'local', props: {}, lastLogin: new Date().valueOf() }): Promise<boolean> {
  const instance = this;
  const { props, provider, lastLogin } = authentication;

  let dirty = false;
  if (instance.$patching === true) {
    return false;
  }

  instance.$patching = true;
  logger.debug(`Adding new authentication details provider: ${provider} username: ${props ? props.username || this.fullName() : 'NO PROPS'}`);
  if (instance.authentications === undefined || instance.authentications === null) {
    instance.authentications = [authentication];
    dirty = true;
  } else if (isArray(instance.authentications) === true) {
    const found = find(instance.authentications, { provider });
    if (found === undefined || found === null) {
      instance.authentications.push(authentication);
      dirty = true;
    } else {
      instance.authentications.forEach((_authentication: any, index) => {
        if (provider === _authentication.provider) {
          // patch the properties of the authentication
          instance.authentications[index].props = { ..._authentication.props, ...authentication.props };
          if (lastLogin) {
            instance.authentications[index].lastLogin = lastLogin;
          }
          dirty = true;
        }
      });
    }
  }

  if (dirty === true) {
    await this.save();
    instance.$patching = false;
    return true;
  }

  return false;
};

UserSchema.methods.removeAuthentication = async function removeAuthentication(provider: string): Promise<boolean> {
  if (provider && this.authentications) {
    const found = find(this.authentications, { provider });
    if (found) {
      this.authentications.id(found._id).remove();
      await this.save().then();
      return true;
    }
  }
  return false;
};

UserSchema.methods.getAuthentication = function getAuthentication(provider: string) {
  logger.debug(`Getting user authentication for provider ${provider}`);
  if (provider && this.authentications) {
    const found = find(this.authentications, { provider });
    logger.debug(found ? 'Found authentication' : 'None found');
    return found;
  }
  return null;
};

UserSchema.statics.findByForeignId = async function findByForeignId(id: string, owner: string) {
  return await this.findOne({ 'meta.reference': id, 'meta.owner': owner }).then();
};

/**
 * Supports:
 *  - Name and lastname: 'James van der Beeck' ->
 *  {
 *    id: ObjectId()
 *    firstName: 'james',
 *    lastName: 'van der Beeck',
 *    email: 'james.v.reactory.net,
 *  }
 *
 *  - Name and lastname: 'James van der Beeck<james@mail.com>' ->
 *  {
 *    id: ObjectId()
 *    firstName: 'james',
 *    lastName: 'van der Beeck',
 *    email: 'james.v+@{key}.reactory.net,
 *  }
 */
UserSchema.statics.parse = (inputString: string): any => {
  if (typeof inputString === 'string') {
    const _s = inputString.trim();
    let _name = _s;
    let _email = '';

    if (_s.indexOf('<') > 0 && _s.indexOf('>')) {
      // contains email
      try {
        [_name, _email] = _s.split('<');
        _email = _email.replace('>', '');
      } catch (parseErr) {
        logger.debug(`User.parse(inputString = "${inputString}") could not be parsed.`);
      }
    }

    const parts = _name.split(' ').reverse();

    const parsed = {
      firstName: parts.pop(),
      lastName: parts.length > 0 ? parts.pop() : '',
      email: _email,
      createdAt: new Date().valueOf(),
      updatedAt: new Date().valueOf(),
    };

    while (parts.length > 0) {
      parsed.lastName = `${parsed.lastName} ${parts.pop()}`;
    }

    parsed.lastName = parsed.lastName.trim();

    return parsed;
  }

  return {};
};

UserSchema.statics.onStartup = async (context: Reactory.Server.IReactoryContext) => { 
  
};

/**
 * Never serialise credentials. `JSON.stringify` / `res.json()` of a hydrated
 * user - directly, or populated into a ticket, comment or team without a
 * projection - drops `password`, `salt`, session tokens and provider secrets.
 * `toObject` is deliberately left alone: password verification and the reset
 * fingerprint read those fields from the live document. `.lean()` reads bypass
 * this transform, so they must still project with `USER_REFERENCE_SELECT`.
 */
UserSchema.set('toJSON', {
  transform: (_doc: unknown, ret: Record<string, any>) => redactUserCredentials(ret),
});

export const ReactoryUserSchema = UserSchema;
export type ReactoryUserDocument = mongoose.Document & Reactory.Models.IUserDocument;
const ReactoryUserModel: mongoose.Model<ReactoryUserDocument> = mongoose.model<ReactoryUserDocument>('User', UserSchema, 'reactory_users');
export default ReactoryUserModel;
