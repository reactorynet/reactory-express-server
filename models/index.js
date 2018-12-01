
import './plugins';
import AssessmentModel from './schema/Assessment';
import ApplicationModel from './schema/Application';
import EmailQueueModel from './schema/EmailQueue';
import LeadershipBrandModel from './schema/LeadershipBrand';
import NotificationModel from './schema/Notification';
import OrganizationModel from './schema/Organization';
import BusinessUnitModel from './schema/BusinessUnit';
import OrganigramModel from './schema/Organigram';
import MenuModel, { MenuItemModel } from './schema/Menu';
import ClientComponentModel from './schema/ClientComponent';
import ReactoryClientModel from './schema/ReactoryClient';
import SurveyModel from './schema/Survey';
import ScaleModel from './schema/Scale';
import TemplateModel from './schema/Template';
import TeamModel from './schema/Team';
import UserModel from './schema/User';
import TaskModel from './schema/Task';
import ThemeModel from './schema/Theme';
import ProjectModel from './schema/Project';
import CommentModel from './schema/Comment';

export const Assessment = AssessmentModel;
export const Application = ApplicationModel;
export const Comment = CommentModel;
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
export const Project = ProjectModel;
export const ClientComponent = ClientComponentModel;
export const Menu = MenuModel;
export const MenuItem = MenuItemModel;
export const Theme = ThemeModel;
export const BusinessUnit = BusinessUnitModel;
const models = {
  Assessment,
  Application,
  Comment,
  ClientComponent,
  EmailQueue,
  LeadershipBrand,
  Menu,
  MenuItem,
  Notification,
  Organization,
  Organigram,
  Project,
  ReactoryClient,
  Survey,
  Scale,
  Team,
  Theme,
  Template,
  User,
  Task,
};

export default models;
