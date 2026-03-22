# reactory-core -- Server Module Agent Context

## What Is This Module

The foundational module of the Reactory server, providing all essential data models, core services, GraphQL resolvers, and pre-built forms that every other module depends on. This module has **priority 0** (loads first) and no dependencies.

- **Module ID**: `reactory-core`
- **Namespace**: `core`
- **FQN**: `core.ReactoryServer@1.0.0`
- **Version**: `1.0.0`
- **Priority**: `0` (highest -- loads first)
- **Dependencies**: None

## Directory Structure

```
reactory-core/
  index.ts              # ReactoryModuleDefinition entry point
  graph/
    types/              # GraphQL type definitions
    directives/         # Custom GraphQL directives
    queries/            # GraphQL query definitions
  resolvers/            # GraphQL resolvers (20 resolver groups)
  services/             # Business logic services (30 entries)
  models/               # Mongoose/database models (38 entries)
  forms/                # UI form schema definitions (22 entries)
  routes/               # Express route definitions
  cli/                  # CLI command definitions
  views/                # Server-side view templates
  middleware/            # Module-specific middleware
  schema/               # Schema definitions
  types/                # TypeScript type definitions
  workflow/             # Workflow engine
  workflows/            # Workflow definitions
  protobuf/             # gRPC/protobuf definitions
  data/                 # Static data (translations)
  build/                # Build assets
```

## Key Services

| Service | Purpose |
|---|---|
| `EmailService` | Send mail (SendGrid, etc.) |
| `FetchService` | Abstracted URL calls with user credentials |
| `FormService` | Form management and resolution |
| `OrganizationService` | Organization CRUD operations |
| `PdfService` | PDF rendering and file storage |
| `ReactoryAuditService` | Audit logging |
| `ReactoryCalendarService` | Calendar management |
| `ReactoryContentService` | Content management |
| `ReactoryFileService` | File system operations |
| `ReactoryModelRegistryService` | Dynamic model registration |
| `ReactoryModuleCompilerService` | Runtime module compilation (JIT) |
| `ReactoryNLPService` | Natural language processing |
| `ReactorySearchService` | Search abstraction |
| `ReactorySupportService` | Support ticket management |
| `RedisService` | Redis cache operations |
| `SystemService` | System-level operations |
| `TemplateService` | Template rendering (EJS) |
| `TranslationService` | i18n translation management |
| `UserService` | User CRUD and authentication |
| `Workflow/` | Workflow execution engine |
| `ETL/` | ETL processor services |
| `Statistics/` | Statistics aggregation |
| `location/` | Google Maps / geolocation search |

## Key Models (38 total)

User, Organization, BusinessUnit, Team, Application, Menu, Notification, Template, Content, Comment, Task, Project, ProjectBoard, Audit, ReactoryClient, ReactoryCalendar, CoreFile, EmailQueue, ReactorySupportTicket, ReactoryTranslation, Statistic, Theme, Region, PersonalDemographic, UserDemographics, and more.

## GraphQL Resolvers (20 groups)

ApiStatus, Cache, Comment, Emails, Menu, Organization, ReactoryCalendar, ReactoryContent, ReactoryFile, ReactoryForm, SQL, Support, System, Task, Template, User, Workflow.

## Form Schemas (22 categories)

Application, Applications, Audit, EmailForms, EmailTemplate, Global, Organization, ReactoryAdmin, ReactoryContentCapture, ReactoryContentList, Samples, Security, Support, User, Widgets, Workflow.

## Coding Conventions

- All services follow the Reactory service pattern with dependency injection
- Models use Mongoose schemas for MongoDB
- GraphQL types are defined in `graph/types/` with resolvers in `resolvers/`
- Forms follow the JSON Schema-based ReactoryForm pattern
- CLI commands are registered via the module definition
- Protobuf definitions support gRPC communication

## Testing

Tests are run via the server's test infrastructure:
```bash
$REACTORY_SERVER/bin/jest.sh reactory local
```
