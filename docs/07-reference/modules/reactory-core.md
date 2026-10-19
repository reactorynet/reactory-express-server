# reactory-core — generated reference

> **GENERATED FILE — DO NOT EDIT.**
>
> Produced by `scripts/docs/generate-core-module-reference.js` from the
> `reactory-core` source tree. Narrative documentation lives at
> [`06-modules/reactory-core/README.md`](../../06-modules/reactory-core/README.md).
> Regenerate with `node scripts/docs/generate-core-module-reference.js`.

This file owns the enumerations for template sections 2, 3, 4, 5, 6, 7 and 8.
Counts describe the working tree at generation time; the narrative page states the
verification date and status.

## 2. Module contract — extension points

| Field | Value |
|---|---|
| `id` | `reactory-core` |
| `nameSpace` | `core` |
| `name` | `ReactoryServer` |
| `version` | `1.0.0` |
| FQN | `core.ReactoryServer@1.0.0` |
| `dependencies` | `[]` (none) |
| `priority` | `0` |

| Extension point | Contributed | Source |
|---|---|---|
| `graphDefinitions.Types` | 39 SDL modules | `src/modules/reactory-core/graph/types/index.ts` |
| `graphDefinitions.Resolvers` | resolver map merged from `resolvers/index.ts` | `src/modules/reactory-core/resolvers/index.ts` |
| `graphDefinitions.Directives` | `@auth` | `src/modules/reactory-core/graph/directives/index.ts` |
| `services` | 40 service definitions | `src/modules/reactory-core/services/index.ts` |
| `models` | mongoose models + TypeORM entities | `src/modules/reactory-core/models/index.ts` |
| `forms` | 48 form definitions | `src/modules/reactory-core/forms/index.ts` |
| `workflows` | 47 registered YAML flows (of 50 files) + 1 code workflow | `src/modules/reactory-core/workflows/index.ts` |
| `cli` | 7 CLI definitions | `src/modules/reactory-core/cli/index.ts` |
| `routes` | `/support`, `/workflow`, `/useraccount` | `src/modules/reactory-core/routes/index.ts` |
| `middleware` | file SSE transport | `src/modules/reactory-core/middleware/index.ts` |
| `featureFlags` | 8 flags | `src/modules/reactory-core/index.ts` |
| `translations` | core translation catalogue | `src/modules/reactory-core/data/translations` |
| `clientPlugins` | none (`[]`) | `src/modules/reactory-core/index.ts` |
| `serverPlugins` | none (`[]`) | `src/modules/reactory-core/index.ts` |
| `grpc` | none (`null`) | `src/modules/reactory-core/index.ts` |
| `pdfs` | none (`[]`) | `src/modules/reactory-core/index.ts` |

## 3. Data model — collections and entities

| Collection / table | ODM | Source |
|---|---|---|
| `reactory_applications` | mongoose | `src/modules/reactory-core/models/Application.ts:22` |
| `reactory_audit` | typeorm | `src/modules/reactory-core/models/Audit.ts:4` |
| `reactory_business_units` | mongoose | `src/modules/reactory-core/models/BusinessUnit.ts:36` |
| `reactory_cache` | mongoose | `src/modules/reactory-core/models/CoreCache.ts:87` |
| `reactory_calendar` | typeorm | `src/modules/reactory-core/models/ReactoryCalendar/ReactoryCalendar.ts:8` |
| `reactory_calendar_entry` | typeorm | `src/modules/reactory-core/models/ReactoryCalendar/ReactoryCalendarEntry.ts:7` |
| `reactory_calendar_participant` | typeorm | `src/modules/reactory-core/models/ReactoryCalendar/ReactoryCalendarParticipant.ts:6` |
| `reactory_calendar_recurrence_pattern` | typeorm | `src/modules/reactory-core/models/ReactoryCalendar/ReactoryCalendarRecurrencePattern.ts:5` |
| `reactory_calendar_service_trigger` | typeorm | `src/modules/reactory-core/models/ReactoryCalendar/ReactoryCalendarServiceTrigger.ts:5` |
| `reactory_calendar_workflow_trigger` | typeorm | `src/modules/reactory-core/models/ReactoryCalendar/ReactoryCalendarWorkflowTrigger.ts:5` |
| `reactory_client_components` | mongoose | `src/modules/reactory-core/models/ClientComponent.ts:57` |
| `reactory_comments` | mongoose | `src/modules/reactory-core/models/Comment.ts:62` |
| `reactory_content` | mongoose | `src/modules/reactory-core/models/Content.ts:92` |
| `reactory_core_categories` | mongoose | `src/modules/reactory-core/models/CoreCategory.ts:29` |
| `reactory_email_queue` | mongoose | `src/modules/reactory-core/models/EmailQueue.ts:80` |
| `reactory_file_import_packages` | mongoose | `src/modules/reactory-core/models/ReactoryFileImportPackage.ts:108` |
| `reactory_files` | mongoose | `src/modules/reactory-core/models/CoreFile.ts:283` |
| `reactory_form_submission` | typeorm | `src/modules/reactory-core/models/ReactoryFormSubmission.ts:26` |
| `reactory_menu_items` | mongoose | `src/modules/reactory-core/models/Menu.ts:51` |
| `reactory_menus` | mongoose | `src/modules/reactory-core/models/Menu.ts:78` |
| `reactory_notifications` | mongoose | `src/modules/reactory-core/models/Notification.ts:19` |
| `reactory_operational_groups` | mongoose | `src/modules/reactory-core/models/OperationalGroup.ts:22` |
| `reactory_organigrams` | mongoose | `src/modules/reactory-core/models/Organigram.ts:45` |
| `reactory_organizations` | mongoose | `src/modules/reactory-core/models/Organization.ts:136` |
| `reactory_personal_demographics` | mongoose | `src/modules/reactory-core/models/PersonalDemographic.ts:76` |
| `reactory_project_boards` | mongoose | `src/modules/reactory-core/models/ProjectBoard.ts:47` |
| `reactory_projects` | mongoose | `src/modules/reactory-core/models/Project.ts:51` |
| `reactory_rate_limits` | typeorm | `src/modules/reactory-core/models/RateLimit.ts:3` |
| `reactory_regions` | mongoose | `src/modules/reactory-core/models/Region.ts:81` |
| `reactory_resources` | mongoose | `src/modules/reactory-core/models/ReactoryResource.ts:19` |
| `reactory_statistics` | mongoose | `src/modules/reactory-core/models/Statistic.ts:110` |
| `reactory_statistics_packages` | mongoose | `src/modules/reactory-core/models/Statistic.ts:130` |
| `reactory_support_tickets` | mongoose | `src/modules/reactory-core/models/ReactorySupportTicket.ts:163` |
| `reactory_tasks` | mongoose | `src/modules/reactory-core/models/Task.ts:113` |
| `reactory_teams` | mongoose | `src/modules/reactory-core/models/Team.ts:39` |
| `reactory_templates` | mongoose | `src/modules/reactory-core/models/Template.ts:173` |
| `reactory_themes` | mongoose | `src/modules/reactory-core/models/Theme.ts:47` |
| `reactory_translations` | mongoose | `src/modules/reactory-core/models/ReactoryTranslation.ts:50` |
| `reactory_user_demographics` | mongoose | `src/modules/reactory-core/models/UserDemographics.ts:62` |
| `reactory_user_sessions` | typeorm | `src/modules/reactory-core/models/UserSession.ts:17` |
| `reactory_users` | mongoose | `src/modules/reactory-core/models/User.ts:685` |

TypeORM entities and migrations are declared in `src/modules/reactory-core/migrations/typeorm/schema.ts`.

## 4. GraphQL surface

### SDL modules loaded

| Module path |
|---|
| `Charts/ReactoryCharts` |
| `System/Scalars` |
| `System/Enums` |
| `System/ApiStatus/ApiStatus` |
| `System/Directives` |
| `System/Menu` |
| `System/ReactoryClient/ApplicationPlugin` |
| `System/ReactoryClient/ApplicationTheme` |
| `System/ReactoryClient/ReactoryClientEnums` |
| `System/ReactoryClient/ReactoryClient` |
| `System/ReactoryCalendar` |
| `System/Workflow` |
| `System/Cache` |
| `System/File` |
| `System/UX` |
| `System/FeatureFlag` |
| `System/Region` |
| `System/Natural` |
| `Forms/Form` |
| `Forms/FormSubmission` |
| `User/User` |
| `User/Task` |
| `User/Comment` |
| `User/Team` |
| `User/Profile` |
| `User/UserImport` |
| `User/Support` |
| `Organization/Organization` |
| `Organization/BusinessUnit` |
| `System/Email` |
| `System/Template` |
| `System/Translations` |
| `System/Statistics` |
| `System/ReactoryContent` |
| `Communications/Notification` |
| `SQL/ReactorySQL` |
| `GraphQL/ReactoryGraphQL` |
| `Audit` |
| `CORE` |

### Definition counts

| Kind | Count |
|---|---|
| `type` | 266 |
| `input` | 138 |
| `enum` | 40 |
| `interface` | 0 |
| `scalar` | 8 |
| `union` | 21 |

Unique type names: 469. `@auth` usages: 145.

### Root fields

| Operation | Count |
|---|---|
| `Query` | 115 |
| `Mutation` | 142 |

