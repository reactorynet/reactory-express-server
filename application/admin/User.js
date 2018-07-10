import co from 'co';
import { ObjectId } from 'mongodb';
import moment from 'moment';
import { isNil, isEmpty } from 'lodash';
import { User, Organization } from '../../models';
import { UserExistsError, UserValidationError } from '../../exceptions';
import emails from '../../emails';

export class CreateUserResult {
  constructor() {
    this.organization = null;
    this.user = null;
  }
}

export const defaultUserCreateOptions = {
  sendRegistrationEmail: false,
  clientId: null,
};


export const createUserForOrganization = co.wrap(function* createUserForOrganization(user, password, organization, roles = ['USER'], provider = 'LOCAL') { // eslint-disable-line max-len
  const result = new CreateUserResult();
  try {
    result.user = yield User.findOne({ email: user.email });
    if (result.user === null) {
      result.user = new User({ ...user });
      result.user.setPassword(password);
      result.user.memberships.push({ // eslint-disable-line
        clientId: ObjectId(global.partner._id), // eslint-disable-line no-underscore-dangle
        organizationId: ObjectId(organization._id), // eslint-disable-line no-underscore-dangle
        provider,
        businessUnit: user.businessUnit || 'NOT SET',
        roles,
      });
      result.organization = organization;
      let buExists = false;
      organization.businessUnits.forEach((businessUnit) => {
        if (businessUnit.toLowerCase().trim() === (user.businessUnit || '').toLowerCase().trim() && buExists === false) {
          buExists = true;
        }
      });

      if (!buExists) {
        result.organization.businessUnits.push(user.businessUnit);
        result.organization = yield result.organization.save();
      }
      result.user = yield result.user.save();
    }
    return result;
  } catch (createError) {
    return result;
  }
});

export const createMembership = (user, partner, organization, roles = ['USER'], provider = 'LOCAL') => {
  return new Promise((resolve, reject) => {
    try {
      user.memberships.push({ // eslint-disable-line
        clientId: ObjectId(partner._id), // eslint-disable-line no-underscore-dangle
        organizationId: ObjectId(organization._id), // eslint-disable-line no-underscore-dangle
        provider,
        businessUnit: user.businessUnit || 'NOT SET',
        roles,
      });
      user.save().then((saved) => {
        resolve({ saved });
      });
    } catch (err) {
      reject(err);
    }
  });
};

export const removeMembership = (user, partner, organization) => {
  // deletes a membership
  console.log('removeMembership', {
    user, partner, organization,
  });
  return new Promise((resolve, reject) => {
    try {
      resolve(true);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateMembership = (user, partner, organization, roles = []) => {
  // updates a user membership
  console.log('updateMembership', {
    user, partner, organization, roles,
  });
  return new Promise((resolve, reject) => {
    try {
      resolve(true);
    } catch (err) {
      reject(err);
    }
  });
};

export const listAll = () => {
  return new Promise((resolve, reject) => {
    User.find({})
      .then((users) => {
        resolve(users);
      }).catch((err) => {
        reject(err);
      });
  });
};

export const listAllForOrganization = (organizationId) => {
  return new Promise((resolve, reject) => {
    Organization.findOne({ _id: ObjectId(organizationId) }).then((organization) => {
      User.find({ 'memberships.organizationId': { $eq: organization.id } }).then((users) => {
        resolve(users);
      }).catch((err) => {
        reject(err);
      });
    });
  });
};

export const registerUser = (user) => {  
  return new Promise((resolve, reject) => {
    User.findOne({ email: user.email }).then((userResult) => {
      if (isNil(userResult) === true) {
        try {
          const created = new User({
            ...user,
            createdAt: moment().valueOf(),
            updatedAt: moment().valueOf(),
          });
          if (!isEmpty(user.password) && !isNil(user.password)) {
            created.setPassword(user.password);
          } else {
            reject(new UserValidationError('Password cannot be empty'));
          }

          const validation = created.validateSync();
          console.log('validation result', validation);
          if (isNil(validation) === false) {
            reject(new UserValidationError('Validation error', validation.errors));
          }

          if (isNil(created.username)) created.username = `${created.firstName}${created.lastName.substring(0, 1)}`;
          created.save().then((saved) => {
            resolve(saved);
          }).catch((error) => {
            reject(error);
          });
        } catch (createError) {
          reject(createError);
        }
      } else {
        reject(new UserExistsError(`The user with the email ${user.email} is already registered, please use another or login`));
      }
    });
  });
};

export const sendResetPasswordEmail = (user, partner, options) => {
  console.log('sendResetPasswordEmail', { user, partner, options });
  return emails.sendForgotPasswordEmail(user);
};

export default {
  CreateUserResult,
  defaultUserCreateOptions,
  createUserForOrganization,
  registerUser,
  createMembership,
  removeMembership,
  updateMembership,
  listAll,
  listAllForOrganization,
  User,
  sendResetPasswordEmail,
};
