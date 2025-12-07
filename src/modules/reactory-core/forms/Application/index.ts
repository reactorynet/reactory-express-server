/**
 * @module reactory-core/forms/Application
 * @description Defines an Application dashboard form. A dashboard for an application will display 
 * vital statistics and information about the application using a tabbed layout.
 * @version 1.0.0
 * @see {@link rectory-core/forms/Application/readme.md|Application Readme} for more information.
 */

import schema from './schema';
import uiSchema from './uiSchema';
import graphql from './graphql';
import modules from './modules';

/**
 * Defines an Application dashboard form. A dashboard for an application will display 
 * vital statistics and information about the application using tabs to organize
 * different aspects like overview, settings, users, organizations, roles, themes, and statistics.
 * 
 * This form requires an applicationId to be passed as a prop to load the specific
 * application data via GraphQL.
 */
const Application: Reactory.Forms.IReactoryForm = {
  id: `reactory-application`,
  nameSpace: 'reactory',
  name: 'Application',
  uiFramework: "material",
  uiSupport: ["material"],  
  title: "Application Dashboard",
  registerAsComponent: true,
  version: "1.0.0",
  roles: ['USER', 'ADMIN'],
  description: `A comprehensive dashboard for viewing and managing a Reactory application. This form uses a tabbed layout to organize information about the application including overview, settings, users, organizations, roles, themes, and statistics. Requires an applicationId to be passed as a prop.`,
  argsSchema: {
    type: 'object',
    properties: {
      applicationId: {
        type: 'string',
        title: 'Application ID',
        description: 'The ID of the Reactory application to load. This is required to load the application data.',
      },
    },
    required: ['applicationId'],
  },
  helpTopics: [
    "reactory-application-dashboard", 
    "application-management",
    "application-settings"],  
  widgetMap: [
    {
      componentFqn: 'reactory.ApplicationOverviewPanel@1.0.0',
      widget: 'ApplicationOverviewPanel',
    },
    {
      componentFqn: 'reactory.ApplicationSettingsPanel@1.0.0',
      widget: 'ApplicationSettingsPanel',
    },
    {
      componentFqn: 'reactory.ApplicationUsersPanel@1.0.0',
      widget: 'ApplicationUsersPanel',
    },
    {
      componentFqn: 'reactory.ApplicationOrganizationsPanel@1.0.0',
      widget: 'ApplicationOrganizationsPanel',
    },
    {
      componentFqn: 'reactory.ApplicationRolesPanel@1.0.0',
      widget: 'ApplicationRolesPanel',
    },
    {
      componentFqn: 'reactory.ApplicationThemesPanel@1.0.0',
      widget: 'ApplicationThemesPanel',
    },
    {
      componentFqn: 'reactory.ApplicationStatisticsPanel@1.0.0',
      widget: 'ApplicationStatisticsPanel',
    },
    {
      componentFqn: 'reactory.ApplicationRoutesPanel@1.0.0',
      widget: 'ApplicationRoutesPanel',
    },
    {
      componentFqn: 'reactory.ApplicationMenusPanel@1.0.0',
      widget: 'ApplicationMenusPanel',
    },
  ],
  schema,
  uiSchema,
  graphql,
  modules
};

export default Application;