# Overview
The Support forms, tests, models will always be updated to present the latest approach to implementing a fully functional feature using the built in components, data management and best practice.

##  Anatomy of a feature
Any feature within reactory will consist of the following items:
- **Navigation**: A means to find and interact with your feature. Navigation is driven through the menus configuration for each client.
- **Route handling**: Each menu item will take the user to a component or launch external link.
- **Forms**: Each feature will consists of one or more forms / interfaces. The Reactory Support feature has the following forms:
  - Support Request
  - Support Ticket View / Edit / Update
    - General
    - Comments
    - Documents
    - Audit trail
  - Support Ticket Grid / List
    - User
    - Admin
    - Agent
  - User Dashboard
  - Admin Dashboard
- **Graph**
  - Queries
  - Mutations 
  - Types
  - Directives
  - Subscriptions
- **Workflows**:
  - Escalations
  - Automated responses
    - Notifications
    - Emails
    - Templates
- **Services**:
  - Support Service
  - Search Service
  - Reporting Service
- **Translations**:
  - Form Translations
  - Service Translations
- **Models**
  - Mongo Models
  - Postgres Models
  - Synchronizers & Transformers
- **Client Plugins**
  - Widgets
  - Grouped plugins
- **Cli Tools**
  - 
- **REST**
  - GET v1/support/tickets?page={page}&limit={limit}&search={search}&sort={sort}&sortby={sortby}
  - GET v1/support/tickets/{id}
  - POST v1/support/tickets
  - PATCH v1/support/tickets/{id}
  - PUT v1/support/tickets/{id}/file 
- **gRPC**
  - ?? 
- **Extensions**
  -  Reactor AI agent
- **PDFs**
  - Reports

### Navigation
Navigation is configured per Reactory Client. Configure the menu entry in your application configuration. Use the ordinal field to set position of the menu item.

 ```ts
  ....
    {
      ordinal: 94, 
      title: 'reactory:reactory.menu.support', 
      link: '/support/open', 
      icon: 'help', 
      roles: ['USER'],
      items: [
        {
          ordinal: 95, 
          title: 'reactory:reactory.menu.support-request', 
          link: '/support/request', 
          icon: 'support_agent', 
          roles: ['USER'],
        },
      ],
    }
  ...
 ```

### Route Handlers
Route handling is also defined per client.

```ts
{
    key: 'general-support',
    // the titles are not currently
    // used to display anywhere so no translations
    // are applied here yet
    title: 'Support Request',
    path: '/support/request',
    exact: true,
    public: false,
    roles: ['USER'],
    componentFqn: 'core.SupportForm@1.0.0',
    args: [{
      key: "mode",
      value: {
        type: "string",
        mode: "new"
      }
    }]
  },

  {
    key: 'my-support-tickets',
    title: 'My Open Tickets',
    path: '/support/open',
    exact: true,
    public: false,
    roles: ['USER'],
    componentFqn: 'core.SupportTickets@1.0.0',
    args: [
      {
        key: 'variant',
        value: {
          type: 'string',
          variant: 'logged_in_user'
        }
      }
    ]
  },
```

### Support Models

#### Mongo Model(s)

#### Postgres Model(s)

### Support Request

The support request form can be invoked from anywhere in the application. 

### Support Ticket

A single ticket, viewed on its own page. The page is addressed by the ticket
reference and mounted like the workflow details page:

```ts
{
  key: 'support-ticket-details',
  // References look like `REACTORY-302016408/20261019/3365961056` and contain
  // forward slashes, so a `:reference` segment can never match one. The splat
  // captures the reference verbatim; the form receives it as `ticketReference`.
  path: '/support/tickets/*',
  exact: true,
  public: false,
  roles: ['USER', 'ADMIN', 'SUPPORT_ADMIN', 'SUPPORT'],
  componentFqn: 'core.SupportTicketDetails@1.0.0',
  componentProps: {
    ticketReference: "${route['*']}",
  },
}
```

The form runs `ReactorySupportTicketByReference(reference:)` — the single-ticket
query, which applies the same read rules as the service's `getTicket` (support
staff read any ticket, everybody else only their own or assigned tickets) — and
renders `core.SupportTicketDetailPanel@1.0.0`, the very widget the grids use as
their expanded detail panel. The reference column in both grids links here.

The reference/URL rules live in [`shared/ticketReference.ts`](./shared/ticketReference.ts)
so the route, the page and the grids cannot drift apart.

### Support Tickets

Grid form that supports searching, grouping and bulk actions on the support tickets

### Support Tickets Admin

Same grid form, but used in admin / agent context to provide additional functionality

### Workflows

Escalation Workflow

Automated responses

Notifications

Emails

Templates

### Auditing

### Security

### Roles
