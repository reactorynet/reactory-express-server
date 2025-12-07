/**
 * Schema for the Application dashboard form. The schema follows standard JSON schema
 * format. The structure of the form is defined by the schema using tabs to organize
 * different aspects of the application.
 * @see {@link https://json-schema.org/|JSON Schema} for more information.
 */

const userSchema: Reactory.Schema.IObjectSchema = {
  type: "object",
  properties: {
    id: { type: "string", title: "User ID" },
    firstName: { type: "string", title: "First Name" },
    lastName: { type: "string", title: "Last Name" },
    email: { type: "string", title: "Email" },
    avatar: { type: "string", title: "Avatar URL", format: "uri" }
  }
};

const organizationSchema: Reactory.Schema.IObjectSchema = {
  type: "object",
  properties: {
    id: { type: "string", title: "Organization ID" },
    name: { type: "string", title: "Organization Name" },
    slug: { type: "string", title: "Slug" },
    avatar: { type: "string", title: "Avatar URL", format: "uri" },
    createdAt: { type: "string", format: "date-time", title: "Created At" }
  }
};

const roleSchema: Reactory.Schema.IObjectSchema = {
  type: "object",
  properties: {
    id: { type: "string", title: "Role ID" },
    name: { type: "string", title: "Role Name" },
    description: { type: "string", title: "Description" }
  }
};

const themeSchema: Reactory.Schema.IObjectSchema = {
  type: "object",
  properties: {
    id: { type: "string", title: "Theme ID" },
    name: { type: "string", title: "Theme Name" },
    mode: { type: "string", title: "Mode", enum: ["light", "dark"] },
    primaryColor: { type: "string", title: "Primary Color" },
    secondaryColor: { type: "string", title: "Secondary Color" }
  }
};

const schema: Reactory.Schema.IObjectSchema = {
  type: "object",
  title: "Application Dashboard",
  properties: {
    overview: {
      type: "object",
      properties: {
        id: { type: "string", title: "Application ID" },
        name: { type: "string", title: "Application Name" },
        key: { type: "string", title: "Application Key" },
        description: { type: "string", title: "Description" },
        avatar: { type: "string", title: "Avatar", format: "uri" },
        siteUrl: { type: "string", title: "Site URL", format: "uri" },
        version: { type: "string", title: "Version" },
        username: { type: "string", title: "Username" },
        email: { type: "string", title: "Email" },        
        theme: { type: "string", title: "Active Theme" },
        createdAt: { type: "string", format: "date-time", title: "Created At" },
        updatedAt: { type: "string", format: "date-time", title: "Updated At" },
      }
    },
    settings: {
      type: "object",
      properties: {
        settings: { 
          type: "object", 
          title: "Application Settings",
          properties: {
            name: { type: "string", title: "Setting Name" },
            settingType: { type: "string", title: "Setting Type" },
            variant: { type: "string", title: "Variant" },
            title: { type: "string", title: "Title" },
            description: { type: "string", title: "Description" },
            componentFqn: { type: "string", title: "Component FQN" },
            formSchema: { type: "object", title: "Form Schema", additionalProperties: true },
            data: { type: "object", title: "Data", additionalProperties: true }
          },
          additionalProperties: true 
        },
        menus: {
          type: "array",
          title: "Menus",
          items: {
            type: "object",
            properties: {
              id: { type: "string", title: "Menu ID" },
              key: { type: "string", title: "Menu Key" },
              target: { type: "string", title: "Target" },
              roles: { type: "array", items: { type: "string" }, title: "Roles" }
            }
          }
        }
      }
    },
    users: {
      type: "object",
      properties: {
        totalUsers: { type: "number", title: "Total Users" },
        users: {
          type: "array",
          title: "Users",
          items: userSchema
        }
      }
    },
    organizations: {
      type: "object",
      properties: {
        totalOrganisations: { type: "number", title: "Total Organizations" },
        organizations: {
          type: "array",
          title: "Organizations",
          items: organizationSchema
        }
      }
    },
    roles: {
      type: "object",
      properties: {
        totalRoles: { type: "number", title: "Total Roles" },
        roles: {
          type: "array",
          title: "Roles",
          items: roleSchema
        }
      }
    },
    themes: {
      type: "object",
      properties: {
        activeTheme: { type: "string", title: "Active Theme" },
        themes: {
          type: "array",
          title: "Available Themes",
          items: themeSchema
        }
      }
    },
    statistics: {
      type: "object",
      properties: {
        activeUsers: { type: "number", title: "Active Users" },
        totalSessions: { type: "number", title: "Total Sessions" },
        averageSessionDuration: { type: "number", title: "Average Session Duration (mins)" },
        lastActivity: { type: "string", format: "date-time", title: "Last Activity" }
      }
    },
    routes: {
      type: "object",
      properties: {
        totalRoutes: { type: "number", title: "Total Routes" },
        routes: {
          type: "array",
          title: "Application Routes",
          items: {
            type: "object",
            properties: {
              id: { type: "string", title: "Route ID" },
              key: { type: "string", title: "Route Key" },
              path: { type: "string", title: "Path" },
              title: { type: "string", title: "Title" },
              exact: { type: "boolean", title: "Exact Match" },
              public: { type: "boolean", title: "Public Route" },
              roles: { type: "array", items: { type: "string" }, title: "Required Roles" },
              componentFqn: { type: "string", title: "Component FQN" },
              componentProps: { type: "object", title: "Component Props", additionalProperties: true }
            }
          }
        }
      }
    },
    menus: {
      type: "object",
      properties: {
        totalMenus: { type: "number", title: "Total Menus" },
        menus: {
          type: "array",
          title: "Application Menus",
          items: {
            type: "object",
            properties: {
              id: { type: "string", title: "Menu ID" },
              key: { type: "string", title: "Menu Key" },
              target: { type: "string", title: "Target" },
              roles: { type: "array", items: { type: "string" }, title: "Roles" },
              items: {
                type: "array",
                title: "Menu Items",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string", title: "Item ID" },
                    label: { type: "string", title: "Label" },
                    icon: { type: "string", title: "Icon" },
                    route: { type: "string", title: "Route" },
                    roles: { type: "array", items: { type: "string" }, title: "Roles" }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

export default schema;

