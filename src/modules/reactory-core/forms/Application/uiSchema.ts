import Reactory from "@reactory/reactory-core";

/**
 * UI Schema for the Application dashboard form using TabbedLayout
 * This defines how the form will be displayed to the user with tabs
 * to organize different aspects of the application.
 */
const uiSchema: Reactory.Schema.IFormUISchema = {
  "ui:form": {
    showSubmit: false,
    showHelp: false,
    showRefresh: true,
  },
  "ui:field": "TabbedLayout",
  "ui:tab-layout": [
    {
      field: "overview",
      icon: "dashboard",
      title: "Overview",
    },
    {
      field: "settings",
      icon: "settings",
      title: "Settings",
    },
    {
      field: "users",
      icon: "people",
      title: "Users",
    },
    {
      field: "organizations",
      icon: "business",
      title: "Organizations",
    },
    {
      field: "roles",
      icon: "admin_panel_settings",
      title: "Roles",
    },
    {
      field: "themes",
      icon: "palette",
      title: "Themes",
    },
    {
      field: "statistics",
      icon: "bar_chart",
      title: "Statistics",
    },
    {
      field: "routes",
      icon: "route",
      title: "Routes",
    },
    {
      field: "menus",
      icon: "menu",
      title: "Menus",
    },
  ],
  "ui:options": {
    activeTab: "query",
    activeTabKey: "tab",
  },
  "ui:tab-options": {
    useRouter: true,
    path: "/applications/${formContext.props.applicationId}?tab=${tab_id}",
  },
  overview: {
    "ui:widget": "ApplicationOverviewPanel",
    "ui:props-map": {
      'formContext.props.applicationId': 'applicationId',
      'formContext.props.mode': 'mode',
    },
  },
  settings: {
    "ui:widget": "ApplicationSettingsPanel",
    "ui:props-map": {
      'formContext.props.applicationId': 'applicationId',
      'formContext.props.mode': 'mode',
    },
  },
  users: {
    "ui:widget": "ApplicationUsersPanel",
    "ui:props-map": {
      'formContext.props.applicationId': 'applicationId',
      'formContext.props.mode': 'mode',
    },
  },
  organizations: {
    "ui:widget": "ApplicationOrganizationsPanel",
    "ui:props-map": {
      'formContext.props.applicationId': 'applicationId',
      'formContext.props.mode': 'mode',
    },
  },
  roles: {
    "ui:widget": "ApplicationRolesPanel",
    "ui:props-map": {
      'formContext.props.applicationId': 'applicationId',
      'formContext.props.mode': 'mode',
    },
  },
  themes: {
    "ui:widget": "ApplicationThemesPanel",
    "ui:props-map": {
      'formContext.props.applicationId': 'applicationId',
      'formContext.props.mode': 'mode',
    },
  },
  statistics: {
    "ui:widget": "ApplicationStatisticsPanel",
    "ui:props-map": {
      'formContext.props.applicationId': 'applicationId',
      'formContext.props.mode': 'mode',
    },
  },
  routes: {
    "ui:widget": "ApplicationRoutesPanel",
    "ui:props-map": {
      'formContext.props.applicationId': 'applicationId',
      'formContext.props.mode': 'mode',
    },
  },
  menus: {
    "ui:widget": "ApplicationMenusPanel",
    "ui:props-map": {
      'formContext.props.applicationId': 'applicationId',
      'formContext.props.mode': 'mode',
    },
  },
};

export default uiSchema;

