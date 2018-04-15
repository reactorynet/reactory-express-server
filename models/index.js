import UserModel from './schema/User';
import ApplicationModel from './schema/Application';
import ReactoryClientModel from './schema/ReactoryClient';
import OrganizationModel from './schema/Organization';

export const Application = ApplicationModel;
export const Organization = OrganizationModel;
export const User = UserModel;
export const ReactoryClient = ReactoryClientModel;

const models = {
  Application,
  User,
  ReactoryClient,
  Organization,
};

export default models;
