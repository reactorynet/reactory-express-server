import Reactory from '@reactory/reactory-core';

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
            target
            roles
          }
          themes {
            id
            nameSpace
            name
            version
            type
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
      'routes': 'routes.routes',
      'createdAt': 'overview.createdAt',
      'updatedAt': 'overview.updatedAt',
    },
  },
  // Additional queries for users, organizations, and roles can be added here
  // These would typically be separate queries or part of a more complex GraphQL schema
};

export default graphql;