| Operation | Field | Source |
|---|---|---|
| Query | `auditLogs` | `src/modules/reactory-core/graph/types/Audit.graphql:110` |
| Query | `resourceAuditTrail` | `src/modules/reactory-core/graph/types/Audit.graphql:110` |
| Query | `complianceReport` | `src/modules/reactory-core/graph/types/Audit.graphql:110` |
| Query | `ReactoryFormSubmissions` | `src/modules/reactory-core/graph/types/Forms/FormSubmission.graphql:171` |
| Query | `ReactoryFormSubmissionById` | `src/modules/reactory-core/graph/types/Forms/FormSubmission.graphql:171` |
| Query | `ReactoryFormSubmissionStats` | `src/modules/reactory-core/graph/types/Forms/FormSubmission.graphql:171` |
| Query | `ReactoryGraphQLQuery` | `src/modules/reactory-core/graph/types/GraphQL/ReactoryGraphQL.graphql:15` |
| Query | `ReactoryGraphQLSchema` | `src/modules/reactory-core/graph/types/GraphQL/ReactoryGraphQL.graphql:42` |
| Query | `businessUnitsForOrganization` | `src/modules/reactory-core/graph/types/Organization/BusinessUnit.graphql:76` |
| Query | `businessUnitWithId` | `src/modules/reactory-core/graph/types/Organization/BusinessUnit.graphql:76` |
| Query | `ReactoryBusinessUnits` | `src/modules/reactory-core/graph/types/Organization/BusinessUnit.graphql:76` |
| Query | `allOrganizations` | `src/modules/reactory-core/graph/types/Organization/Organization.graphql:130` |
| Query | `organizationsForUser` | `src/modules/reactory-core/graph/types/Organization/Organization.graphql:130` |
| Query | `organizationWithId` | `src/modules/reactory-core/graph/types/Organization/Organization.graphql:130` |
| Query | `CoreOrganization` | `src/modules/reactory-core/graph/types/Organization/Organization.graphql:130` |
| Query | `CoreOrganizations` | `src/modules/reactory-core/graph/types/Organization/Organization.graphql:130` |
| Query | `CorePagedOrganizations` | `src/modules/reactory-core/graph/types/Organization/Organization.graphql:130` |
| Query | `CoreUsersForOrganization` | `src/modules/reactory-core/graph/types/Organization/Organization.graphql:130` |
| Query | `GetOrganisationLookupData` | `src/modules/reactory-core/graph/types/Organization/Organization.graphql:130` |
| Query | `ReactorySQLQuery` | `src/modules/reactory-core/graph/types/SQL/ReactorySQL.graphql:143` |
| Query | `ReactorySQLDataConnections` | `src/modules/reactory-core/graph/types/SQL/ReactorySQL.graphql:143` |
| Query | `userEmails` | `src/modules/reactory-core/graph/types/System/Email.graphql:89` |
| Query | `ReactoryFeatureFlagCatalogue` | `src/modules/reactory-core/graph/types/System/FeatureFlag.graphql:114` |
| Query | `ReactoryEffectiveFeatureFlags` | `src/modules/reactory-core/graph/types/System/FeatureFlag.graphql:114` |
| Query | `ReactoryUserFiles` | `src/modules/reactory-core/graph/types/System/File.graphql:342` |
| Query | `ReactoryServerFiles` | `src/modules/reactory-core/graph/types/System/File.graphql:342` |
| Query | `ReactoryReadServerFile` | `src/modules/reactory-core/graph/types/System/File.graphql:342` |
| Query | `ReactoryReadFile` | `src/modules/reactory-core/graph/types/System/File.graphql:342` |
| Query | `NaturalTokenizers` | `src/modules/reactory-core/graph/types/System/Natural.graphql:78` |
| Query | `NaturalTokenize` | `src/modules/reactory-core/graph/types/System/Natural.graphql:78` |
| Query | `NaturalSentiment` | `src/modules/reactory-core/graph/types/System/Natural.graphql:78` |
| Query | `NaturalStem` | `src/modules/reactory-core/graph/types/System/Natural.graphql:78` |
| Query | `NaturalNGrams` | `src/modules/reactory-core/graph/types/System/Natural.graphql:78` |
| Query | `NaturalPackagedOuput` | `src/modules/reactory-core/graph/types/System/Natural.graphql:78` |
| Query | `ReactoryCalendar` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:376` |
| Query | `ReactoryCalendars` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:376` |
| Query | `MyReactoryCalendars` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:376` |
| Query | `UserReactoryCalendars` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:376` |
| Query | `OrganizationReactoryCalendars` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:376` |
| Query | `ClientReactoryCalendars` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:376` |
| Query | `ReactoryCalendarEntry` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:376` |
| Query | `ReactoryCalendarEntries` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:376` |
| Query | `MyReactoryCalendarEntries` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:376` |
| Query | `UserReactoryCalendarEntries` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:376` |
| Query | `ReactoryUserAvailability` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:376` |
| Query | `ReactoryCalendarAvailability` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:376` |
| Query | `ReactoryCalendarEntryRecurrences` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:376` |
| Query | `ReactoryClients` | `src/modules/reactory-core/graph/types/System/ReactoryClient/ReactoryClient.graphql:455` |
| Query | `ReactoryClientWithId` | `src/modules/reactory-core/graph/types/System/ReactoryClient/ReactoryClient.graphql:455` |
| Query | `ReactoryClientWithKey` | `src/modules/reactory-core/graph/types/System/ReactoryClient/ReactoryClient.graphql:455` |
| Query | `ReactoryClientApplicationUsers` | `src/modules/reactory-core/graph/types/System/ReactoryClient/ReactoryClient.graphql:455` |
| Query | `ReactoryClientGetThemeCss` | `src/modules/reactory-core/graph/types/System/ReactoryClient/ReactoryClient.graphql:455` |
| Query | `ReactoryGetContentBySlug` | `src/modules/reactory-core/graph/types/System/ReactoryContent.graphql:178` |
| Query | `ReactoryGetContentByTags` | `src/modules/reactory-core/graph/types/System/ReactoryContent.graphql:178` |
| Query | `ReactoryGetContentById` | `src/modules/reactory-core/graph/types/System/ReactoryContent.graphql:178` |
| Query | `ReactoryGetContentList` | `src/modules/reactory-core/graph/types/System/ReactoryContent.graphql:178` |
| Query | `apiStatus` | `src/modules/reactory-core/graph/types/System/Scalars.graphql:167` |
| Query | `CoreGetStatistics` | `src/modules/reactory-core/graph/types/System/Statistics.graphql:324` |
| Query | `CoreGetStatisticsPackage` | `src/modules/reactory-core/graph/types/System/Statistics.graphql:324` |
| Query | `CoreGetStatisticsPackages` | `src/modules/reactory-core/graph/types/System/Statistics.graphql:324` |
| Query | `ReactoryTemplates` | `src/modules/reactory-core/graph/types/System/Template.graphql:49` |
| Query | `ReactoryTemplate` | `src/modules/reactory-core/graph/types/System/Template.graphql:49` |
| Query | `ReactoryGetEmailTemplate` | `src/modules/reactory-core/graph/types/System/Template.graphql:49` |
| Query | `ReactoryTranslation` | `src/modules/reactory-core/graph/types/System/Translations.graphql:159` |
| Query | `ReactoryTranslationItems` | `src/modules/reactory-core/graph/types/System/Translations.graphql:159` |
| Query | `workflowSystemStatus` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1110` |
| Query | `workflows` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1110` |
| Query | `workflowRegistry` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1110` |
| Query | `workflow` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1110` |
| Query | `workflowWithId` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1110` |
| Query | `workflowInstances` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1110` |
| Query | `workflowInstance` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1110` |
| Query | `workflowExecutionHistory` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1110` |
| Query | `workflowExecutionHistoryById` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1110` |
| Query | `workflowInstanceLogFileUrl` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1110` |
| Query | `workflowExecutionHistoryByDefinitionId` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1110` |
| Query | `searchWorkflowExecutionHistory` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1110` |
| Query | `recentWorkflowExecutions` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1110` |
| Query | `workflowExecutionStats` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1110` |
| Query | `workflowSchedules` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1110` |
| Query | `workflowSchedule` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1110` |
| Query | `workflowAuditLog` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1110` |
| Query | `workflowMetrics` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1110` |
| Query | `workflowConfigurations` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1110` |
| Query | `workflowYamlDefinition` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1110` |
| Query | `workflowStepCatalog` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1110` |
| Query | `workflowStatus` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1110` |
| Query | `getComment` | `src/modules/reactory-core/graph/types/User/Comment.graphql:276` |
| Query | `getCommentsByContext` | `src/modules/reactory-core/graph/types/User/Comment.graphql:276` |
| Query | `getCommentReplies` | `src/modules/reactory-core/graph/types/User/Comment.graphql:276` |
| Query | `getMyComments` | `src/modules/reactory-core/graph/types/User/Comment.graphql:276` |
| Query | `getMyCommentStats` | `src/modules/reactory-core/graph/types/User/Comment.graphql:276` |
| Query | `GetPersonalDemographics` | `src/modules/reactory-core/graph/types/User/Profile.graphql:30` |
| Query | `ReactoryMySupportTickets` | `src/modules/reactory-core/graph/types/User/Support.graphql:334` |
| Query | `ReactorySupportTickets` | `src/modules/reactory-core/graph/types/User/Support.graphql:334` |
| Query | `userTasks` | `src/modules/reactory-core/graph/types/User/Task.graphql:71` |
| Query | `userWorkflowTasks` | `src/modules/reactory-core/graph/types/User/Task.graphql:71` |
| Query | `task` | `src/modules/reactory-core/graph/types/User/Task.graphql:71` |
| Query | `ReactoryTeam` | `src/modules/reactory-core/graph/types/User/Team.graphql:49` |
| Query | `ReactoryTeams` | `src/modules/reactory-core/graph/types/User/Team.graphql:49` |
| Query | `team` | `src/modules/reactory-core/graph/types/User/Team.graphql:49` |
| Query | `teamsForOrganization` | `src/modules/reactory-core/graph/types/User/Team.graphql:49` |
| Query | `allUsers` | `src/modules/reactory-core/graph/types/User/User.graphql:562` |
| Query | `userWithId` | `src/modules/reactory-core/graph/types/User/User.graphql:562` |
| Query | `userPeers` | `src/modules/reactory-core/graph/types/User/User.graphql:562` |
| Query | `refreshProfileData` | `src/modules/reactory-core/graph/types/User/User.graphql:562` |
| Query | `authenticatedUser` | `src/modules/reactory-core/graph/types/User/User.graphql:562` |
| Query | `userInbox` | `src/modules/reactory-core/graph/types/User/User.graphql:562` |
| Query | `searchUser` | `src/modules/reactory-core/graph/types/User/User.graphql:562` |
| Query | `getUserCredentials` | `src/modules/reactory-core/graph/types/User/User.graphql:562` |
| Query | `ReactoryUsers` | `src/modules/reactory-core/graph/types/User/User.graphql:562` |
| Query | `ReactoryFileImportPackage` | `src/modules/reactory-core/graph/types/User/UserImport.graphql:210` |
| Query | `MyReactoryFileImportPackages` | `src/modules/reactory-core/graph/types/User/UserImport.graphql:210` |
| Query | `ReactoryFileImportPackages` | `src/modules/reactory-core/graph/types/User/UserImport.graphql:210` |
| Query | `PagedImportPackageFiles` | `src/modules/reactory-core/graph/types/User/UserImport.graphql:210` |
| Mutation | `purgeOldAuditLogs` | `src/modules/reactory-core/graph/types/Audit.graphql:127` |
| Mutation | `ReactoryFormSubmit` | `src/modules/reactory-core/graph/types/Forms/FormSubmission.graphql:194` |
| Mutation | `ReactoryFormSubmissionDelete` | `src/modules/reactory-core/graph/types/Forms/FormSubmission.graphql:194` |
| Mutation | `ReactoryGraphQLQuery` | `src/modules/reactory-core/graph/types/GraphQL/ReactoryGraphQL.graphql:19` |
| Mutation | `createBusinessUnit` | `src/modules/reactory-core/graph/types/Organization/BusinessUnit.graphql:82` |
| Mutation | `updateBusinessUnit` | `src/modules/reactory-core/graph/types/Organization/BusinessUnit.graphql:82` |
| Mutation | `addMemberToBussinessUnit` | `src/modules/reactory-core/graph/types/Organization/BusinessUnit.graphql:82` |
| Mutation | `addMemberToBusinessUnit` | `src/modules/reactory-core/graph/types/Organization/BusinessUnit.graphql:82` |
| Mutation | `removeMemberFromBusinessUnit` | `src/modules/reactory-core/graph/types/Organization/BusinessUnit.graphql:82` |
| Mutation | `createOrganization` | `src/modules/reactory-core/graph/types/Organization/Organization.graphql:163` |
| Mutation | `updateOrganization` | `src/modules/reactory-core/graph/types/Organization/Organization.graphql:163` |
| Mutation | `SetOrganisationLookupData` | `src/modules/reactory-core/graph/types/Organization/Organization.graphql:163` |
| Mutation | `ReactorySQLInsert` | `src/modules/reactory-core/graph/types/SQL/ReactorySQL.graphql:153` |
| Mutation | `ReactorySQLUpdate` | `src/modules/reactory-core/graph/types/SQL/ReactorySQL.graphql:153` |
| Mutation | `ReactorySQLDelete` | `src/modules/reactory-core/graph/types/SQL/ReactorySQL.graphql:153` |
| Mutation | `ReactoryClientAddFeatureFlag` | `src/modules/reactory-core/graph/types/System/FeatureFlag.graphql:135` |
| Mutation | `ReactoryClientUpdateFeatureFlag` | `src/modules/reactory-core/graph/types/System/FeatureFlag.graphql:135` |
| Mutation | `ReactoryClientDeleteFeatureFlag` | `src/modules/reactory-core/graph/types/System/FeatureFlag.graphql:135` |
| Mutation | `ReactoryUploadFile` | `src/modules/reactory-core/graph/types/System/File.graphql:377` |
| Mutation | `ReactoryUpdateFile` | `src/modules/reactory-core/graph/types/System/File.graphql:377` |
| Mutation | `ReactoryDeleteFile` | `src/modules/reactory-core/graph/types/System/File.graphql:377` |
| Mutation | `ReactorySyncFileToRemote` | `src/modules/reactory-core/graph/types/System/File.graphql:377` |
| Mutation | `ReactoryCreateFolder` | `src/modules/reactory-core/graph/types/System/File.graphql:377` |
| Mutation | `ReactoryDeleteFolder` | `src/modules/reactory-core/graph/types/System/File.graphql:377` |
| Mutation | `ReactoryMoveItem` | `src/modules/reactory-core/graph/types/System/File.graphql:377` |
| Mutation | `ReactoryWriteFile` | `src/modules/reactory-core/graph/types/System/File.graphql:377` |
| Mutation | `ReactoryOpenFileSession` | `src/modules/reactory-core/graph/types/System/File.graphql:377` |
| Mutation | `ReactoryCloseFileSession` | `src/modules/reactory-core/graph/types/System/File.graphql:377` |
| Mutation | `CreateReactoryCalendar` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:400` |
| Mutation | `UpdateReactoryCalendar` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:400` |
| Mutation | `DeleteReactoryCalendar` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:400` |
| Mutation | `ShareReactoryCalendar` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:400` |
| Mutation | `SetDefaultReactoryCalendar` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:400` |
| Mutation | `CreateReactoryCalendarEntry` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:400` |
| Mutation | `UpdateReactoryCalendarEntry` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:400` |
| Mutation | `DeleteReactoryCalendarEntry` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:400` |
| Mutation | `DuplicateReactoryCalendarEntry` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:400` |
| Mutation | `InviteReactoryCalendarEntryParticipants` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:400` |
| Mutation | `UpdateReactoryCalendarEntryParticipantStatus` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:400` |
| Mutation | `RemoveReactoryCalendarEntryParticipant` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:400` |
| Mutation | `BulkReactoryCalendarEntryCreateEntries` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:400` |
| Mutation | `BulkReactoryCalendarEntryUpdateEntries` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:400` |
| Mutation | `BulkReactoryCalendarEntryDeleteEntries` | `src/modules/reactory-core/graph/types/System/ReactoryCalendar.graphql:400` |
| Mutation | `ReactoryClientCreate` | `src/modules/reactory-core/graph/types/System/ReactoryClient/ReactoryClient.graphql:568` |
| Mutation | `ReactoryClientAddRoute` | `src/modules/reactory-core/graph/types/System/ReactoryClient/ReactoryClient.graphql:568` |
| Mutation | `ReactoryClientUpdateRoute` | `src/modules/reactory-core/graph/types/System/ReactoryClient/ReactoryClient.graphql:568` |
| Mutation | `ReactoryClientDeleteRoute` | `src/modules/reactory-core/graph/types/System/ReactoryClient/ReactoryClient.graphql:568` |
| Mutation | `ReactoryClientReorderRoutes` | `src/modules/reactory-core/graph/types/System/ReactoryClient/ReactoryClient.graphql:568` |
| Mutation | `ReactoryClientUpdateMenus` | `src/modules/reactory-core/graph/types/System/ReactoryClient/ReactoryClient.graphql:568` |
| Mutation | `ReactoryClientUpdateRoles` | `src/modules/reactory-core/graph/types/System/ReactoryClient/ReactoryClient.graphql:568` |
| Mutation | `ReactoryClientUpdateSettings` | `src/modules/reactory-core/graph/types/System/ReactoryClient/ReactoryClient.graphql:568` |
| Mutation | `ReactoryClientSetActiveTheme` | `src/modules/reactory-core/graph/types/System/ReactoryClient/ReactoryClient.graphql:568` |
| Mutation | `ReactoryClientSaveTheme` | `src/modules/reactory-core/graph/types/System/ReactoryClient/ReactoryClient.graphql:568` |
| Mutation | `ReactoryClientDeleteTheme` | `src/modules/reactory-core/graph/types/System/ReactoryClient/ReactoryClient.graphql:568` |
| Mutation | `ReactoryClientPublishThemeCss` | `src/modules/reactory-core/graph/types/System/ReactoryClient/ReactoryClient.graphql:568` |
| Mutation | `ReactoryCreateContent` | `src/modules/reactory-core/graph/types/System/ReactoryContent.graphql:185` |
| Mutation | `ReactorySaveContent` | `src/modules/reactory-core/graph/types/System/ReactoryContent.graphql:185` |
| Mutation | `ReactorySaveContentTranslation` | `src/modules/reactory-core/graph/types/System/ReactoryContent.graphql:185` |
| Mutation | `ReactoryDeleteContentTranslation` | `src/modules/reactory-core/graph/types/System/ReactoryContent.graphql:185` |
| Mutation | `ReactorySaveImageData` | `src/modules/reactory-core/graph/types/System/ReactoryContent.graphql:185` |
| Mutation | `ReactorySetUserDefaultTheme` | `src/modules/reactory-core/graph/types/System/Scalars.graphql:179` |
| Mutation | `CorePublishStatistics` | `src/modules/reactory-core/graph/types/System/Statistics.graphql:344` |
| Mutation | `CoreProcessStatistics` | `src/modules/reactory-core/graph/types/System/Statistics.graphql:344` |
| Mutation | `CoreUpdateStatistic` | `src/modules/reactory-core/graph/types/System/Statistics.graphql:344` |
| Mutation | `CoreUpdateStatisticsPackage` | `src/modules/reactory-core/graph/types/System/Statistics.graphql:344` |
| Mutation | `ReactoryUpdateTemplateContent` | `src/modules/reactory-core/graph/types/System/Template.graphql:55` |
| Mutation | `ReactorySetEmailTemplate` | `src/modules/reactory-core/graph/types/System/Template.graphql:55` |
| Mutation | `ReactorySetTranslation` | `src/modules/reactory-core/graph/types/System/Translations.graphql:171` |
| Mutation | `ReactoryDeleteTranslation` | `src/modules/reactory-core/graph/types/System/Translations.graphql:171` |
| Mutation | `startWorkflow` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1238` |
| Mutation | `pauseWorkflowInstance` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1238` |
| Mutation | `resumeWorkflowInstance` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1238` |
| Mutation | `cancelWorkflowInstance` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1238` |
| Mutation | `publishWorkflowEvent` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1238` |
| Mutation | `signalWorkflowInstance` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1238` |
| Mutation | `createWorkflowSchedule` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1238` |
| Mutation | `updateWorkflowSchedule` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1238` |
| Mutation | `deleteWorkflowSchedule` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1238` |
| Mutation | `startSchedule` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1238` |
| Mutation | `stopSchedule` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1238` |
| Mutation | `reloadSchedules` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1238` |
| Mutation | `deleteWorkflowExecutionHistory` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1238` |
| Mutation | `deleteWorkflowExecutionHistoryBatch` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1238` |
| Mutation | `clearWorkflowExecutionHistory` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1238` |
| Mutation | `startWorkflowLegacy` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1238` |
| Mutation | `saveWorkflowDefinition` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1238` |
| Mutation | `saveWorkflowYaml` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1238` |
| Mutation | `deleteWorkflowDefinition` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1238` |
| Mutation | `validateWorkflowDefinition` | `src/modules/reactory-core/graph/types/System/Workflow.graphql:1238` |
| Mutation | `createComment` | `src/modules/reactory-core/graph/types/User/Comment.graphql:323` |
| Mutation | `editComment` | `src/modules/reactory-core/graph/types/User/Comment.graphql:323` |
| Mutation | `deleteComment` | `src/modules/reactory-core/graph/types/User/Comment.graphql:323` |
| Mutation | `upvoteComment` | `src/modules/reactory-core/graph/types/User/Comment.graphql:323` |
| Mutation | `downvoteComment` | `src/modules/reactory-core/graph/types/User/Comment.graphql:323` |
| Mutation | `favoriteComment` | `src/modules/reactory-core/graph/types/User/Comment.graphql:323` |
| Mutation | `toggleCommentReaction` | `src/modules/reactory-core/graph/types/User/Comment.graphql:323` |
| Mutation | `flagComment` | `src/modules/reactory-core/graph/types/User/Comment.graphql:323` |
| Mutation | `CoreSetPersonalDemographics` | `src/modules/reactory-core/graph/types/User/Profile.graphql:34` |
| Mutation | `ReactoryCreateSupportTicket` | `src/modules/reactory-core/graph/types/User/Support.graphql:345` |
| Mutation | `ReactoryUpdateSupportTicket` | `src/modules/reactory-core/graph/types/User/Support.graphql:345` |
| Mutation | `ReactoryDeleteSupportTicket` | `src/modules/reactory-core/graph/types/User/Support.graphql:345` |
| Mutation | `ReactoryAddSupportTicketComment` | `src/modules/reactory-core/graph/types/User/Support.graphql:345` |
| Mutation | `ReactoryAttachFilesToTicket` | `src/modules/reactory-core/graph/types/User/Support.graphql:345` |
| Mutation | `createTask` | `src/modules/reactory-core/graph/types/User/Task.graphql:77` |
| Mutation | `updateTask` | `src/modules/reactory-core/graph/types/User/Task.graphql:77` |
| Mutation | `completeWorkflowTask` | `src/modules/reactory-core/graph/types/User/Task.graphql:77` |
| Mutation | `deleteTask` | `src/modules/reactory-core/graph/types/User/Task.graphql:77` |
| Mutation | `createTeam` | `src/modules/reactory-core/graph/types/User/Team.graphql:58` |
| Mutation | `updateTeam` | `src/modules/reactory-core/graph/types/User/Team.graphql:58` |
| Mutation | `addMemberToTeam` | `src/modules/reactory-core/graph/types/User/Team.graphql:58` |
| Mutation | `removeMemberFromTeam` | `src/modules/reactory-core/graph/types/User/Team.graphql:58` |
| Mutation | `deleteTeam` | `src/modules/reactory-core/graph/types/User/Team.graphql:58` |
| Mutation | `Note` | `src/modules/reactory-core/graph/types/User/User.graphql:849` |
| Mutation | `createUser` | `src/modules/reactory-core/graph/types/User/User.graphql:849` |
| Mutation | `updateUser` | `src/modules/reactory-core/graph/types/User/User.graphql:849` |
| Mutation | `deleteUser` | `src/modules/reactory-core/graph/types/User/User.graphql:849` |
| Mutation | `setOrganizationForUser` | `src/modules/reactory-core/graph/types/User/User.graphql:849` |
| Mutation | `setPeersForUser` | `src/modules/reactory-core/graph/types/User/User.graphql:849` |
| Mutation | `setPeerRelationShip` | `src/modules/reactory-core/graph/types/User/User.graphql:849` |
| Mutation | `removePeer` | `src/modules/reactory-core/graph/types/User/User.graphql:849` |
| Mutation | `removeUser` | `src/modules/reactory-core/graph/types/User/User.graphql:849` |
| Mutation | `setPassword` | `src/modules/reactory-core/graph/types/User/User.graphql:849` |
| Mutation | `setUserLanguage` | `src/modules/reactory-core/graph/types/User/User.graphql:849` |
| Mutation | `confirmPeers` | `src/modules/reactory-core/graph/types/User/User.graphql:849` |
| Mutation | `addUserRole` | `src/modules/reactory-core/graph/types/User/User.graphql:849` |
| Mutation | `removeUserRole` | `src/modules/reactory-core/graph/types/User/User.graphql:849` |
| Mutation | `addUserCredentials` | `src/modules/reactory-core/graph/types/User/User.graphql:849` |
| Mutation | `removeUserCredentials` | `src/modules/reactory-core/graph/types/User/User.graphql:849` |
| Mutation | `ReactoryCoreSetRolesForMembership` | `src/modules/reactory-core/graph/types/User/User.graphql:849` |
| Mutation | `ReactoryCoreCreateUserMembership` | `src/modules/reactory-core/graph/types/User/User.graphql:849` |
| Mutation | `ReactoryCoreSetActiveMembership` | `src/modules/reactory-core/graph/types/User/User.graphql:849` |
| Mutation | `ReactoryCoreRemoveUserMembership` | `src/modules/reactory-core/graph/types/User/User.graphql:849` |
| Mutation | `ReactoryCoreCreateUserForApplication` | `src/modules/reactory-core/graph/types/User/User.graphql:849` |
| Mutation | `ReactoryCoreUpdateUserSocials` | `src/modules/reactory-core/graph/types/User/User.graphql:849` |
| Mutation | `SetReactoryFileImportPackageStatus` | `src/modules/reactory-core/graph/types/User/UserImport.graphql:255` |
| Mutation | `DeleteUserFileUpload` | `src/modules/reactory-core/graph/types/User/UserImport.graphql:255` |
| Mutation | `AddFileToImportPackage` | `src/modules/reactory-core/graph/types/User/UserImport.graphql:255` |
| Mutation | `RemoveFileFromImportPackage` | `src/modules/reactory-core/graph/types/User/UserImport.graphql:255` |
| Mutation | `StartImportPackage` | `src/modules/reactory-core/graph/types/User/UserImport.graphql:255` |
| Mutation | `StopImportPackage` | `src/modules/reactory-core/graph/types/User/UserImport.graphql:255` |
| Mutation | `StartProcessForPackage` | `src/modules/reactory-core/graph/types/User/UserImport.graphql:255` |
| Mutation | `PreviewImportFile` | `src/modules/reactory-core/graph/types/User/UserImport.graphql:255` |

