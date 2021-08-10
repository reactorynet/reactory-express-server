
import './plugins';
import ApplicationModel from './schema/Application';
import EmailQueueModel from './schema/EmailQueue';
import LeadershipBrandModel from '@reactory/server-modules/mores/models/LeadershipBrand';
import AssessmentModel from '@reactory/server-modules/mores/models/Assessment';
import SurveyModel, { EVENTS_TO_TRACK } from '@reactory/server-modules/mores/models/Survey';
import NotificationModel from './schema/Notification';
import OrganizationModel from './schema/Organization';
import BusinessUnitModel from './schema/BusinessUnit';
import OrganigramModel from './schema/Organigram';
import MenuModel, { MenuItemModel } from './schema/Menu';
import ClientComponentModel from './schema/ClientComponent';
import ReactoryClientModel from './schema/ReactoryClient';
import ScaleModel from './schema/Scale';
import TemplateModel from './schema/Template';
import TeamModel from './schema/Team';
import ReactoryUserModel from './schema/User';
import TaskModel from './schema/Task';
import ThemeModel from './schema/Theme';
import ProjectModel from './schema/Project';
import BoardModel from './schema/ProjectBoard';
import CommentModel from './schema/Comment';

//Christian
import UserDemographicsModel from './schema/UserDemographics';

// DREW
import ContentModel from './schema/Content';
import PersonalDemographicModel from './schema/PersonalDemographic';
import RegionModel from './schema/Region';
import OperationalGroupModel from './schema/OperationalGroup';

import { Cache } from '../modules/core/models';

//export const Assessment = AssessmentModel;
export const Application = ApplicationModel;
export const Assessment = AssessmentModel;
export const Comment = CommentModel;
export const Organization = OrganizationModel;
export const Organigram = OrganigramModel;
export const Notification = NotificationModel;
export const User = ReactoryUserModel;
export const ReactoryClient = ReactoryClientModel;
export const Template = TemplateModel;
export const LeadershipBrand = LeadershipBrandModel;
export const EmailQueue = EmailQueueModel;
export const Team = TeamModel;
export const Survey = SurveyModel;
export const SURVEY_EVENTS_TO_TRACK = EVENTS_TO_TRACK;
export const Scale = ScaleModel;
export const Task = TaskModel;
export const Project = ProjectModel;
export const ClientComponent = ClientComponentModel;
export const Menu = MenuModel;
export const MenuItem = MenuItemModel;
export const Theme = ThemeModel;
export const BusinessUnit = BusinessUnitModel;
export const Board = BoardModel;

//Christian
export const UserDemographic = UserDemographicsModel
// DREW
export const Content = ContentModel;
export const PersonalDemographic = PersonalDemographicModel;
export const Region = RegionModel;
export const OperationalGroup = OperationalGroupModel;

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
  UserDemographic,
};

export default models;
