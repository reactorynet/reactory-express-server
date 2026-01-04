# Reactory Calendar Module

This directory contains the complete implementation of the Reactory Calendar system as specified in `spec.md`.

## Structure

### Models (TypeORM Entities)
- `ReactoryCalendar.ts` - Main calendar entity with PostgreSQL optimizations
- `ReactoryCalendarEntry.ts` - Calendar event entries with date range indexing
- `ReactoryCalendarParticipant.ts` - Attendee management for calendar entries
- `ReactoryCalendarRecurrencePattern.ts` - Recurring event patterns
- `ReactoryCalendarWorkflowTrigger.ts` - Workflow triggers for calendar events
- `ReactoryCalendarServiceTrigger.ts` - Service triggers for calendar events
- `index.ts` - Entity exports

### Services
- `ReactoryCalendarService.ts` - Calendar CRUD operations and permissions
- `ReactoryCalendarEntryService.ts` - Entry management, scheduling, and availability
- `ReactoryCalendarIntegrationService.ts` - Workflow/service triggers and notifications

### GraphQL
- `ReactoryCalendar.graphql` - Complete GraphQL schema
- `ReactoryCalendarResolver.ts` - GraphQL resolvers for all operations
- `types/ReactoryCalendarInputs.ts` - GraphQL input types and filters

### Types
- `types/index.d.ts` - TypeScript enums and interface definitions

## Key Features Implemented

1. **Multi-level Calendar Visibility** - Private, shared, application, organization, and public calendars
2. **Advanced PostgreSQL Indexing** - GIN, GIST, BRIN indexes for optimal query performance
3. **Recurring Events** - Complex recurrence patterns with exceptions
4. **Participant Management** - RSVP status tracking and notifications
5. **Workflow & Service Integration** - Trigger workflows and services based on calendar events
6. **Time Zone Support** - Full time zone handling for global calendars
7. **Audit Trail** - Complete audit logging for compliance
8. **Permission System** - Hierarchical access control with user and team permissions

## Performance Optimizations

- **Date Range Queries**: BRIN and GIST indexes for efficient calendar views
- **Array Operations**: GIN indexes for JSON array operations (tags, user IDs)
- **Full-Text Search**: Optimized search across calendar content
- **Partitioning**: Time-based partitioning strategy for large datasets

## Database Schema

The implementation uses a hybrid approach:
- **PostgreSQL**: Core calendar data with advanced indexing and query optimizations
- **MongoDB**: User, organization, and attachment data (existing system integration)

## Usage

All calendar operations are available through GraphQL queries and mutations. The system integrates with the existing Reactory workflow and notification systems.

## Next Steps

1. **Migration Scripts**: Create database migration scripts for the new tables
2. **Integration Testing**: Comprehensive testing of all calendar operations
3. **Third-party Integrations**: Google Calendar, Outlook, Zoom integrations
4. **Mobile Support**: React Native calendar components
5. **Advanced Features**: Real-time collaboration and analytics