### `@auth` directive

Declared in `src/modules/reactory-core/graph/directives/AuthDirective.ts`:
`directive @auth(roles: [String] = ["USER"], scope: AuthScope = TENANT, orgArg: String, buArg: String) on OBJECT | FIELD_DEFINITION`.

| Roles | Uses |
|---|---|
| `"USER", "ADMIN"` | 49 |
| `"USER"` | 44 |
| `"ADMIN"` | 27 |
| `"ADMIN", "WORKFLOW_ADMIN"` | 13 |
| `"ADMIN", "DEVELOPER"` | 6 |
| `"WORKFLOW_ADMIN", "WORKFLOW_OPERATOR"` | 5 |
| `"ANON", "USER", "ADMIN"` | 1 |

## 5. Services

40 service definitions are declared under `src/modules/reactory-core/services` (113 `.ts` files including tests and type-only helpers).
Lifecycle is the `serviceType` declared on the definition; the service registry resolves dependencies before constructing the service.

| FQN | Name | Type | Lifecycle | Dependencies | Public methods | Source |
|---|---|---|---|---|---|---|
| `core.EmailService@1.0.0` | EmailService |  |  | `core.ReactoryFileService@1.0.0 as fileService` | — | `src/modules/reactory-core/services/EmailService.ts:226` |
| `core.FetchService@1.0.0` | FetchService | data |  | — | `getExecutionContext`, `setExecutionContext`, `onStartup`, `setHeaderProvider`, `postJSON`, `putJSON`, `deleteJSON`, `setAuthenticationProvider`, `getJSON`, `fetch` | `src/modules/reactory-core/services/FetchService.ts:30` |
| `core.FileSSETransportManager@1.0.0` | FileSSETransportManager | data | singleton | — | `openSession`, `attachTransport`, `closeSession`, `noteLocalWrite`, `sessionIdFor`, `shutdown`, `_testExpireSession` | `src/modules/reactory-core/services/FileSSETransportManager.ts:74` |
| `core.GoogleMapsService@1.0.0` | GoogleMapsService | data |  | — | `getExecutionContext`, `setExecutionContext`, `getPlaces`, `getPlaceDetails` | `src/modules/reactory-core/services/location/GoogleMapsService.ts:68` |
| `core.OrganizationService@1.0.0` | ReactoryOrganizationService | organization | singleton | `core.ReactoryModelRegistry@1.0.0 as modelService` | `findBusinessUnit`, `findBusinessUnitById`, `createBusinessUnit`, `findTeam`, `createTeam`, `getPagedTeamsForOrganization`, `updateTeam`, `addMemberToTeam`, `removeMemberFromTeam`, `deleteTeam`, `findWithName`, `create`, `updateOrganizationLogo`, `setOrganization`, `uploadOrganizationImage`, `getOrganizationsForLoggedInUser`, `getPagedOrganizationsForLoggedInUser`, `get`, `onStartup`, `getExecutionContext`, `setExecutionContext`, `setModelService` | `src/modules/reactory-core/services/OrganizationService.ts:17` |
| `core.PdfService@1.0.0` | PdfService | pdf |  | — | `generate`, `onStartup`, `getExecutionContext`, `setExecutionContext` | `src/modules/reactory-core/services/PdfService.ts:45` |
| `core.PostgresTableToFormGenerator@1.0.0` | PostgresTableToFormGenerator | schemaGeneration | instance | `core.ReactoryNLPService@1.0.0 as nlpService` | `toJSType`, `getName`, `getFormName`, `getItemSchema`, `generateGridForEntity`, `generateObjectFormForEntity`, `generateFormsForEntity`, `generate` | `src/modules/reactory-core/services/generators/database/postgres/PostgresTableGenerator.ts:22` |
| `core.RateLimiterService@1.0.0` | RateLimiterService | security | singleton | — | `setRedisService`, `onStartup`, `getExecutionContext`, `setExecutionContext`, `checkLimit` | `src/modules/reactory-core/services/RateLimiterService.ts:8` |
| `core.ReactoryAuditService@1.0.0` | ReactoryAuditService | data |  | — | `onStartup`, `logAuditEvent`, `queryAuditLogs`, `generateComplianceReport`, `exportAuditLog`, `purgeOldAuditLogs`, `getResourceAuditTrail`, `setExecutionContext`, `getExecutionContext`, `onReady` | `src/modules/reactory-core/services/ReactoryAuditService.ts:649` |
| `core.ReactoryContentService@1.0.0` | ReactoryContentService | data |  | `core.ReactoryFileService@1.0.0 as fileService`, `core.UserService@1.0.0 as userService`, `core.RedisService@1.0.0 as redis` | `clearCache`, `getCacheStats`, `getContentByTags`, `getContentBySlug`, `getContentById`, `getContentBySlugAndLocale`, `getContentByIdAndLocale`, `getContentBySlugAndClient`, `listContent`, `createContent`, `updateContent`, `saveContentTranslation`, `deleteContentTranslation`, `saveImageData`, `onStartup`, `getExecutionContext`, `setExecutionContext`, `setFileService`, `setUserService`, `setRedis` | `src/modules/reactory-core/services/ReactoryContentService.ts:772` |
| `core.ReactoryFileImportPackageManager@1.0.0` | ReactoryFileImportPackageManager | data |  | `core.ReactoryFileService@1.0.0 as fileService` | `getPackage`, `getNextProcessor`, `processFile`, `previewFile`, `start`, `stop`, `delete`, `addFile`, `removeFile`, `getExecutionContext`, `setExecutionContext`, `setFileService` | `src/modules/reactory-core/services/ETL/ReactoryPackageManager.ts:329` |
| `core.ReactoryFileService@1.0.0` | Reactory File Service | file |  | — | `getUserFiles`, `getServerFiles`, `getUserFileByPath`, `getFileSize`, `getContentBytes`, `getContentBytesAsString`, `readFileContent`, `writeFileContent`, `resolveScopedPath`, `downloadFile`, `generateFileChecksum`, `downloadAndCatalog`, `removeFilesForContext`, `getFileModelsForContext`, `getRemote`, `setFileModel`, `getFileModel`, `sync`, `clean`, `onStartup`, `getExecutionContext`, `setExecutionContext`, `deleteFile` | `src/modules/reactory-core/services/ReactoryFileService.ts:1382` |
| `core.ReactoryFormService@1.0.0` | ReactoryFormService | forms |  | `core.ReactoryFileService@1.0.0 as fileService`, `core.ReactoryModuleCompilerService@1.0.0 as compiler`, `core.ReactorySearchService@1.0.0 as searchService` | `override`, `get`, `search`, `list`, `globals`, `save`, `delete`, `getCompiledResourceForModule`, `getResources`, `onStartup`, `getExecutionContext`, `setExecutionContext`, `setFileService`, `setCompiler`, `setSearchService` | `src/modules/reactory-core/services/FormService.ts:538` |
| `core.ReactoryFormSubmissionService@1.0.0` | ReactoryFormSubmissionService | data | instance | `core.ReactoryFormService@1.0.0 as formService`, `core.RateLimiterService@1.0.0 as rateLimiter` | `setFormService`, `setRateLimiter`, `onStartup`, `getExecutionContext`, `setExecutionContext`, `getSubmissionConfig`, `submit`, `list`, `get`, `delete`, `stats` | `src/modules/reactory-core/services/FormSubmission/FormSubmissionService.ts:58` |
| `core.ReactoryModelRegistry@1.0.0` | ReactoryModelRegistry | data | singleton | `core.FetchService@1.0.0 as fetchService`, `core.ReactoryFileService@1.0.0 as fileService` | `onStartup`, `onShutdown`, `getExecutionContext`, `setExecutionContext`, `setFileService`, `setFetchService`, `register`, `getModel`, `getModels`, `generate` | `src/modules/reactory-core/services/ReactoryModelRegistryService.ts:11` |
| `core.ReactoryModuleCompilerService@1.0.0` | ReactoryModuleCompilerService |  |  | `core.ReactoryFileService@1.0.0 as fileService` | `compileModule`, `onStartup`, `getExecutionContext`, `setExecutionContext`, `setFileService` | `src/modules/reactory-core/services/ReactoryModuleCompilerService.ts:988` |
| `core.ReactoryModuleGenerator@1.0.0` | ReactoryModuleGenerator | codeGeneration | singleton | `core.TemplateService@1.0.0 as templateService` | `generateModule` | `src/modules/reactory-core/services/generators/module/ModuleGenerator.ts:10` |
| `core.ReactoryNLPService@1.0.0` | ReactoryNLPService | data |  | `core.FetchService@1.0.0 as fetchService` | `keys`, `count`, `N`, `frequency`, `mostCommon`, `get`, `increment`, `add`, `setPackageOptions`, `stem`, `ngrams`, `tag`, `spellcheck`, `getSynonyms`, `getAntonyms`, `getHypernyms`, `getHyponyms`, `getMeronyms`, `getHolonyms`, `truncate`, `normalize`, `equals`, `randomString`, `hash`, `frequencyDistribution`, `levenshteinDistance`, `jaroWinklerDistance`, `diceCoefficient`, `jaccardIndex`, `overlapCoefficient`, `distance`, `tokenize`, `sentiment`, `packageForInput`, `onStartup`, `getExecutionContext`, `setExecutionContext`, `setFetchService` | `src/modules/reactory-core/services/ReactoryNLPService.ts:73` |
| `core.ReactoryPostgresGenerator@1.0.0` | ReactoryPostgresGenerator | schemaGeneration |  | `core.PostgresTableToFormGenerator@1.0.0 as tableGenerator` | `toString`, `generate`, `setTableGenerator` | `src/modules/reactory-core/services/generators/database/postgres/ReactoryPostgresGenerator.ts:6` |
| `core.ReactorySearchService@1.0.0` | ReactorySearchService | data |  | — | `setProvider`, `getProvider`, `search`, `index`, `deleteIndex`, `createIndex`, `configureIndex`, `deleteDocuments`, `count`, `listIndexes`, `getIndexStats`, `onStartup`, `getExecutionContext`, `setExecutionContext` | `src/modules/reactory-core/services/ReactorySearchService.ts:29` |
| `core.ReactorySQLService@1.0.0` | ReactorySQLService | data |  | — | `getExecutionContext`, `setExecutionContext`, `onStartup`, `query` | `src/modules/reactory-core/services/ReactorySQLService.ts:69` |
| `core.ReactoryStatisticsService@1.0.0` | ReactoryStatisticsService | statistics |  | — | `getExecutionContext`, `setContext`, `getStatistics`, `getStatisticById`, `publishStatistics`, `updateStatistic`, `getStatisticsPackage`, `getStatisticsPackages`, `processStatistics`, `updateStatisticsPackage`, `aggregateStatistics` | `src/modules/reactory-core/services/Statistics/StatisticsService.ts:16` |
| `core.ReactorySupportService@1.0.0` | ReactorySupportService | support |  | `core.ReactoryFileService@1.0.0 as fileService` | `updateTicket`, `addComment`, `attachDocument`, `isAdminUser`, `pagedRequest`, `createRequest`, `getTicket`, `onStartup`, `deleteRequest`, `getExecutionContext`, `setExecutionContext`, `setFileService` | `src/modules/reactory-core/services/ReactorySupportService.ts:39` |
| `core.ReactorySupportWorkflowService@1.0.0` | ReactorySupportWorkflowService | support |  | — | `findNewTickets`, `loadTicket`, `resolveOwner`, `applyTriage`, `applyEscalation`, `appendComment`, `findSlaBreaches`, `notify`, `addComment`, `findDispatchableTickets`, `resolveExecutionIdentity`, `getAiEngineeringRouting`, `getRunningIdentity`, `planDispatch`, `dispatchAiTickets`, `onStartup`, `getExecutionContext`, `setExecutionContext` | `src/modules/reactory-core/services/ReactorySupportWorkflowService.ts:397` |
| `core.ReactoryTranslationService@1.0.0` | ReactoryTranslationService |  |  | — | `init`, `updateCacheForUser`, `getTranslations`, `setTranslation`, `removeTranslation`, `getResource`, `getResources`, `setTranslations`, `translate`, `loadTranslations`, `onStartup`, `getExecutionContext`, `setExecutionContext` | `src/modules/reactory-core/services/TranslationService.ts:272` |
| `core.ReactoryWorkflowService@1.0.0` | ReactoryWorkflowService | workflow |  | — | `onStartup`, `getExecutionContext`, `setExecutionContext`, `getSystemStatus`, `getWorkflowMetrics`, `getWorkflowConfigurations`, `getWorkflows`, `getWorkflowRegistry`, `getWorkflowWithId`, `getWorkflow`, `getWorkflowYamlDefinition`, `getWorkflowInstances`, `getWorkflowInstance`, `startWorkflow`, `pauseWorkflowInstance`, `resumeWorkflowInstance`, `cancelWorkflowInstance`, `publishWorkflowEvent`, `signalWorkflowInstance`, `getWorkflowHistory`, `getWorkflowHistoryById`, `getWorkflowHistoryByDefinitionId`, `getWorkflowHistoryByStatus`, `getWorkflowExecutionStats`, `searchWorkflowHistory`, `getRecentWorkflowExecutions`, `deleteWorkflowHistory`, `deleteWorkflowHistoryBatch`, `clearWorkflowHistory`, `getWorkflowSchedules`, `getWorkflowSchedule`, `createWorkflowSchedule`, `updateWorkflowSchedule`, `deleteWorkflowSchedule`, `startSchedule`, `stopSchedule`, `reloadSchedules`, `getWorkflowSchedulesForWorkflowId`, `filterSchedulesByWorkflowProperties`, `getWorkflowAuditLog`, `getWorkflowStatus`, `startWorkflowLegacy`, `getWorkflowErrors`, `validateWorkflowDefinition`, `saveWorkflowDefinition`, `saveWorkflowYaml`, `deleteWorkflowDefinition` | `src/modules/reactory-core/services/Workflow/ReactoryWorkflowService.ts:49` |
| `core.RedisService@1.0.0` | RedisService | data | singleton | — | `isHealthy`, `get`, `getJSON`, `set`, `setIfAbsent`, `scanKeys`, `setJSON`, `del`, `delMultiple`, `exists`, `expire`, `ttl`, `keys`, `mget`, `mset`, `incr`, `incrby`, `hset`, `hget`, `hgetall`, `hdel`, `pipeline`, `getClient`, `onStartup`, `onShutdown`, `getExecutionContext`, `setExecutionContext`, `toString`, `tryAcquireLeadership`, `isCacheLeader` | `src/modules/reactory-core/services/RedisService.ts:12` |
| `core.SecurityService@1.0.0` | SecurityService | security | instance | `core.RedisService@1.0.0 as redisService` | `getExecutionContext`, `setExecutionContext`, `invalidateSessionCache`, `createToken`, `createShortLivedToken`, `createLongLivedToken`, `expireTokens`, `listActiveTokens`, `getSessionHistory`, `validateSession`, `resolveSessionState`, `touchSession` | `src/modules/reactory-core/services/SecurityService/SecurityService.ts:70` |
| `core.ServiceGenerator@1.0.0` | ServiceGenerator | codeGeneration |  | `core.TemplateService@1.0.0 as templateService` | `generateFromFile`, `generate`, `generateFromDirectory`, `validate`, `parseDefinition`, `getExecutionContext`, `setExecutionContext`, `onStartup` | `src/modules/reactory-core/services/generators/service/ServiceGenerator.ts:39` |
| `core.SystemService@1.0.0` | SystemService | data |  | `core.ReactorySearchService@1.0.0 as searchService` | `getReactoryClients`, `getMenusForClient`, `query`, `mutate`, `getReactoryClient`, `onStartup`, `getExecutionContext`, `setExecutionContext`, `setSearchService`, `addRoute`, `updateRoute`, `deleteRoute`, `reorderRoutes`, `updateMenus`, `updateApplicationRoles`, `updateSettings`, `addFeatureFlag`, `updateFeatureFlag`, `deleteFeatureFlag`, `setActiveTheme`, `saveTheme`, `deleteTheme`, `publishThemeCss`, `getThemeCss` | `src/modules/reactory-core/services/SystemService.ts:557` |
| `core.TemplateService@1.0.0` | TemplateService | template |  | — | `renderFile`, `renderString`, `compileTemplate`, `clearCache`, `getCacheStats`, `registerHelper`, `registerHelpers`, `getHelpers`, `unregisterHelper`, `addTemplateDirectory`, `removeTemplateDirectory`, `getTemplateDirectories`, `resolveTemplatePath`, `validateTemplate`, `dehydrateEmail`, `hydrateEmail`, `renderTemplate`, `getTemplate`, `setTemplate`, `getExecutionContext`, `setExecutionContext`, `onStartup` | `src/modules/reactory-core/services/TemplateService/TemplateService.ts:74` |
| `core.UserFileImportCSV2JSON@1.0.0` | UserFileImportCSV2JSON | data |  | — | `process`, `getExecutionContext`, `setExecutionContext` | `src/modules/reactory-core/services/ETL/Processors/UserFileImportCSV2JSON.ts:124` |
| `core.UserFileImportPreview@1.0.0` | UserFileImportPreview | data |  | `core.ReactoryFileService@1.0.0 as fileService` | `getExecutionContext`, `setExecutionContext`, `process` | `src/modules/reactory-core/services/ETL/Processors/UserImportFilePreview.ts:42` |
| `core.UserFileImportProcessDemographics@1.0.0` | UserFileImportProcessDemographics | data |  | `core.ReactoryFileService@1.0.0 as fileService`, `core.OrganizationService@1.0.0 as organizationService`, `core.UserService@1.0.0 as userService` | `getExecutionContext`, `setExecutionContext`, `process` | `src/modules/reactory-core/services/ETL/Processors/UserDemographicsProcessors.ts:521` |
| `core.UserFileImportProcessGeneral@1.0.0` | UserFileImportProcessGeneral | data |  | — | `getExecutionContext`, `setExecutionContext`, `setFileService`, `process` | `src/modules/reactory-core/services/ETL/Processors/UserGeneralProcessor.ts:239` |
| `core.UserFileImportValidation@1.0.0` | UserFileImportValidation | data |  | `core.ReactoryFileService@1.0.0 as fileService` | `getExecutionContext`, `setExecutionContext`, `setFileService`, `process` | `src/modules/reactory-core/services/ETL/Processors/UserImportFileValidation.ts:85` |
| `core.UserService@1.0.0` | UserService | user |  | `core.ReactorySearchService@1.0.0 as searchService`, `core.ReactoryModelRegistry@1.0.0 as modelRegistry` | `createUserForOrganization`, `setUserPeers`, `getUserPeers`, `setPeersForUser`, `setUserDemographics`, `createUser`, `updateUser`, `findUserWithEmail`, `findUserById`, `onStartup`, `removeUserMembership`, `getExecutionContext`, `setExecutionContext`, `initializeSystemUser`, `listAllUsers`, `getUsersByClientMembership`, `searchUser`, `searchMongo`, `searchFullText`, `search`, `findOrganizationById`, `updateUserProfile`, `setUserPassword`, `deleteUser`, `selfRegister`, `checkUsernameExists` | `src/modules/reactory-core/services/UserService.ts:44` |
| `reactory.CalendarEntryService@1.0.0` | ReactoryCalendarEntryService | calendar | instance | — | `onStartup`, `getExecutionContext`, `setExecutionContext`, `createEntry`, `updateEntry`, `deleteEntry`, `getEntry`, `getCalendarEntries`, `getUserEntries`, `inviteParticipants`, `updateParticipantStatus`, `getUserAvailability`, `getCalendarAvailability`, `expandRecurringEntries`, `duplicateEntry` | `src/modules/reactory-core/services/ReactoryCalendarEntryService.ts:56` |
| `reactory.CalendarIntegrationService@1.0.0` | ReactoryCalendarIntegrationService | calendar-integration | instance | — | `onStartup`, `getExecutionContext`, `setExecutionContext`, `processWorkflowTriggers`, `processServiceTriggers`, `sendNotifications`, `expandRecurringEntries`, `getPendingTimeBasedTriggers`, `processTimeBasedTriggers` | `src/modules/reactory-core/services/ReactoryCalendarIntegrationService.ts:15` |
| `reactory.CalendarService@1.0.0` | ReactoryCalendarService | calendar | instance | — | `onStartup`, `getExecutionContext`, `setExecutionContext`, `createCalendar`, `updateCalendar`, `deleteCalendar`, `getCalendar`, `listCalendars`, `shareCalendar`, `getUserCalendars`, `checkCalendarAccess`, `getUserDefaultCalendar`, `setUserDefaultCalendar`, `getOrganizationCalendars`, `getClientCalendars` | `src/modules/reactory-core/services/ReactoryCalendarService.ts:35` |

