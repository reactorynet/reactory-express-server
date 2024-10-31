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
