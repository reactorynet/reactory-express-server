import { DataSource } from "typeorm";
import Audit from "./Audit";
import Application from "./Application";
import BusinessUnit from "./BusinessUnit";
import ClientComponent from "./ClientComponent";
import Comment from "./Comment";
import Content from "./Content";
import Cache from "./CoreCache";
import CoreCategory from "./CoreCategory";
import CoreFile from "./CoreFile";
import EmailQueue from "./EmailQueue";
import Menu from "./Menu";
import Notification from "./Notification";
import OperationalGroup from "./OperationalGroup";
import Organigram from "./Organigram";
import Organization from "./Organization";
import PersonalDemographic from "./PersonalDemographic";
import Project from "./Project";
import ProjectBoard from "./ProjectBoard";
import ReactoryClient from "./ReactoryClient";
import ReactoryModelMeta from "./ReactoryModelMeta";
import ReactoryFileImportPackage from "./ReactoryFileImportPackage";
import ReactoryResource from "./ReactoryResource";
import ReactorySupportTicket from "./ReactorySupportTicket";
import ReactoryTranslation from "./ReactoryTranslation";
import Region from "./Region";
import StatisticPackage, { StatisticModel as Statistic } from "./Statistic";
import Task from "./Task";
import Team from "./Team";
import Template from "./Template";
import Theme from "./Theme";
import User from "./User";
import UserDemographic from "./UserDemographics";
import Reactory from "@reactory/reactory-core";
import logger from "@reactory/server-core/logging";
import { encoder, strongRandom } from "@reactory/server-core/utils";
import Hash from "utils/hash";

export const PostgresDataSource = new DataSource({
  type: "postgres",
  host: process.env.REACTORY_POSTGRES_HOST || "localhost",
  port: parseInt(process.env.REACTORY_POSTGRES_PORT || "5432"),
  username: process.env.REACTORY_POSTGRES_USER || "reactory",
  password: process.env.REACTORY_POSTGRES_PASSWORD || "reactory",
  database: process.env.REACTORY_POSTGRES_DB || "reactory",
  synchronize: true,
  entities: [Audit],
});

export type CoreModelTypes =
  | typeof PostgresDataSource
  | typeof Audit
  | typeof Application
  | typeof BusinessUnit
  | typeof ClientComponent
  | typeof Comment
  | typeof Content
  | typeof Cache
  | typeof CoreCategory
  | typeof ReactoryFileImportPackage
  | typeof ReactoryModelMeta
  | typeof CoreFile
  | typeof ReactorySupportTicket
  | typeof ReactoryTranslation
  | typeof EmailQueue
  | typeof Menu
  | typeof Notification
  | typeof OperationalGroup
  | typeof Organigram
  | typeof Organization
  | typeof PersonalDemographic
  | typeof Project
  | typeof ProjectBoard
  | typeof ReactoryClient
  | typeof ReactoryResource
  | typeof ReactoryTranslation
  | typeof Region
  | typeof Statistic
  | typeof StatisticPackage
  | typeof Task
  | typeof Team
  | typeof Template
  | typeof Theme
  | typeof User
  | typeof UserDemographic;