## 6. Forms

48 form definitions declared in `src/modules/reactory-core/forms`.

| Form id | Name | Version | Source |
|---|---|---|---|
| `array` | ArrayTestForm | 1.0.0 | `src/modules/reactory-core/forms/Samples/SmartAdminForms.ts:153` |
| `business-unit` | BusinessUnitForm | 1.0.0 | `src/modules/reactory-core/forms/shared.ts:562` |
| `business-units` | BusinessUnitList | 1.0.0 | `src/modules/reactory-core/forms/shared.ts:423` |
| `CommentForm` | CommentForm | 1.0.0 | `src/modules/reactory-core/forms/shared.ts:661` |
| `contact.Form@1.0.0` | Form | 1.0.0 | `src/modules/reactory-core/forms/Samples/ContactForm.ts:13` |
| `ContentCapture` | ContentCapture | 1.0.0 | `src/modules/reactory-core/forms/ReactoryContentCapture/index.ts:14` |
| `ContentList` |  |  | `src/modules/reactory-core/forms/ReactoryContentList/index.ts:7` |
| `ContentPages` | ContentPagesList | 1.0.0 | `src/modules/reactory-core/forms/shared.ts:258` |
| `core.AddEmailAddressForm` | AddEmailAddressForm | 1.0.0 | `src/modules/reactory-core/forms/EmailForms/AddEmailAddressForm.ts:13` |
| `core.ApplicationOrganizations@1.0.0` | ApplicationOrganizations | 1.0.0 | `src/modules/reactory-core/forms/Application/ApplicationOrganizations/index.ts:13` |
| `core.ApplicationRouteEditor@1.0.0` | ApplicationRouteEditor | 1.0.0 | `src/modules/reactory-core/forms/Application/ApplicationRouteEditor/index.ts:12` |
| `core.ApplicationUsers@1.0.0` | ApplicationUsers | 1.0.0 | `src/modules/reactory-core/forms/Application/ApplicationUsers/index.ts:13` |
| `core.CreateUserForApplication@1.0.0` | CreateUserForApplication | 1.0.0 | `src/modules/reactory-core/forms/User/CreateUserForApplication/index.ts:6` |
| `core.ReactoryFormSubmissions@1.0.0` | ReactoryFormSubmissions | 1.0.0 | `src/modules/reactory-core/forms/FormSubmissions/index.ts:19` |
| `core.StaticContentInputForm@1.0.0` | StaticContentInputForm | 1.0.0 | `src/modules/reactory-core/forms/StaticContentInputForm/index.ts:25` |
| `core.SupportForm@1.0.0` | SupportForm | 1.0.0 | `src/modules/reactory-core/forms/Support/SupportRequest/index.ts:9` |
| `core.SupportTicketDeleteAction@1.0.0` | SupportTicketDeleteAction | 1.0.0 | `src/modules/reactory-core/forms/Support/SupportTicketDelete/index.ts:12` |
| `core.SupportTickets@1.0.0` | SupportTickets | 1.0.0 | `src/modules/reactory-core/forms/Support/SupportTickets/index.ts:13` |
| `core.UserLoginForm@1.0.0` | UserLoginForm | 1.0.0 | `src/modules/reactory-core/forms/User/Login/index.ts:12` |
| `core.WorkflowDetails@1.0.0` | WorkflowDetails | 1.0.0 | `src/modules/reactory-core/forms/Workflow/WorkflowDetails/index.ts:12` |
| `core.WorkflowInstanceManagement@1.0.0` | WorkflowInstanceManagement | 1.0.0 | `src/modules/reactory-core/forms/Workflow/InstanceManagement/index.ts:12` |
| `core.WorkflowOperationsDashboard@1.0.0` | WorkflowOperationsDashboard | 1.0.0 | `src/modules/reactory-core/forms/Workflow/OperationsDashboard/index.ts:10` |
| `core.WorkflowRegistryManagement@1.0.0` | WorkflowRegistryManagement | 1.0.0 | `src/modules/reactory-core/forms/Workflow/WorkflowRegistryManagement/index.ts:13` |
| `core.WorkflowScheduleManagement@1.0.0` | WorkflowScheduleManagement | 1.0.0 | `src/modules/reactory-core/forms/Workflow/WorkflowScheduleManagement/index.ts:12` |
| `core.WorkflowSystemDashboard@1.0.0` | WorkflowSystemDashboard | 1.0.0 | `src/modules/reactory-core/forms/Workflow/SystemDashboard/index.ts:10` |
| `default` | DefaultForm | 1.0.0 | `src/modules/reactory-core/forms/Samples/SmartAdminForms.ts:68` |
| `ExternalLinkList` | ExternalLinkList | 1.0.0 | `src/modules/reactory-core/forms/shared.ts:382` |
| `FileLoader` | FileLoader | 1.0.0 | `src/modules/reactory-core/forms/shared.ts:349` |
| `forgot-password` | ForgotPasswordForm | 1.0.0 | `src/modules/reactory-core/forms/shared.ts:19` |
| `HelpEditor` | HelpEditor | 1.0.0 | `src/modules/reactory-core/forms/ReactoryContentCapture/HelpEditor.ts:41` |
| `HelpListForm` | HelpListForm | 1.0.0 | `src/modules/reactory-core/forms/ReactoryContentCapture/HelpEditor.ts:79` |
| `LoginForm` | LoginForm | 1.0.0 | `src/modules/reactory-core/forms/Security/Login/index.ts:8` |
| `message-form` | MessageForm | 1.0.0 | `src/modules/reactory-core/forms/shared.ts:53` |
| `MicrosoftLogin` | MicrosoftLogin | 1.0.0 | `src/modules/reactory-core/forms/Security/microsoft_auth.ts:64` |
| `new-product-idea` | ProductIdeas | 1.0.0 | `src/modules/reactory-core/forms/Samples/SmartAdminForms.ts:436` |
| `OrganizationForm` | OrganizationForm | 1.0.0 | `src/modules/reactory-core/forms/Organization/Employee/index.ts:42` |
| `OrganizationLoginForm` | OrganizationLoginForm | 1.0.0 | `src/modules/reactory-core/forms/Organization/Employee/index.ts:17` |
| `product-ideas` | ProductIdeas | 1.0.0 | `src/modules/reactory-core/forms/Samples/SmartAdminForms.ts:389` |
| `reactory-application` | Application | 1.0.0 | `src/modules/reactory-core/forms/Application/index.ts:21` |
| `reactory.MyApplications@1.0.0` | MyApplications | 1.0.0 | `src/modules/reactory-core/forms/Applications/index.ts:52` |
| `ReactoryApplicationsForm` | ReactoryApplicationsForm | 1.0.0 | `src/modules/reactory-core/forms/ReactoryAdmin/dashboard.ts:40` |
| `ReactoryClientAdmin` | ReactoryClientAdmin | 1.0.0 | `src/modules/reactory-core/forms/ReactoryAdmin/dashboard.ts:88` |
| `ReactoryDashboard` | Dashboard | 1.0.0 | `src/modules/reactory-core/forms/ReactoryAdmin/dashboard.ts:3` |
| `ResetPasswordForm` | ResetPasswordForm | 1.0.0 | `src/modules/reactory-core/forms/shared.ts:143` |
| `search-user` | SearchUserForm | 1.0.0 | `src/modules/reactory-core/forms/shared.ts:224` |
| `SmartAdminComplexFormSample` | SmartAdminComplexFormSample | 1.0.0 | `src/modules/reactory-core/forms/Samples/SmartAdminForms.ts:332` |
| `TemplateEditor` | TemplateEditor | 1.0.0 | `src/modules/reactory-core/forms/EmailTemplate/TemplateEditor/TemplateEditor.ts:38` |
| `TemplateList` | TemplateList | 1.0.0 | `src/modules/reactory-core/forms/EmailTemplate/TemplateEditor/TemplateEditor.ts:53` |

