import { defaultFormProps } from '../defs';

export const ReactoryDashboard = {
  id: 'ReactoryDashboard',
  ...defaultFormProps,
  name: 'Dashboard',
  nameSpace: 'reactory',
  version: '1.0.0',
  componentDefs: [],
  registerAsComponent: true,
  schema: {
    type: 'Object',
    title: 'Project ${name} configuration',
    description: 'Configure your Projects',
    properties: {
      name: {
        type: 'string',
        title: 'Name',
      },
      description: {
        type: 'string',
        title: 'string',
      },
    },
  },
  uiSchema: {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        name: { md: 3, sm: 12 },
        description: { md: 9, sm: 12 },
      },
    ],
    description: {
      'ui:widget': 'FroalaWidget',
    },
  },
};

export const ReactoryApplicationsForm = {
  id: 'ReactoryApplicationsForm',
  ...defaultFormProps,
  name: 'ReactoryApplicationsForm',
  nameSpace: 'reactory',
  version: '1.0.0',
  componentDefs: [],
  registerAsComponent: true,
  schema: {
    type: 'object',
    title: 'Projects',
    description: 'Available Projects',
    properties: {
      searchInput: {
        type: 'string',
        title: 'Search',
      },
      projects: {
        type: 'array',
        title: 'Listed Projects',
        items: {
          type: 'object',
          title: 'Project',
          properties: {
            id: {
              type: 'string',
              title: 'Project Id',
            },
            name: {
              type: 'string',
              title: 'Project Name',
            },
          },
        },
      },
    },
  },
  uiSchema: {
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        searchInput: { md: 12, sm: 12 },
        projects: { md: 12, sm: 12 },
      },
    ],
  },
};

export const ReactoryClientAdminPage = {
  id: 'ReactoryClientAdmin',
  ...defaultFormProps,
  name: 'ReactoryClientAdmin',
  nameSpace: 'reactory',
  version: '1.0.0',
  componentDefs: [
    'reactory.Dashboard@1.0.0',
    'reactory.ReactoryApplicationsForm@1.0.0',
  ],
  widgetMap: [
    { component: 'reactory.ProjectListWidget@1.0.0', widget: 'Dashboard' },
    { component: 'reactory.ProjectDetailForm@1.0.0', widget: 'ReactoryApplicationsForm' },
  ],
  registerAsComponent: true,
  schema: {
    type: 'Object',
    title: 'Project Admin Page',
    description: 'Configure your Projects',
    properties: {
      listWidget: {
        type: 'string',
        title: 'List',
      },
      detailWidget: {
        type: 'string',
        title: 'Detail',
      },
    },
  },
  uiSchema: {
    showSubmit: false,
    'ui:field': 'GridLayout',
    'ui:grid-layout': [
      {
        listWidget: { md: 3, sm: 12 },
        detailWidget: { md: 9, sm: 12 },
      },
    ],
    listWidget: {
      'ui:widget': 'ProjectListWidget',
    },
    detailWidget: {
      'ui:widget': 'ProjectDetailForm',
    },
  },
};
