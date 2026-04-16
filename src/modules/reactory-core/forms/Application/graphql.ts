import Reactory from '@reactorynet/reactory-core';

/**
 * GraphQL definition for the Application dashboard form.
 * This defines the query to fetch application data by ID.
 */
const graphql: Reactory.Forms.IFormGraphDefinition = {
  query: {
    name: 'ReactoryClientWithId',
    text: `
      query ReactoryClientWithId($id: String!) {
        ReactoryClientWithId(id: $id) {
          id
          name
          clientKey
          avatar
          siteUrl
          version
          username
          email          
          theme
          applicationRoles
          settings {
            name
            settingType
            variant
            title
            description
            componentFqn
            formSchema
            data
          }
          menus {
            id
            key
            name
            target
            roles
            enabled
            featureFlags
            items: entries {
              id
              ordinal
              label: title
              route: link
              external
              icon
              roles
              enabled
              featureFlags
              items {
                id
                ordinal
                label: title
                route: link
                external
                icon
                roles
                enabled
                featureFlags
              }
            }
          }
          themes {
            id
            nameSpace
            name
            version
            type
            defaultThemeMode
            description
          }
          featureFlags {
            feature
            partner
            organization
            businessUnit
            regions
            roles
            timezones
            value
            enabled
          }
          routes {
            id
            key
            path
            title
            exact
            public
            roles
            componentFqn
            componentProps
          }          
          createdAt
          updatedAt
        }
      }`,
    variables: {
      'props.applicationId': 'id',
    },
    resultType: 'object',
    resultMap: {
      'id': 'overview.id',
      'name': 'overview.name',
      'clientKey': 'overview.key',
      'description': 'overview.description',
      'avatar': 'overview.avatar',
      'siteUrl': 'overview.siteUrl',
      'version': 'overview.version',
      'username': 'overview.username',
      'email': 'overview.email',      
      'theme': 'overview.theme',
      'settings': 'settings.settings',
      'menus': 'menus.menus',
      'themes': 'themes.themes',
      'featureFlags': 'featureFlags.featureFlags',
      'routes': 'routes.routes',
      'applicationRoles': 'roles.applicationRoles',
      'users.users': 'users.users',
      'users.totalUsers': 'users.totalUsers',
      'users.paging': 'users.paging',
      'createdAt': 'overview.createdAt',
      'updatedAt': 'overview.updatedAt',
    },
  },
  // Additional queries for users, organizations, and roles can be added here
  // These would typically be separate queries or part of a more complex GraphQL schema
};

export default graphql;