## 7. Workflows

### YAML flow files (50)

Files on disk. Registered: **47**.

| File | Namespace | Name | Version | Steps | Registered |
|---|---|---|---|---|---|
| `src/modules/reactory-core/workflows/autoRepair/CheckFailedYamlWorkflows.yaml` | reactory | CheckFailedYamlWorkflows | 1.1.0 | 8 | yes |
| `src/modules/reactory-core/workflows/autoRepair/CheckFailedYamlWorkflowsV2.yaml` | reactory | CheckFailedYamlWorkflowsV2 | 1.0.0 | 6 | yes |
| `src/modules/reactory-core/workflows/autoRepair/CheckFailedYamlWorkflowsV3.yaml` | reactory | CheckFailedYamlWorkflowsV3 | 1.0.0 | 8 | yes |
| `src/modules/reactory-core/workflows/DefaultUserOnboarding.yaml` | reactory-core | DefaultUserOnboardingWorkflow | 1.0.0 | 14 | yes |
| `src/modules/reactory-core/workflows/DeployClient.yaml` | core | DeployClient | 1.0.0 | 12 | yes |
| `src/modules/reactory-core/workflows/DeployServer.yaml` | core | DeployServer | 1.0.0 | 16 | yes |
| `src/modules/reactory-core/workflows/dev/BuildClient.yaml` | reactory-dev | BuildClient | 1.0.0 | 12 | yes |
| `src/modules/reactory-core/workflows/dev/BuildElectron.yaml` | reactory-dev | BuildElectron | 2.0.0 | 17 | yes |
| `src/modules/reactory-core/workflows/dev/DeployServerPodman.yaml` | reactory-dev | DeployServerPodman | 1.0.0 | 18 | yes |
| `src/modules/reactory-core/workflows/dev/GitCommit.yaml` | reactory-dev | GitCommit | 1.0.0 | 16 | yes |
| `src/modules/reactory-core/workflows/dev/KnowledgeAndGraphSync.yaml` | reactory-dev | KnowledgeAndGraphSync | 1.0.0 | 7 | yes |
| `src/modules/reactory-core/workflows/dev/RunClientTests.yaml` | reactory-dev | RunClientTests | 1.0.0 | 9 | yes |
| `src/modules/reactory-core/workflows/dev/RunServerTests.yaml` | reactory-dev | RunServerTests | 1.0.0 | 9 | yes |
| `src/modules/reactory-core/workflows/dev/RunWorkflowESTests.yaml` | reactory-dev | RunWorkflowESTests | 1.0.0 | 11 | yes |
| `src/modules/reactory-core/workflows/dev/SelfHealingOrchestrator.yaml` | reactory-dev | SelfHealingOrchestrator | 1.0.0 | 10 | yes |
| `src/modules/reactory-core/workflows/dev/SystemHealthMonitor.yaml` | reactory-dev | SystemHealthMonitor | 1.0.0 | 10 | yes |
| `src/modules/reactory-core/workflows/examples/AgentConversation.yaml` | reactory-examples | AgentConversation | 1.0.0 | 2 | yes |
| `src/modules/reactory-core/workflows/examples/AgentResearch.yaml` | reactory-examples | AgentResearch | 1.0.0 | 4 | yes |
| `src/modules/reactory-core/workflows/examples/ApiCall.yaml` | reactory-examples | ApiCall | 1.0.0 | 1 | yes |
| `src/modules/reactory-core/workflows/examples/CollectAgentContext.yaml` | reactory-examples | CollectAgentContext | 1.0.0 | 10 | yes |
| `src/modules/reactory-core/workflows/examples/Condition.yaml` | reactory-examples | Condition | 1.0.0 | 4 | yes |
| `src/modules/reactory-core/workflows/examples/Custom.yaml` | reactory-examples | Custom | 1.0.0 | 1 | yes |
| `src/modules/reactory-core/workflows/examples/Delay.yaml` | reactory-examples | Delay | 1.0.0 | 1 | yes |
| `src/modules/reactory-core/workflows/examples/Email.yaml` | reactory-examples | Email | 1.0.0 | 1 | yes |
| `src/modules/reactory-core/workflows/examples/EngineHello.yaml` | reactory-examples | EngineHello | 1.0.0 | 3 | yes |
| `src/modules/reactory-core/workflows/examples/EtlDemo.yaml` | reactory-core | EtlDemo | 1.0.0 | 4 | **no** |
| `src/modules/reactory-core/workflows/examples/FileRoundTrip.yaml` | reactory-examples | FileRoundTrip | 1.0.0 | 2 | yes |
| `src/modules/reactory-core/workflows/examples/ForEach.yaml` | reactory-examples | ForEach | 1.0.0 | 3 | yes |
| `src/modules/reactory-core/workflows/examples/GraphQLQuery.yaml` | reactory-examples | GraphQLQuery | 1.0.0 | 1 | yes |
| `src/modules/reactory-core/workflows/examples/InvokeChild.yaml` | reactory-examples | InvokeChild | 1.0.0 | 2 | **no** |
| `src/modules/reactory-core/workflows/examples/ListReactoryHomeFiles.yaml` | core | list_reactory_home_files | 1.0.0 | 1 | **no** |
| `src/modules/reactory-core/workflows/examples/MongoQuery.yaml` | reactory-examples | MongoQuery | 1.0.0 | 1 | yes |
| `src/modules/reactory-core/workflows/examples/Parallel.yaml` | reactory-examples | Parallel | 1.0.0 | 3 | yes |
| `src/modules/reactory-core/workflows/examples/Postgres.yaml` | reactory-examples | Postgres | 1.0.0 | 1 | yes |
| `src/modules/reactory-core/workflows/examples/Saga.yaml` | reactory-examples | Saga | 1.0.0 | 3 | yes |
| `src/modules/reactory-core/workflows/examples/Search.yaml` | reactory-examples | Search | 1.0.0 | 1 | yes |
| `src/modules/reactory-core/workflows/examples/ServiceInvoke.yaml` | reactory-examples | ServiceInvoke | 1.0.0 | 1 | yes |
| `src/modules/reactory-core/workflows/examples/Telemetry.yaml` | reactory-examples | Telemetry | 1.0.0 | 1 | yes |
| `src/modules/reactory-core/workflows/examples/Todo.yaml` | reactory-examples | Todo | 1.0.0 | 2 | yes |
| `src/modules/reactory-core/workflows/examples/UserLookup.yaml` | reactory-examples | UserLookup | 1.0.0 | 1 | yes |
| `src/modules/reactory-core/workflows/examples/Validation.yaml` | reactory-examples | Validation | 1.0.0 | 1 | yes |
| `src/modules/reactory-core/workflows/examples/Variables.yaml` | reactory-examples | Variables | 1.0.0 | 3 | yes |
| `src/modules/reactory-core/workflows/examples/WaitEvent.yaml` | reactory-examples | WaitEvent | 1.0.0 | 2 | yes |
| `src/modules/reactory-core/workflows/examples/WeeklyWeatherForecast.yaml` | reactory-examples | WeeklyWeatherForecast | 1.0.0 | 5 | yes |
| `src/modules/reactory-core/workflows/examples/While.yaml` | reactory-examples | While | 1.0.0 | 3 | yes |
| `src/modules/reactory-core/workflows/Support/ListOpenTicketsWorkflow.workflow.yaml` | core | ListOpenTicketsWorkflow | 1.0.0 | 9 | yes |
| `src/modules/reactory-core/workflows/Support/SupportAIAgentProcessNewTicket.workflow.yaml` | core | SupportAIAgentProcessNewTicket | 1.0.0 | 9 | yes |
| `src/modules/reactory-core/workflows/Support/TicketEscalationWorkflow.workflow.yaml` | core | TicketEscalationWorkflow | 1.0.0 | 10 | yes |
| `src/modules/reactory-core/workflows/SyncClusterData.yaml` | core | SyncClusterData | 1.0.0 | 10 | yes |
| `src/modules/reactory-core/workflows/VerifyDeployment.yaml` | core | VerifyDeployment | 1.0.0 | 3 | yes |

