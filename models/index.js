
import AssessmentModel from './schema/Assessment';
import ApplicationModel from './schema/Application';
import EmailQueueModel from './schema/EmailQueue';
import LeadershipBrandModel from './schema/LeadershipBrand';
import NotificationModel from './schema/Notification';
import OrganizationModel from './schema/Organization';
import OrganigramModel from './schema/Organigram';
import ReactoryClientModel from './schema/ReactoryClient';
import SurveyModel from './schema/Survey';
import ScaleModel from './schema/Scale';
import TemplateModel from './schema/Template';
import TeamModel from './schema/Team';
import UserModel from './schema/User';
import TaskModel from './schema/Task';

export const Assessment = AssessmentModel;
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
export const Scale = ScaleModel;
export const Task = TaskModel;
const models = {
  Assessment,
  Application,
  EmailQueue,
  LeadershipBrand,
  Notification,
  Organization,
  Organigram,
  ReactoryClient,
  Survey,
  Scale,
  Team,
  Template,
  User,
  Task,
};

export default models;
