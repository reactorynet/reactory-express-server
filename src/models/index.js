
import './plugins';
import AssessmentModel from '../modules/towerstone/models/Assessment';
import ApplicationModel from './schema/Application';
import EmailQueueModel from './schema/EmailQueue';
import LeadershipBrandModel from '../modules/towerstone/models/LeadershipBrand';
import NotificationModel from './schema/Notification';
import OrganizationModel from './schema/Organization';
import BusinessUnitModel from './schema/BusinessUnit';
import OrganigramModel from './schema/Organigram';
import MenuModel, { MenuItemModel } from './schema/Menu';
import ClientComponentModel from './schema/ClientComponent';
import ReactoryClientModel from './schema/ReactoryClient';
import SurveyModel from '../modules/towerstone/models/Survey';
import ScaleModel from './schema/Scale';
import TemplateModel from './schema/Template';
import TeamModel from './schema/Team';
import UserModel from './schema/User';
import TaskModel from './schema/Task';
import ThemeModel from './schema/Theme';
import ProjectModel from './schema/Project';
import BoardModel from './schema/ProjectBoard';
import CommentModel from './schema/Comment';

// DREW
import ContentModel from './schema/Content';
import PersonalDemographicModel from './schema/PersonalDemographic';

import { Cache } from '../modules/core/models';

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
export const Board = BoardModel;

// DREW
export const Content = ContentModel;
export const PersonalDemographic = PersonalDemographicModel;

const models = {
  Cache,
  Assessment,
  Application,
  Board,
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
