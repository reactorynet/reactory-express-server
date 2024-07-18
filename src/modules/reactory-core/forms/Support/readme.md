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
- **Workflows**:
  - Escalations
  - Automated responses
    - Notifications
    - Emails
    - Templates
- **Services**:
- **Translations**:
- **Models**
- **Client Plugins**
- **Cli Tools**
- **REST**
- **gRPC**
- **Extension**
- **PDFs**

### Navigation

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

### Support Request

### Support Ticket

### Support Tickets

### Support Tickets Admin

### Workflows

### Auditing

### Security

### Roles
