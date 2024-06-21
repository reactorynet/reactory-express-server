/* eslint-disable max-len */
import mongoose from 'mongoose';
import * as mongodb from 'mongodb';
import crypto from 'crypto';
import * as lodash from 'lodash';

import logger from '@reactory/server-core/logging';
import Reactory from '@reactory/reactory-core';

const ObjectIdFunc = mongodb.ObjectId;
type OID = typeof ObjectIdFunc;
const { ObjectId } = mongoose.Schema.Types;
const { isArray, find, filter } = lodash;

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
  id: ObjectId,
  username: String,
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
    index: true,
    lowercase: true,
    trim: true,
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
    type: ObjectId,
    ref: 'Organization',
  },
  memberships: [
    {
      clientId: {
        type: ObjectId,
        ref: 'ReactoryClient',
      },
      organizationId: {
        type: ObjectId,
        ref: 'Organization',
      },
      businessUnitId: {
        type: ObjectId,
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
        userId: ObjectId,
        organizationId: ObjectId,
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
  // TODO: the legacy id must be depracated
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
UserSchema.methods.hasRole = function hasRole(clientId: string | OID, role = 'USER', organizationId: string | OID = null, businessUnitId: string | OID = null) {
  if (this.memberships.length === 0) return false;

  let matches = [];

  if (ObjectIdFunc.isValid(clientId) === false) {
    logger.warn('clientId parameter is supposed to be ObjectId');
    return false;
  }

  matches = filter(this.memberships, (membership) => {
    return new ObjectIdFunc(membership.clientId).equals(new ObjectIdFunc(clientId));
  });

  if (ObjectIdFunc.isValid(organizationId) === true) {
    logger.info('Filtering by organization');
    matches = filter(
      matches,
      membership => new ObjectIdFunc(membership.organizationId).equals(new ObjectIdFunc(organizationId)),
    );
  } else {
    matches = filter(
      matches,
      membership => lodash.isNil(membership.organizationId) === true,
    );
  }

  if (ObjectIdFunc.isValid(businessUnitId)) {
    logger.info('Filtering by business unit id');
    matches = filter(
      matches,
      membership => new ObjectIdFunc(membership.businessUnitId).equals(new ObjectIdFunc(businessUnitId)),
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
  clientId: string | mongodb.ObjectId, 
  organizationId: string | mongodb.ObjectId, 
  businessUnitId: string | mongodb.ObjectId) {
  
  if (this.memberships.length === 0) return false;


  let matches = [];

  if (ObjectIdFunc.isValid(clientId) === false) {
    logger.warn('clientId parameter is supposed to be ObjectId');
    return false;
  }

  matches = filter(this.memberships, (membership) => {
    return new ObjectIdFunc(membership.clientId).equals(new ObjectIdFunc(clientId));
  });

  if (ObjectIdFunc.isValid(organizationId) === true) {
    matches = filter(
      matches,
      membership => new ObjectIdFunc(membership.organizationId).equals(new ObjectIdFunc(organizationId)),
    );
  }
  // } else {
  //   matches = filter(
  //     matches,
  //     membership => lodash.isNil(membership.organizationId) === true,
  //   );
  // }

  if (ObjectIdFunc.isValid(businessUnitId)) {
    matches = filter(
      matches,
      membership => new ObjectIdFunc(new membership.businessUnitId).equals(new ObjectIdFunc(businessUnitId)),
    );
  }
  // } else {
  //   matches = filter(
  //     matches,
  //     membership => lodash.isNil(membership.businessUnitId) === true,
  //   );
  // }

  return (isArray(matches) === true && matches.length > 0) === true;
};


// eslint-disable-next-line max-len
UserSchema.methods.addRole = async function addRole(clientId, role, organizationId, businessUnitId): Promise<Reactory.Models.IMembership[]> {
  logger.info(`Adding user membership ${clientId} ${role} ${organizationId} ${businessUnitId}`);
  // const matches = [];
  const $model: Reactory.Models.IUserDocument = this as Reactory.Models.IUserDocument;
  let dirty = false;

  if (ObjectIdFunc.isValid(clientId) === false) return [];

  if ($model.memberships === null || $model.memberships === undefined) {
    $model.memberships = new mongoose.Types.Array<Reactory.Models.IMembershipDocument>();
  }

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

    dirty = true;
  }  

  if ($model.hasRole(clientId, role, organizationId, businessUnitId) === false) {
    // check if there is an existing membership for the client / org / business unit
    logger.info(`User ${$model.fullName(true)} does not have role, adding`);
    const mIndex = lodash.findIndex(
      $model.memberships,
      {
        clientId: new ObjectIdFunc(clientId),
        organizationId: ObjectIdFunc.isValid(organizationId) ? new ObjectIdFunc(organizationId) : null,
        businessUnitId: ObjectIdFunc.isValid(businessUnitId) ? new ObjectIdFunc(businessUnitId) : null,
      },
    );

    logger.info(`Filtered existing memberships for matching clientId, organizationId and businessUnitId @ ${mIndex}`);

    if (mIndex < 0) {
      logger.info('User does not have matching existing memberships, adding new one');
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
      logger.info(`User existing membership found @ ${mIndex}`, $model.memberships[mIndex]);
      if (lodash.intersection($model.memberships[mIndex].roles, [role]).length === 0) {
        $model.memberships[mIndex].roles.push(role);
      }
    }

    await $model.save().then();
    return $model.memberships;
  }

  return $model.memberships;
};

UserSchema.methods.removeRole = async function removeRole(clientId, role, organizationId) {
  logger.info(`Removing role (${role}) for user ${thifalses.fullName()}, checking (${this.memberships.length}) memberships`);
  let removed = 0;
  this.memberships.map((membership) => {
    logger.info(`Checking membership ${membership._id}`, membership);
    if (ObjectIdFunc(membership.clientId).equals(ObjectIdFunc(clientId))) {
      if (lodash.isNil(organizationId) === false && ObjectId.isValid(organizationId)) {
        if (ObjectIdFunc(organizationId).equals(ObjectIdFunc(membership.organizationId)) === true) {
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

UserSchema.methods.hasMembership = function hasMembership(clientId, organizationId, businessUnitId) {
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

UserSchema.methods.getMembership = function getMembership(clientId: string | mongodb.ObjectID, organizationId?: string | mongodb.ObjectID, businessUnitId?: string | mongodb.ObjectID) {
  logger.info(`Getting user membership 
    ReactoryClient:[${clientId}] 
    Organization: [${organizationId || '**'}]
    BusinessUnit: [${businessUnitId || '**'}]`);
  
  const $user: Reactory.IUserDocument = this as Reactory.IUserDocument;
  if ($user.memberships.length === 0) return false;

  let matches = [];

  if (ObjectIdFunc.isValid(clientId) === false) {
    logger.warn('clientId parameter is supposed to be ObjectId');
    return false;
  }

  matches = filter($user.memberships, (membership) => {
    return new ObjectIdFunc(membership.clientId).equals(new ObjectIdFunc(clientId));
  });

  if (ObjectIdFunc.isValid(organizationId) === true) {
    logger.info('Filtering by organization');
    matches = filter(
      matches,
      membership => new ObjectIdFunc(membership.organizationId).equals(new ObjectIdFunc(organizationId)),
    );
  } else {
    matches = filter(
      matches,
      membership => lodash.isNil(membership.organizationId) === true,
    );
  }

  if (ObjectIdFunc.isValid(businessUnitId)) {
    logger.info('Filtering by business unit id');
    matches = filter(
      matches,
      membership => new ObjectIdFunc(membership.businessUnitId).equals(new ObjectIdFunc(businessUnitId)),
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

UserSchema.methods.updateMembership = async function updateMembership(membership: Reactory.IMembershipDocument) {
  
  const $model: Reactory.Models.IUserDocument = this as Reactory.Models.IUserDocument;
  
  if ($model.memberships.length === 0) return;
  
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

const ReactoryUserModel: mongoose.Model<Reactory.Models.IUserDocument> = mongoose.model<Reactory.Models.IUserDocument>('User', UserSchema);
export default ReactoryUserModel;