#### Flow files no loader references

These files exist but are not named by any index, so `loadYamlWorkflow` is never called for them
and they never enter the registry:

- `src/modules/reactory-core/workflows/examples/EtlDemo.yaml`
- `src/modules/reactory-core/workflows/examples/InvokeChild.yaml`
- `src/modules/reactory-core/workflows/examples/ListReactoryHomeFiles.yaml`

### YAML step types registered (38)

Registration is imperative in `workflow/YamlFlow/steps/registry/YamlStepRegistry.ts`; the type names
below are what a YAML `type:` field must match. Backed by
37 implementation files in `workflow/YamlFlow/steps/core/`.

`log`, `delay`, `validation`, `data_transformation`, `api_call`, `cli_command`, `file_operation`, `start`, `end`, `condition`, `for_each`, `service_invoke`, `invoke_workflow`, `task`, `parallel`, `while`, `custom`, `join`, `graphql`, `graphql_mutate`, `graphql_query`, `grpc`, `user_activity`, `telemetry`, `set_variable`, `email`, `todo`, `search`, `mongo_query`, `mongo_write`, `user_lookup`, `mysql`, `postgres`, `mssql`, `saga`, `wait_event`, `cross_instance_variable`, `python_script`

Implementation files whose derived type name is not registered:
`graph_qlmutation`, `graph_qlquery`, `graph_ql`, `my_sql`, `postgres_sql`, `sql`

