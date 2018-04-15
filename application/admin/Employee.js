
import co from 'co';
import { User } from '../../../models';

class CreateUserResult {
  constructor() {
    this.organization = null;
    this.user = null;
  }
}

const defaultUserCreateOptions = {
  sendRegistrationEmail: false,
  clientId: null,
};

const createUserForOrganization = co.wrap(function* createUserForOrganization(
  user, password, organization, options = defaultUserCreateOptions,
  ) {
  console.log('create user for organization', { user, organization });
  const result = new CreateUserResult();
  try {
    result.user = yield User.findOne({ email: user.email });
    if (user === null) {
      result.user = new User({ ...user });
      result.user.setPassword('password'); //TODO: random generate 
      result.user = yield User.save();
      result.organization = organization;
    }
    return result;
  } catch (createError) {
    console.error('Could not create the user due to an error', createError);
    return result;
  }
});

module.exports = {
  createUserForOrganization,
};