export const ModelDefinitions: Reactory.IReactoryComponentDefinition<CoreModelTypes>[] =
  [
    {
      nameSpace: "core",
      name: "Audit",
      version: "1.0.0",
      description: "Provides an audit model for the server",
      stem: "audit",
      tags: ["audit", "core", "system"],
      component: Audit,
      domain: Reactory.ComponentDomain.model,
      overwrite: false,
      roles: [],
      features: [
        {
          feature: "audit",
          action: ["create", "read"],
          description:
            "Audit feature allows for creating and reading of audit records",
          stem: "audit",
          featureType: Reactory.FeatureType.object,
        },
      ],
    },
    {
      nameSpace: "core",
      name: "ReactoryPostgresDataSource",
      version: "1.0.0",
      description:
        "Provides a postgres data source for the reactory core server functionality",
      stem: "postgres",
      tags: ["postgres", "core", "system"],
      component: PostgresDataSource,
      domain: Reactory.ComponentDomain.model,
      overwrite: false,
      onStartup: async (context: Reactory.Server.IReactoryContext) => {
        logger.info("Synchronizing Postgres Data Source");
        await PostgresDataSource.initialize();
        await PostgresDataSource.synchronize();
        const repo = PostgresDataSource.getRepository(Audit);
        const audit = new Audit();
        audit.user = "system";
        audit.action = "db-sync";
        audit.source = process.env.SERVER_ID || "reactory-server-local";
        audit.createdAt = new Date();
        audit.signature = Hash(encoder.encodeState(audit)).toString();
        repo.save(audit);

        logger.debug("Postgres Data Source Synchronized");

        context.state.postgres = PostgresDataSource;
      },
    },
    {
      nameSpace: "core",
      name: "Application",
      version: "1.0.0",
      description: "Provides an application model for the server",
      stem: "application",
      tags: ["application", "core", "system"],
      component: Application,
      domain: Reactory.ComponentDomain.model,
      onStartup: async (context: Reactory.Server.IReactoryContext) => {
        let reactoryApp = await Application.findOne({ title: "Reactory" });

        if (!reactoryApp) {
          logger.info("Adding Reactory Core Definition");
          reactoryApp = new Application({
            title: "Reactory",
            description: "Core Reactory Application",
            version: process.env.VERSION || "1.0.0",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          await reactoryApp.save();
          context.state.application = reactoryApp;
        }
      },
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      name: "BusinessUnit",
      version: "1.0.0",
      description: "Provides a business unit model for the server",
      stem: "business-unit",
      tags: ["business-unit", "core", "system"],
      component: BusinessUnit,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      name: "ClientComponent",
      version: "1.0.0",
      description: "Provides a client component model for the server",

      stem: "client-component",
      tags: ["client-component", "core", "system"],
      component: ClientComponent,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      name: "Comment",
      version: "1.0.0",
      description: "Provides a comment model for the server",

      stem: "comment",
      tags: ["comment", "core", "system"],
      component: Comment,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      name: "Content",
      version: "1.0.0",
      description: "Provides a content model for the server",

      stem: "content",
      tags: ["content", "core", "system"],
      component: Content,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      name: "CoreCache",
      version: "1.0.0",
      description: "Provides a cache model for the server",

      stem: "core-cache",
      tags: ["core-cache", "core", "system"],
      component: Cache,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      name: "CoreCategory",
      version: "1.0.0",
      description: "Provides a category model for the server",

      stem: "core-category",
      tags: ["core-category", "core", "system"],
      component: CoreCategory,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      name: "CoreFile",
      version: "1.0.0",
      description: "Provides a file model for the server",

      stem: "core-file",
      tags: ["core-file", "core", "system"],
      component: CoreFile,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      name: "ReactorySupportTicket",
      version: "1.0.0",
      description: "Provides a support ticket model for the server",

      stem: "reactory-support-ticket",
      tags: ["reactory-support-ticket", "reactory", "system"],
      component: ReactorySupportTicket,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      name: "ReactoryTranslation",
      version: "1.0.0",
      description: "Provides a translation model for the server",
      stem: "reactory-translation",
      tags: ["reactory-translation", "reactory", "system"],
      component: ReactoryTranslation,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      name: "EmailQueue",
      version: "1.0.0",
      description: "Provides an email queue model for the server",
      stem: "email-queue",
      tags: ["email-queue", "core", "system"],
      component: EmailQueue,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      name: "Menu",
      version: "1.0.0",
      description: "Provides a menu model for the server",
      stem: "menu",
      tags: ["menu", "core", "system"],
      component: Menu,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      name: "Notification",
      version: "1.0.0",
      description: "Provides a notification model for the server",

      stem: "notification",
      tags: ["notification", "core", "system"],
      component: Notification,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      name: "OperationalGroup",
      version: "1.0.0",
      description: "Provides an operational group model for the server",

      stem: "operational-group",
      tags: ["operational-group", "core", "system"],
      component: OperationalGroup,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      name: "Organigram",
      version: "1.0.0",
      description: "Provides an organigram model for the server",

      stem: "organigram",
      tags: ["organigram", "core", "system"],
      component: Organigram,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      version: "1.0.0",
      name: "Organization",
      description: "Provides an organization model for the server",

      stem: "organization",
      tags: ["organization", "core", "system"],
      component: Organization,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      version: "1.0.0",
      name: "PersonalDemographic",
      description: "Provides a personal demographic model for the server",

      stem: "personal-demographic",
      tags: ["personal-demographic", "core", "system"],
      component: PersonalDemographic,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      version: "1.0.0",
      name: "Project",
      description: "Provides a project model for the server",
      stem: "project",
      tags: ["project", "core", "system"],
      component: Project,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      version: "1.0.0",
      name: "ProjectBoard",
      description: "Provides a project board model for the server",

      stem: "project-board",
      tags: ["project-board", "core", "system"],
      component: ProjectBoard,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      version: "1.0.0",
      name: "ReactoryClient",
      description: "Provides a reactory client model for the server",
      stem: "reactory-client",
      tags: ["reactory-client", "reactory", "system"],
      component: ReactoryClient,
      domain: "model",
      onStartup: ReactoryClient.onStartup,
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      version: "1.0.0",
      name: "ReactoryResource",
      description: "Provides a reactory resource model for the server",

      stem: "reactory-resource",
      tags: ["reactory-resource", "reactory", "system"],
      component: ReactoryResource,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      version: "1.0.0",
      name: "Region",
      description: "Provides a region model for the server",
      stem: "region",
      tags: ["region", "core", "system"],
      component: Region,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      version: "1.0.0",
      name: "Statistic",
      description: "Provides a statistic model for the server",
      stem: "statistic",
      tags: ["statistic", "core", "system"],
      component: Statistic,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "statistic",
      version: "1.0.0",
      name: "StatisticPackage",
      description: "Provides a statistic package model for the server",

      stem: "statistic-package",
      tags: ["statistic-package", "statistic", "system"],
      component: StatisticPackage,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      version: "1.0.0",
      name: "Task",
      description: "Provides a task model for the server",

      stem: "task",
      tags: ["task", "core", "system"],
      component: Task,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      version: "1.0.0",
      name: "Team",
      description: "Provides a team model for the server",

      stem: "team",
      tags: ["team", "core", "system"],
      component: Team,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      name: "Template",
      version: "1.0.0",
      description: "Provides a template model for the server",

      stem: "template",
      tags: ["template", "core", "system"],
      component: Template,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      name: "Theme",
      version: "1.0.0",
      description: "Provides a theme model for the server",

      stem: "theme",
      tags: ["theme", "core", "system"],
      component: Theme,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      name: "User",
      version: "1.0.0",
      description: "Provides a user model for the server",
      stem: "user",
      tags: ["user", "core", "system"],
      component: User,
      domain: "model",
      overwrite: true,
      onStartup: async (context: Reactory.Server.IReactoryContext) => {
        logger.debug(`Checking for system admin user`);
        let email = process.env.SYSADMIN_EMAIL || 'system@localhost';
        let sysAdminUser = await User.findOne({
          email,
        });

        if (sysAdminUser === null) {
          logger.debug(`System admin user not found, creating default user`);
          sysAdminUser = new User({
            username: "sysadmin",
            firstName: "System",
            lastName: "User",
            email,
            authProvider: "LOCAL",
            providerId: "reactory-system",
            lastLogin: new Date(),
            roles: ["SYSADMIN"],
            legacyId: -1,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          sysAdminUser.setPassword(strongRandom(16));
          await sysAdminUser.save().then();
        }
        context.state.sysAdmin = sysAdminUser;
      },
      roles: [],
      features: [],
    },
    {
      nameSpace: "core",
      name: "UserDemographics",
      version: "1.0.0",
      description: "Provides a user demographics model for the server",
      stem: "user-demographics",
      tags: ["user-demographics", "core", "system"],
      component: UserDemographic,
      domain: "model",
      overwrite: true,
      roles: [],
      features: [],
    },
  ];
;

export default ModelDefinitions;
