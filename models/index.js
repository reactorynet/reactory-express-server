
import ApplicationModel from './schema/Application';
import EmailQueueModel from './schema/EmailQueue';
import LeadershipBrandModel from './schema/LeadershipBrand';
import NotificationModel from './schema/Notification';
import OrganizationModel from './schema/Organization';
import OrganigramModel from './schema/Organigram';
import ReactoryClientModel from './schema/ReactoryClient';
import SurveyModel from './schema/Survey';
import TemplateModel from './schema/Template';
import TeamModel from './schema/Team';
import UserModel from './schema/User';

export const Application = ApplicationModel;
export const Organization = OrganizationModel;
export const Organigram = OrganigramModel;
export const Notification = NotificationModel;
export const User = UserModel;
export const ReactoryClient = ReactoryClientModel;
export const Template = TemplateModel;
export const LeadershipBrand = LeadershipBrandModel;
export const EmailQueue = EmailQueueModel;
export const Team = TeamModel;
export const Survey = SurveyModel;

const models = {
  Application,
  EmailQueue,
  LeadershipBrand,
  Notification,
  Organization,
  Organigram,
  ReactoryClient,
  Survey,
  Team,
  Template,
  User,
};

export default models;
