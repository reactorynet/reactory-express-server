import co from 'co';
import * as dotenv from 'dotenv';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import pngToJpeg from 'png-to-jpeg';
import { ObjectId, ObjectID } from 'mongodb';
import moment from 'moment';
import { isNil, isEmpty, union, isFunction } from 'lodash';
import { User, Organization, Organigram, Assessment, Survey, Task } from '../../models';
import ApiError, { UserExistsError, UserValidationError, UserNotFoundException, RecordNotFoundError } from '../../exceptions';
import emails from '../../emails';
import logger from '../../logging';
import { Reactory } from '@reactory/server-core/types/reactory';

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

export const UserModel = User;

export const defaultUserCreateOptions = {
  sendRegistrationEmail: false,
  clientId: null,
};

export const userWithId = co.wrap(function* userWithIdGenerator(id) {
  return yield User.findById(ObjectId(id)).then();
});

export const createUserForOrganization = co.wrap(function* createUserForOrganization(user, password, organization, roles = [], provider = 'LOCAL', partner, businessUnit) { // eslint-disable-line max-len
  const result = new CreateUserResult();
  try {
    const partnerToUse = partner || global.partner;
    let foundUser = yield User.findOne({ email: user.email }, {
      _id: 1, memberships: 1, firstName: 1, lastName: 1,
    }).then();
    logger.info(`Using partner ${partnerToUse.name} to create user ${user.email} ${foundUser ? 'EXISTING' : 'NEW'}`);

    if (isNil(partnerToUse._id) === false) {
      if (isNil(foundUser) === true) {
        logger.info('User not found creating');
        foundUser = new User({
          ...user,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        foundUser.setPassword(password);
        yield foundUser.save().then();
      }

      const membership = {
        // eslint-disable-line      
        clientId: ObjectId(partnerToUse._id), // eslint-disable-line no-underscore-dangle
        organizationId: organization && organization._id ? ObjectId(organization._id) : null, // eslint-disable-line no-underscore-dangle
        businessUnitId: businessUnit && businessUnit._id ? ObjectId(businessUnit._id) : null, // eslint-disable-line no-underscore-dangle
        provider,
        enabled: true,
        roles: union(isFunction(partnerToUse.getDefaultUserRoles) ? partnerToUse.getDefaultUserRoles() : [], roles),
      };

      logger.debug('Checking Membership', { user, membership });
      if (foundUser.hasMembership(membership.clientId, membership.organizationId, membership.businessUnitId) === false) {
        foundUser.memberships.push(membership);
        result.user = yield foundUser.save().then();
      }

      return result;
    }
    throw new ApiError('Partner Is Required For User Creation');
  } catch (createError) {
    console.error('Created error occured', createError);
    result.errors.push(createError.message);
    return result;
  }
});

export const createMembership = (user, membership) => {
  return new Promise((resolve, reject) => {
    try {
      user.memberships.push(membership);
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
  logger.info('removeMembership', {
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
  logger.info('updateMembership', {
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


export const listAllForOrganization = async (organizationId: string | ObjectID,
  searchString = '',
  excludeSelf = false,
  showDeleted: boolean = false,
  paging: Reactory.IPagingRequest = { page: 1, pageSize: 25 }): Promise<Reactory.IUserDocument[] | Reactory.IPagedResponse<Reactory.IUserDocument>> => {

  const organization = await Organization.findOne({ _id: new ObjectID(organizationId) }).then();

  let response: Reactory.IPagedResponse<Reactory.IUserDocument> = {
    items: [],
    paging: {
      hasNext: false,
      page: paging.page,
      pageSize: paging.pageSize,
      total: 0
    }
  }

  let users: Reactory.IUserDocument[] = [];  
  
  try {

    if (organization) {
      const query: any = { 'memberships.organizationId': { $eq: organization._id } };

      if (showDeleted === false) {
        query.$or = [{ deleted: false }, { deleted: { $exists: false } }]
      }

      

      if (searchString.length > 0) {
        if (searchString.indexOf('@') > 0) {
          query.email = new RegExp(`${searchString}`, 'g');
        } else if (searchString.indexOf(' ') > 0) {
          query.firstName = new RegExp(`${searchString.split(' ')[0]}`, 'g');
          query.lastName = new RegExp(`${searchString.split(' ')[1]}`, 'g');
        } else {
          query.firstName = new RegExp(`${searchString.split(' ')[0]}`, 'g');
        }
      }

      response.paging.total = await User.count(query).then();
      if (response.paging.total > 0) {        
        response.items = await User.find(query).sort('firstName lastName').skip((paging.page -1)  * paging.pageSize).limit(paging.pageSize).then();    
        response.users = response.items; //alias
      }      
      response.paging.hasNext = response.paging.total > paging.pageSize;            
    }
  } catch (userListError) {

  }

  return response;

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
          logger.info('validation result', validation);
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
  logger.info('sendResetPasswordEmail', { user, partner, options });
  return emails.sendForgotPasswordEmail(user, null);
};

/**
 * Updates a user's profile image, writing to CDN folder
 * @param {*} user
 * @param {*} imageData
 */
export const updateUserProfileImage = (user: any, imageData: string = null, isBuffer = false, isPng = false) => {

  if (imageData === null || imageData === undefined) return null;

  const buffer = isBuffer === true ? imageData : Buffer.from(imageData.split(/,\s*/)[1], 'base64');
  if (!existsSync(`${APP_DATA_ROOT}/profiles`)) mkdirSync(`${APP_DATA_ROOT}/profiles`);
  const path = `${APP_DATA_ROOT}/profiles/${user._id}/`;

  if (!existsSync(path)) mkdirSync(path);
  const filename = `${APP_DATA_ROOT}/profiles/${user._id}/profile_${user._id}_default.jpeg`;

  if (isBuffer === false && typeof imageData === 'string') {
    if (imageData.startsWith('data:image/png' && isPng === true)) {
      pngToJpeg({ quality: 90 })(buffer).then(output => writeFileSync(filename, output));
    } else writeFileSync(filename, buffer);
  } else {
    writeFileSync(filename, buffer);
  }


  return `profile_${user._id}_default.jpeg`;
};

function* updateProfileGenerator(id, profileData) {
  logger.info('Updating user profile', { id, profileData });
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

export const assessmentsForUser = (user, complete = false) => {
  return new Promise((resolve, reject) => {
    if (isNil(user)) reject(new ApiError('Not Authorized'));
    return Assessment.find({ assessor: user._id }).then((assessments) => {
      logger.info('User assessments', { user, assessments });
      resolve(assessments);
    }).catch((e) => {
      console.error('User assessments', e);
      reject(e);
    });
  });
};

export const surveysForUser = co.wrap(function* surveysForUserGenerator(userId) {
  try {
    logger.info('Fetching surveys for user', userId);
    const found = yield Survey.find({ 'delegates.delegate': ObjectId(userId) }).then();
    logger.info(`Found ${found.length || 'NONE'} surveys`, found);
    return found;
  } catch (e) {
    console.error(e);
    return [];
  }
});

export const surveyForUser = async (userId, surveyId) => {
  try {
    const found = await Survey.findOne({ 'delegates.delegate': ObjectId(userId), _id: ObjectId(surveyId) }).then();
    return found;
  } catch (e) {
    throw new ApiError(`Could not find the survey for the user due to an error: ${e.message}`);
  }
};

export const assessmentForUserInSurvey = async (userId, surveyId) => {
  try {
    return await Assessment.find({ delegate: userId, survey: surveyId })
      .populate('assessor')
      .populate('delegate')
      .populate('survey')
      .then();
  } catch (e) {
    logger.error(e);
    return [];
  }
};

export const tasksForUserRelatedToSurvey = co.wrap(function* tasksForUserRelatedToSurveyGenerator(userId, surveyId) {
  try {
    return yield Task.find({ 'links.linkTo': 'survey', 'links.linkId': ObjectId(surveyId) }).then();
  } catch (e) {
    console.error(e);
    return [];
  }
});


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
  UserModel,
  sendResetPasswordEmail,
  assessmentsForUser,
  userWithId,
  surveysForUser,
  surveyForUser,
  assessmentForUserInSurvey,
  tasksForUserRelatedToSurvey,
};