## 8. Operations surface

### CLI definitions

| Command module | Source |
|---|---|
| `csv2json` | `src/modules/reactory-core/cli/csv2json/csv2json.ts` |
| `InitializeSystemUser` | `src/modules/reactory-core/cli/init/InitializeSystemUser.ts` |
| `module-init` | `src/modules/reactory-core/cli/module/module-init.ts` |
| `module-install` | `src/modules/reactory-core/cli/module/module-install.ts` |
| `ProtoServerCli` | `src/modules/reactory-core/cli/proto-srv/ProtoServerCli.ts` |
| `SchemaGen` | `src/modules/reactory-core/cli/schema-gen/SchemaGen.ts` |
| `SecurityCli` | `src/modules/reactory-core/cli/security/SecurityCli.ts` |
| `ServiceGen` | `src/modules/reactory-core/cli/service-gen/ServiceGen.ts` |
| `ServiceKeysCli` | `src/modules/reactory-core/cli/service-keys/ServiceKeysCli.ts` |
| `WorkflowCli` | `src/modules/reactory-core/cli/workflow/WorkflowCli.ts` |

### Feature flags

| Flag | Title | Admin form | Source |
|---|---|---|---|
| `workflow-editor-beta-ui` | Workflow Editor Beta UI | `core.WorkflowEditorFeatureFlagForm@1.0.0` | `src/modules/reactory-core/index.ts:43` |
| `workflow-advanced-features` | Advanced Workflow Features | `core.WorkflowEditorFeatureFlagForm@1.0.0` | `src/modules/reactory-core/index.ts:57` |
| `workflow-collaboration` | Workflow Collaboration | `core.WorkflowEditorFeatureFlagForm@1.0.0` | `src/modules/reactory-core/index.ts:71` |
| `workflow-templates-beta` | Beta Workflow Templates | `core.WorkflowEditorFeatureFlagForm@1.0.0` | `src/modules/reactory-core/index.ts:85` |
| `workflow-validation-experimental` | Experimental Workflow Validation | `core.WorkflowEditorFeatureFlagForm@1.0.0` | `src/modules/reactory-core/index.ts:99` |
| `workflow-ai-assistance` | AI Workflow Assistance | `core.WorkflowEditorFeatureFlagForm@1.0.0` | `src/modules/reactory-core/index.ts:113` |
| `forms-engine-v5` | Forms Engine v5 | `core.WorkflowEditorFeatureFlagForm@1.0.0` | `src/modules/reactory-core/index.ts:127` |
| `auth-directive-strict` | @auth directive: strict denial | `core.WorkflowEditorFeatureFlagForm@1.0.0` | `src/modules/reactory-core/index.ts:141` |

### Migrations

| Migration | Source |
|---|---|
| `20260516013514-baseline-reactory-clients.js` | `src/modules/reactory-core/migrations/mongo/20260516013514-baseline-reactory-clients.js` |
| `20260516032000-core-index-baseline.js` | `src/modules/reactory-core/migrations/mongo/20260516032000-core-index-baseline.js` |
| `20260923120000-CoreBaseline.ts` | `src/modules/reactory-core/migrations/typeorm/20260923120000-CoreBaseline.ts` |
| `20260924090000-ClientKeyTenancy.ts` | `src/modules/reactory-core/migrations/typeorm/20260924090000-ClientKeyTenancy.ts` |

---

Generated by `scripts/docs/generate-core-module-reference.js`.
