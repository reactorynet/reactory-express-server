import mongoose from 'mongoose';
import { ObjectId as ObjectIdFunc } from 'mongodb';
import crypto from 'crypto';
import moment from 'moment';
import lodash, { isArray, find, filter } from 'lodash';
import logger from '../../logging';

const { ObjectId } = mongoose.Schema.Types;


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
  email: {
    type: String,
    index: true,
    lowercase: true,
    trim: true,
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
  legacyId: Number,
  lastLogin: Date,
  createdAt: {
    type: Date,
    required: true,
  },
  updatedAt: {
    type: Date,
    required: true,
  },
});

UserSchema.methods.setPassword = function setPassword(password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.password = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
};

UserSchema.methods.validatePassword = function validatePassword(password) {
  return this.password === crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
};

UserSchema.methods.hasRole = function hasRole(clientId, role = 'USER', organizationId = null, businessUnitId = null) {
  logger.info(`Checking user membership ${clientId} ${role} ${organizationId} ${businessUnitId}`);
  if (this.memberships.length === 0) return false;

  let matches = [];

  if (ObjectIdFunc.isValid(clientId) === false) return false;
  logger.info('Adding memberships with client id');

  matches = filter(this.memberships, (membership) => {
    return ObjectIdFunc(membership.clientId).equals(ObjectIdFunc(clientId));
  });

  if (ObjectIdFunc.isValid(organizationId) === true) {
    logger.info('Filtering by organization');
    matches = filter(
      matches,
      membership => ObjectIdFunc(membership.organizationId).equals(ObjectIdFunc(organizationId)),
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
      membership => ObjectIdFunc(membership.businessUnitId).equals(ObjectIdFunc(businessUnitId)),
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
    if (lodash.isObject(matched) === true && isArray(matched.roles) === true) {
      return true;
    }
  }

  return false;
};

UserSchema.methods.addRole = async function addRole(clientId, role, organizationId, businessUnitId) {
  logger.info(`Adding user membership ${clientId} ${role} ${organizationId} ${businessUnitId}`);


  // const matches = [];

  if (ObjectIdFunc.isValid(clientId) === false) return false;

  if (this.memberships.length === 0) {
    logger.info('User has no memberships, adding');
    this.memberships.push({
      clientId,
      organizationId,
      businessUnitId,
      roles: [role],
      enabled: true,
      authProvider: 'default',
      lastLogin: null,
    });

    await this.save().then();

    return this.memberships;
  }

  if (this.hasRole(clientId, role, organizationId, businessUnitId) === false) {
    // check if there is an existing membership for the client / org / business unit
    logger.info(`User ${this.fullName()} does not have role, adding`);
    const mIndex = lodash.findIndex(
      this.memberships,
      {
        clientId: ObjectIdFunc(clientId),
        organizationId: ObjectIdFunc.isValid(organizationId) ? ObjectIdFunc(organizationId) : null,
        businessUnitId: ObjectIdFunc.isValid(businessUnitId) ? ObjectIdFunc(businessUnitId) : null,
      },
    );

    logger.info(`Filtered existing memberships for matching clientId, organizationId and businessUnitId @ ${mIndex}`);

    if (mIndex < 0) {
      logger.info('User does not have matching existing memberships, adding new one');
      this.memberships.push({
        clientId,
        organizationId,
        businessUnitId,
        roles: [role],
        enabled: true,
        authProvider: 'default',
        lastLogin: null,
      });
    } else if (mIndex >= 0 && this.memberships[mIndex]) {
      logger.info(`User existing membership found @ ${mIndex}`, this.memberships[mIndex]);
      if (lodash.intersection(this.memberships[mIndex].roles, [role]).length === 0) {
        this.memberships[mIndex].roles.push(role);
      }
    }

    await this.save().then();
    return this.memberships;
  }
};

UserSchema.methods.removeRole = async function removeRole(clientId, role, organizationId, businessUnitId) {
  logger.info(`Removing role (${role}) for user ${this.fullName()}, checking (${this.memberships.length}) memberships`);
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

UserSchema.methods.fullName = function fullName() { return `${this.firstName} ${this.lastName}`; };

const UserModel = mongoose.model('User', UserSchema);
export default UserModel;
