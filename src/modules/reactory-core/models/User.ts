import mongoose from 'mongoose';
import * as mongo from 'mongodb';
import crypto from 'crypto';
import * as lodash from 'lodash';

import logger from '@reactory/server-core/logging';
import Reactory from '@reactory/reactory-core';


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

const UserSchema = new mongoose.Schema({
  id: ObjectIdSchema,
  username: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    validate: {
      validator: (v: string) => /^[a-z0-9_]{3,50}$/.test(v),
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
  sessionInfo: [
    {
      id: String,
      host: String,
      client: String,
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
});

UserSchema.methods.setPassword = function setPassword(password: string) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.password = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
};

UserSchema.methods.validatePassword = function validatePassword(password: string) {
  return this.password === crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
};

UserSchema.methods.fullName = function fullName(email = false) {
  return `${this.firstName} ${this.lastName}${email ? `<${this.email}>` : ''}`.trim();
};

/**
 * Extension Method on Model to check for a particular role / claim
 */
UserSchema.methods.hasRole = function hasRole(clientId: string, role = 'USER', 
  organizationId: string | typeof ObjectId = null, businessUnitId: string | typeof ObjectId = null) {
  if (this.memberships.length === 0) return false;

  let matches = [];

  if (ObjectId.isValid(clientId) === false) {
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
  } else {
    matches = filter(
      matches,
      membership => lodash.isNil(membership.organizationId) === true,
    );
  }

  if (ObjectId.isValid(businessUnitId)) {
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
    const matched = lodash.filter(
      matches,
      membership => isArray(membership.roles) === true
        && lodash.intersection(membership.roles, [role]).length > 0,
    );
    if (isArray(matched) === true && matched.length >= 1) return true;
    if (lodash.isObject(matched) === true && isArray((matched as any).roles) === true) {
      return true;
    }
  }

  return false;
};

UserSchema.methods.hasAnyRole = function hasAnyRole(
  clientId: string | mongo.ObjectId, 
  organizationId: string | mongo.ObjectId, 
  businessUnitId: string | mongo.ObjectId) {
  
  if (this.memberships.length === 0) return false;


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
      membership => new ObjectId(new membership.businessUnitId).equals(new ObjectId(businessUnitId)),
    );
  }

  return (isArray(matches) === true && matches.length > 0) === true;
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
      {
        // @ts-ignore
        clientId: new ObjectId(clientId),
        organizationId: ObjectId.isValid(organizationId) ? new ObjectId(organizationId) : null,
        businessUnitId: ObjectId.isValid(businessUnitId) ? new ObjectId(businessUnitId) : null,
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
  if (this.memberships.length === 0) return false;

  const found = find(this.memberships, (membership) => {
    return JSON.stringify({
      clientId: membership.clientId.toString(),
      organizationId: membership.organizationId ? membership.organizationId.toString() : null,
      businessUnitId: membership.businessUnitId ? membership.businessUnitId.toString() : null,
    }) === JSON.stringify({
      clientId: clientId.toString(),
      organizationId: organizationId && organizationId.toString ? organizationId.toString() : null,
      businessUnitId: businessUnitId && businessUnitId.toString ? businessUnitId.toString() : null,
    });
  });

  if (found === null || found === undefined) return false;

  return true;
};

UserSchema.methods.getMembership = function getMembership(clientId: Id, organizationId?: Id, businessUnitId?: Id) {
  
  const $user: Reactory.Models.IUserDocument = this as Reactory.Models.IUserDocument;
  if ($user.memberships.length === 0) return false;

  let matches = [];

  if (ObjectId.isValid(clientId) === false) {
    logger.warn('clientId parameter is supposed to be ObjectId');
    return false;
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

export const ReactoryUserSchema = UserSchema;
export type ReactoryUserDocument = mongoose.Document & Reactory.Models.IUserDocument;
const ReactoryUserModel: mongoose.Model<ReactoryUserDocument> = mongoose.model<ReactoryUserDocument>('User', UserSchema, 'reactory_users');
export default ReactoryUserModel;
