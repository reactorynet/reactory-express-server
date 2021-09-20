import express from 'express';
import moment from 'moment';
import { isNil, isEmpty } from 'lodash';
import Admin from '../application/admin';
import { User } from '../models';
import ApiError, { UserExistsError, UserValidationError, OrganizationExistsError, UserNotFoundException, SystemError } from '../exceptions';
import AuthConfig from '../authentication';

const router = express.Router();
router.options('/register', (req, res) => {
  res.status(203).send('');
});

router.post('/register', (req, res) => {
  const { user, organization } = req.body;
  // console.log('processing registration request', { user, organization });
  Promise.all([
    Admin.Organization.findOrCreate(organization),
    Admin.User.registerUser(user),
  ]).then((results) => {
    // console.log('All promises resolved', results);
    const { partner } = req;
    const addedRoles = [];
    const organizationResult = results[0];
    const userResult = results[1];
    if (isNil(organization.id) === true) addedRoles.push('ORG_ADMIN');
    Admin.User.createMembership(userResult, partner, organizationResult, ['USER', ...addedRoles]).then((membershipResult) => {
      // console.log('Membership Result', membershipResult);
      res.send({
        firstName: userResult.firstName,
        lastName: userResult.lastName,
        token: AuthConfig.jwtMake(AuthConfig.jwtTokenForUser(userResult)),
      });
    });
  }).catch((error) => {
    console.error('Error occurred registering user', error);
    if (error instanceof UserValidationError) {
      res.status(400).send(error);
    }

    if (error instanceof UserExistsError) {
      res.status(409).send(error);
    }

    if (error instanceof OrganizationExistsError) {
      res.status(409).send(error);
    }

    const apiError = new ApiError(error.message);
    res.status(500).send(apiError);
  });
});

router.post('/forgot', (req, res) => {
  const { email } = req.body;
  User.findOne({ email }).then((user) => {
    if (user === null) res.status(404).send(new UserNotFoundException(`Could not find a user with email ${email}`, { email, error: 'No user' }));
    Admin.User.sendResetPasswordEmail(user, req.partner, { delivery: moment(), format: 'html' }).then(() => {
      res.status(200).send({ message: `A reset email has been sent to ${email}` });
    }).catch((sendError) => {
      res.status(500).send(sendError);
    });
  }).catch((findError) => {
    res.status(404).send(new UserNotFoundException(`Could not find a user with email ${email}`, { email, error: findError.message }));
  });
});

export default router;
