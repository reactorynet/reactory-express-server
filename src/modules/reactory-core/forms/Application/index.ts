/**
 * @module reactory-core/forms/Application
 * @description Defines an Application dashboard form. A dashboard for an application will display 
 * vital statistics and information about the application. 
 * @version 1.0.0
 * @see {@link rectory-core/forms/Application/readme.md|Application Readme} for more information.
 */

/**
 * Step 1: Define the schema for the Application dashboard form. The schema follows standard JSON schema
 * format. The structure of the form is defined by the schema. The schema can be thought of the UI View Model.
 * @see {@link https://json-schema.org/|JSON Schema} for more information.
 * @typedef {Object} Reactory.Schema.IObjectSchema
 */
const schema: Reactory.Schema.IObjectSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      title: "Name",
    },
    description: {
      type: "string",
      title: "Description",
    },
    version: {
      type: "string",
      title: "Version",
    },
    status: {
      type: "string",
      title: "Status",
    },
    createdAt: {
      type: "string",
      title: "Created At",
    },
    updatedAt: {
      type: "string",
      title: "Updated At",
    },
    createdBy: {
      type: "string",
      title: "Created By",
    },
    updatedBy: {
      type: "string",
      title: "Updated By",
    },
    totalUsers: {
      type: "number",
      title: "Total Users",
    },
    totalRoles: {
      type: "number",
      title: "Total Roles",
    },
    totalOrganisations: {
      type: "number",
      title: "Total Organisations",
    },
  },
};

/**
 * Step 2: Define the UI Schema for the Application dashboard form. The UI Schema defines how the form
 * will be displayed to the user. The UI Schema can be thought of as the UI View. The UI Schema is used
 * to render the form in the UI.
 * @see {@link https://react-jsonschema-form.readthedocs.io/en/latest/ |React JSON Schema Form} for more information.
 * @typedef {Object} Reactory.Schema.IFormUISchema
 */
const uiSchema: Reactory.Schema.IFormUISchema = {};
/**
 * Step 3: Define the GraphQL definition for the Application dashboard form. The GraphQL definition
 * is used to define the queries and mutations that will be used to fetch and update data for the form.
 */
const graphql: Reactory.Forms.IFormGraphDefinition = { };
/**
 * Step 4: Define the modules for the Application dashboard form. Modules are used to extend the functionality
 * of the form. Modules can be used to add custom logic, validation, and other features to the form.
 * 
 * These modules are resolved at runtime and can be used to add custom functionality to the form.
 */
const modules: Reactory.Forms.IReactoryFormModule[] = [];

/**
 * Defines an Application dashboard form. A dashboard for an application will display 
 * vital statistics and information about the application.
 */
const Application: Reactory.Forms.IReactoryForm = {
  id: `reactory-applications`,
  nameSpace: 'reactory',
  name: 'Application',
  uiFramework: "material",
  uiSupport: ["material"],  
  title: "Reactory Application Dashboard",
  registerAsComponent: true,
  version: "1.0.0",
  roles: ['USER'],
  helpTopics: [
    "reactory-applications", 
    "application-management"],  
  schema,
  uiSchema,
  modules
};

export default Application;