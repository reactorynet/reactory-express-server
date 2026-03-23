import Reactory from '@reactorynet/reactory-core';

const ROUTE_FIELDS = `
  id
  key
  path
  title
  exact
  public
  roles
  componentFqn
  redirect
  componentProps
`;

const graphql: Reactory.Forms.IFormGraphDefinition = {
  mutation: {
    new: {
      name: 'ReactoryClientAddRoute',
      text: `mutation ReactoryClientAddRoute($clientId: String!, $route: ClientRouteInput!) {
        ReactoryClientAddRoute(clientId: $clientId, route: $route) {
          id
          routes { ${ROUTE_FIELDS} }
        }
      }`,
      variables: {
        'formContext.props.applicationId': 'clientId',
        'formData': 'route',
      },
      resultType: 'object',
      resultMap: {
        'routes[-1]': 'formData',
      },
    },
    edit: {
      name: 'ReactoryClientUpdateRoute',
      text: `mutation ReactoryClientUpdateRoute($clientId: String!, $routeId: String!, $route: ClientRouteInput!) {
        ReactoryClientUpdateRoute(clientId: $clientId, routeId: $routeId, route: $route) {
          id
          routes { ${ROUTE_FIELDS} }
        }
      }`,
      variables: {
        'formContext.props.applicationId': 'clientId',
        'formData.id': 'routeId',
        'formData': 'route',
      },
      resultType: 'object',
    },
    delete: {
      name: 'ReactoryClientDeleteRoute',
      text: `mutation ReactoryClientDeleteRoute($clientId: String!, $routeId: String!) {
        ReactoryClientDeleteRoute(clientId: $clientId, routeId: $routeId) {
          id
          routes { ${ROUTE_FIELDS} }
        }
      }`,
      variables: {
        'formContext.props.applicationId': 'clientId',
        'formData.id': 'routeId',
      },
      resultType: 'object',
    },
  },
};

export default graphql;
