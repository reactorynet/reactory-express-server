'use strict';
import Reactory from '@reactorynet/reactory-core';

/**
 * Route Access Policies — the editor for `src/express/routeAccess.ts`.
 *
 * Answers, per route: may a request skip tenant authentication and/or CORS, and must
 * it come from a given set of addresses? The values are consumed by the tenant-auth
 * middleware and the CORS delegate, so an edit here changes whether a route is
 * reachable without a client credential.
 *
 * Deliberately a *basic* form: one repeatable policy list. The field set and the
 * defaults are the server-side contract — see `IReactoryRouteAccessPolicy` — and
 * `routeAccess.form.test.ts` asserts the two cannot drift.
 *
 * Operator guidance (keep in step with `src/express/routeAccess.md`):
 *  - `path` is a PREFIX; the longest matching prefix wins.
 *  - `requireTenantCredential` / `enforceCors` default ON. Turning one off is the
 *    exemption, so the help text says so plainly rather than hiding it behind a
 *    double negative.
 *  - An **empty** allowed-addresses list means "any address". For an open route the
 *    handler's own authentication (e.g. the PayU IPN signature) is then the only
 *    control, so the help text says that too.
 */
const RouteAccessForm: Reactory.Forms.IReactoryForm = {
  id: 'core.RouteAccessForm@1.0.0',
  name: 'RouteAccessForm',
  nameSpace: 'core',
  version: '1.0.0',
  uiFramework: 'material',
  uiSupport: ['material'],
  uiResources: [],
  title: 'Route Access Policies',
  description:
    'Which routes may be reached without a tenant credential or a CORS check, ' +
    'and from which IP addresses. The longest matching path prefix wins.',
  tags: ['security', 'routing', 'settings', 'route-access'],
  schema: {
    title: 'Route Access Policies',
    type: 'object',
    properties: {
      policies: {
        type: 'array',
        title: 'Policies',
        description:
          'One entry per exempt route. Unlisted routes require a tenant credential and a permitted CORS origin.',
        items: {
          type: 'object',
          required: ['path'],
          properties: {
            path: {
              type: 'string',
              title: 'Path prefix',
              pattern: '^/',
              default: '/',
              description: 'Matched as a prefix on a path boundary. Longest match wins.',
            },
            methods: {
              type: 'array',
              title: 'HTTP methods',
              description: 'Leave empty to apply to every method.',
              uniqueItems: true,
              items: {
                type: 'string',
                enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
              },
            },
            // Field keys are the SERVER's policy shape (IReactoryRouteAccessPolicy) so the
            // saved data is read straight back by the engine. Only the titles are
            // human-friendly: a friendlier KEY would be silently ignored on save.
            tenantAuth: {
              type: 'boolean',
              title: 'Require a tenant credential',
              default: true,
              description:
                'ON (safe): the request must carry a valid x-client-key. ' +
                'OFF exempts the route — only do this for callbacks that cannot authenticate, ' +
                'such as a payment provider IPN.',
            },
            cors: {
              type: 'boolean',
              title: 'Enforce the CORS origin check',
              default: true,
              description: 'ON (safe). OFF exempts the route from the origin whitelist check.',
            },
            ipAllowList: {
              type: 'array',
              title: 'Allowed IP addresses',
              description:
                'Exact addresses or IPv4 CIDR ranges (e.g. 41.0.0.0/8), or * for any. ' +
                'EMPTY MEANS ANY ADDRESS — the route is then protected only by whatever ' +
                'the handler checks itself.',
              uniqueItems: true,
              items: { type: 'string' },
            },
            description: {
              type: 'string',
              title: 'Description',
              description: 'Why this route is exempt, for the next operator.',
            },
          },
        },
      },
    },
  },
  uiSchema: {
    'ui:order': ['policies'],
    policies: {
      'ui:title': 'Exempt routes',
      'ui:options': { orderable: true, addable: true, removable: true },
      items: {
        'ui:order': [
          'path',
          'methods',
          'tenantAuth',
          'cors',
          'ipAllowList',
          'description',
        ],
        path: {
          'ui:placeholder': '/api/payment/v1/webhooks/',
          'ui:help': 'A prefix, not a pattern. "/health" also covers "/health/ready".',
        },
        methods: {
          'ui:widget': 'checkboxes',
        },
        tenantAuth: {
          'ui:widget': 'checkbox',
          'ui:help': 'Turning this off makes the route reachable without x-client-key.',
        },
        cors: {
          'ui:widget': 'checkbox',
        },
        ipAllowList: {
          'ui:help': 'Empty = any address. Prefer a CIDR range over "*" where the provider publishes one.',
        },
        description: {
          'ui:widget': 'textarea',
          'ui:options': { rows: 2 },
        },
      },
    },
  },
};

export default RouteAccessForm;
