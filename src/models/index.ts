
import './plugins';
import ApplicationModel from '@reactory/server-modules/core/models/Application';
import EmailQueueModel from '@reactory/server-modules/core/models/EmailQueue';
import NotificationModel from '@reactory/server-modules/core/models/Notification';
import OrganizationModel from '@reactory/server-modules/core/models/Organization';
import BusinessUnitModel from '@reactory/server-modules/core/models/BusinessUnit';
import OrganigramModel from '@reactory/server-modules/core/models/Organigram';
import MenuModel, { MenuItemModel } from '@reactory/server-modules/core/models/Menu';
import ClientComponentModel from '@reactory/server-modules/core/models/ClientComponent';
import ReactoryClientModel from '@reactory/server-modules/core/models/ReactoryClient';
import TemplateModel from '@reactory/server-modules/core/models/Template';
import TeamModel from '@reactory/server-modules/core/models/Team';
import ReactoryUserModel from '@reactory/server-modules/core/models/User';
import TaskModel from '@reactory/server-modules/core/models/Task';
import ThemeModel from '@reactory/server-modules/core/models/Theme';
import ProjectModel from '@reactory/server-modules/core/models/Project';
import BoardModel from '@reactory/server-modules/core/models/ProjectBoard';
import CommentModel from '@reactory/server-modules/core/models/Comment';
import UserDemographicsModel from '@reactory/server-modules/core/models/UserDemographics';
import ContentModel from '@reactory/server-modules/core/models/Content';
import PersonalDemographicModel from '@reactory/server-modules/core/models/PersonalDemographic';
import RegionModel from '@reactory/server-modules/core/models/Region';
import OperationalGroupModel from '@reactory/server-modules/core/models/OperationalGroup';
import CoreModels from '../modules/core/models';


export const Application = ApplicationModel;
export const Comment = CommentModel;
export const Cache = CoreModels.Cache;
export const Organization = OrganizationModel;
export const Organigram = OrganigramModel;
export const Notification = NotificationModel;
export const User = ReactoryUserModel;
export const ReactoryClient = ReactoryClientModel;
export const Template = TemplateModel;
export const EmailQueue = EmailQueueModel;
export const Team = TeamModel;
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
  Cache: CoreModels.Cache,
  Application,
  Board,
  Comment,
  ClientComponent,
  EmailQueue,
  Menu,
  MenuItem,
  Notification,
  Organization,
  Organigram,
  Project,
  ReactoryClient,
  Team,
  Theme,
  Template,
  User,
  Task,
  UserDemographic,
};

export default models;
