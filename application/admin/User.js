import co from 'co';
import dotenv from 'dotenv';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import pngToJpeg from 'png-to-jpeg';
import { ObjectId } from 'mongodb';
import moment from 'moment';
import { isNil, isEmpty } from 'lodash';
import { User, Organization, Organigram } from '../../models';
import ApiError, { UserExistsError, UserValidationError, UserNotFoundException } from '../../exceptions';
import emails from '../../emails';


dotenv.config();


const {
  APP_DATA_ROOT,
} = process.env;

export class CreateUserResult {
  constructor() {
    this.organization = null;
    this.user = null;
    this.errors = [];
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
    if (isNil(result.user) === true) {
      console.log('User not found creating');
      result.user = new User({ ...user });
      result.user.setPassword(password);
      const membership = {
        // eslint-disable-line
        clientId: ObjectId(global.partner._id), // eslint-disable-line no-underscore-dangle
        organizationId: ObjectId(organization._id), // eslint-disable-line no-underscore-dangle
        provider,
        businessUnit: user.businessUnit || 'DEFAULT',
        roles,
      };

      result.user.memberships.push({ ...membership });
      result.organization = organization;
      let buExists = false;
      organization.businessUnits.forEach((businessUnit) => {
        if (businessUnit.toLowerCase().trim() === (user.businessUnit || '').toLowerCase().trim() && buExists === false) {
          buExists = true;
        }
      });

      if (!buExists && user.business) {
        result.organization.businessUnits.push(user.businessUnit);
        result.organization = yield result.organization.save();
      }
      result.user = yield result.user.save();
    }
    return result;
  } catch (createError) {
    console.error('Created error occured', createError);
    result.errors.push(createError.message);
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
      User.find({ 'memberships.organizationId': { $eq: organization.id } }).sort('firstName lastName').then((users) => {
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

/**
 * Updates a user's profile image, writing to CDN folder
 * @param {*} user 
 * @param {*} imageData 
 */
export const updateUserProfileImage = (user, imageData) => {
  const buffer = Buffer.from(imageData.split(/,\s*/)[1], 'base64');
  if (!existsSync(`${APP_DATA_ROOT}/profiles`)) mkdirSync(`${APP_DATA_ROOT}/profiles`);
  const path = `${APP_DATA_ROOT}/profiles/${user._id}/`;

  if (!existsSync(path)) mkdirSync(path);
  const filename = `${APP_DATA_ROOT}/profiles/${user._id}/profile_${user._id}_default.jpeg`;

  if (imageData.startsWith('data:image/png')) {
    pngToJpeg({ quality: 90 })(buffer).then(output => writeFileSync(filename, output));
  } else writeFileSync(filename, buffer);

  return `profile_${user._id}_default.jpeg`;
};

function* updateProfileGenerator(id, profileData) {
  console.log('Updating user profile', { id, profileData });
  const found = yield User.findById(id);
  if (!found) throw new UserNotFoundException('User not found', { id });
  if (profileData.avatar !== found.avatar) {
    found.avatar = updateUserProfileImage(found, profileData.avatar);
  }
  found.firstName = profileData.firstName;
  found.lastName = profileData.lastName;
  found.email = profileData.email;
  return yield found.save();
}

export const updateProfile = co.wrap(updateProfileGenerator);
/**
 * Sets the peers for a user after they have been validate.
 * @param {User} user
 * @param {Array<*>} peers
 * @param {Organization} organization
 */
export const setPeersForUser = (user, peers, organization, allowEdit = true, confirmedAt = null) => { // eslint-disable-line max-len
  return Organigram.findOne({
    user: user._id, // eslint-disable-line no-underscore-dangle
    organization: organization._id, // eslint-disable-line no-underscore-dangle
  }).then((organigram) => {
    if (isNil(organigram) === true) {
      return new Organigram({
        user: user._id, // eslint-disable-line no-underscore-dangle
        organization: organization._id, // eslint-disable-line no-underscore-dangle
        peers,
        updatedAt: new Date().valueOf(),
        allowEdit,
        confirmedAt,
      }).save().then();
    }
    organigram.peers = peers; // eslint-disable-line no-param-reassign
    organigram.updatedAt = new Date().valueOf(); // eslint-disable-line no-param-reassign
    organigram.confirmedAt = confirmedAt; // eslint-disable-line no-param-reassign
    organigram.allowEdit = allowEdit; // eslint-disable-line no-param-reassign
    return organigram.save().then();
  });
};

export default {
  CreateUserResult,
  defaultUserCreateOptions,
  createUserForOrganization,
  registerUser,
  setPeersForUser,
  createMembership,
  removeMembership,
  updateMembership,
  updateProfile,
  listAll,
  listAllForOrganization,
  User,
  sendResetPasswordEmail,
};
