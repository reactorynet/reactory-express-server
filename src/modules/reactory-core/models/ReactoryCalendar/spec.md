# Reactory Calendar Module - Technical Specification

## Overview

The Reactory Calendar Module provides a comprehensive calendar system for the Reactory platform, enabling users and applications to create, manage, and share calendars with event scheduling, workflow integration, and collaborative features.

## Core Concepts

### Calendar
A Calendar is a container for organizing events and appointments. Calendars can be:
- **Private**: Owned by a specific user, not visible to others
- **Shared**: Shared with specific users or teams with defined permissions
- **Application**: Restricted to a specific ReactoryClient application
- **Organization**: Available to all users within an organization
- **Public**: Accessible to all authenticated users

### CalendarEntry
CalendarEntries are generic event wrappers that represent scheduled events, appointments, or activities. Each entry contains:
- Date and time information
- Title, description, and metadata
- Participant management with RSVP status
- Workflow and service integration capabilities
- Recurrence patterns
- Attachments and resources

### Key Features
- **Multi-level Visibility**: Private, shared, application, organization, and public calendars
- **Event Management**: Create, update, delete calendar entries with rich metadata
- **Participant Management**: Invite users, track RSVP status, manage attendance
- **Workflow Integration**: Trigger workflows based on calendar events
- **Service Integration**: Execute service functions on event triggers
- **Recurrence Support**: Define recurring events with complex patterns
- **Time Zone Support**: Handle events across different time zones
- **Collaborative Features**: Comments, attachments, and real-time updates
- **Audit Trail**: Complete audit logging for compliance and debugging

## Data Model Architecture

### Database Strategy Analysis

Given the calendar system's **high read activity** and complex requirements, we've chosen a **PostgreSQL-first approach with TypeORM** for the following reasons:

#### **Why PostgreSQL/TypeORM for Calendar Data:**

1. **Query Performance for Read-Heavy Workloads**
   - Advanced indexing (GIN, GIST, BRIN) for date ranges and arrays
   - Window functions for calendar view aggregations
   - CTEs for complex recurring event expansions

2. **Complex Relationship Queries**
   - Efficient multi-calendar availability checks
   - Cross-calendar participant queries
   - Permission-based filtering across organizational hierarchies

3. **Time-Series Optimization**
   - BRIN indexes for time-based partitioning
   - Efficient date range queries for calendar views
   - Optimized recurring event calculations

4. **Data Integrity & Transactions**
   - ACID compliance for calendar operations
   - Foreign key constraints for relationship integrity
   - Transactional consistency for bulk operations

#### **Hybrid Integration Strategy:**

- **Calendar Core Data** → PostgreSQL (structured, high-performance queries)
- **User/Organization Data** → MongoDB (flexible, existing system)
- **Application-level Relationships** → Service layer coordination

#### **Performance Expectations:**

- **Calendar Views**: Sub-100ms queries with proper indexing
- **Availability Checks**: Efficient cross-calendar aggregations
- **Search Operations**: Full-text search with weighted results
- **Concurrent Access**: Row-level locking for conflict resolution

### ReactoryCalendar Model

```typescript
interface ReactoryCalendar {
  id: number;
  name: string;
  description?: string;
  color?: string;
  visibility: ReactoryCalendarVisibility;
  owner: User;
  client?: ReactoryClient;
  organization?: Organization;
  businessUnit?: BusinessUnit;
  allowedUsers?: User[];
  allowedTeams?: Team[];
  isDefault?: boolean;
  isActive: boolean;
  timeZone: string;
  workingHours?: ReactoryCalendarWorkingHours;
  settings: ReactoryCalendarSettings;
  createdAt: Date;
  updatedAt: Date;
  createdBy: User;
  updatedBy: User;
}
```

### ReactoryCalendarEntry Model

```typescript
interface ReactoryCalendarEntry {
  id: number;
  calendar: ReactoryCalendar;
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
  timeZone: string;
  isAllDay: boolean;
  recurrence?: ReactoryCalendarRecurrencePattern;
  participants: ReactoryCalendarParticipant[];
  organizer: User;
  status: ReactoryCalendarEntryStatus;
  priority: ReactoryCalendarEntryPriority;
  category?: string;
  tags?: string[];
  attachments?: Attachment[];
  workflowTrigger?: ReactoryCalendarWorkflowTrigger;
  serviceTrigger?: ReactoryCalendarServiceTrigger;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: User;
  updatedBy: User;
}
```

### Supporting Models

#### ReactoryCalendarParticipant
```typescript
interface ReactoryCalendarParticipant {
  id: number;
  entry: ReactoryCalendarEntry;
  user: User;
  role: ReactoryCalendarParticipantRole;
  status: ReactoryCalendarRSVPStatus;
  invitedAt: Date;
  respondedAt?: Date;
  notes?: string;
}
```

#### ReactoryCalendarRecurrencePattern
```typescript
interface ReactoryCalendarRecurrencePattern {
  id: number;
  frequency: ReactoryCalendarRecurrenceFrequency;
  interval: number;
  endDate?: Date;
  count?: number;
  byDay?: string[]; // e.g., ['MO', 'WE', 'FR']
  byMonth?: number[];
  byMonthDay?: number[];
  exceptions?: Date[];
}
```

#### ReactoryCalendarWorkflowTrigger
```typescript
interface ReactoryCalendarWorkflowTrigger {
  id: number;
  workflowId: string;
  workflowVersion: string;
  triggerType: ReactoryCalendarWorkflowTriggerType;
  triggerOffset?: number; // minutes before/after event
  parameters: Record<string, any>;
}
```

#### ReactoryCalendarServiceTrigger
```typescript
interface ReactoryCalendarServiceTrigger {
  id: number;
  serviceId: string;
  serviceVersion: string;
  method: string;
  triggerType: ReactoryCalendarServiceTriggerType;
  triggerOffset?: number; // minutes before/after event
  parameters: Record<string, any>;
}
```

## TypeORM Entity Definitions

### Calendar Entity

```typescript
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Brackets } from "typeorm";

@Entity({ name: 'reactory_calendar' })
// Performance indexes for high-read queries
@Index(['owner_id', 'visibility', 'is_active'])
@Index(['client_id', 'visibility', 'is_active'])
@Index(['organization_id', 'visibility', 'is_active'])
@Index(['is_active', 'created_at'])
@Index(['owner_id', 'is_default']) // Quick user default calendar lookup
export class ReactoryCalendar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 7, nullable: true }) // hex color code
  color: string;

  @Column({
    type: 'enum',
    enum: ['private', 'shared', 'application', 'organization', 'public'],
    default: 'private'
  })
  visibility: ReactoryCalendarVisibility;

  // Store as string IDs - relationships resolved in application layer
  @Column({ name: 'owner_id', type: 'varchar', nullable: false })
  @Index()
  ownerId: string;

  @Column({ name: 'client_id', type: 'varchar', nullable: true })
  @Index()
  clientId: string;

  @Column({ name: 'organization_id', type: 'varchar', nullable: true })
  @Index()
  organizationId: string;

  @Column({ name: 'business_unit_id', type: 'varchar', nullable: true })
  businessUnitId: string;

  // Store as JSON arrays for flexible permission management
  @Column({ name: 'allowed_user_ids', type: 'json', nullable: true })
  allowedUserIds: string[];

  @Column({ name: 'allowed_team_ids', type: 'json', nullable: true })
  allowedTeamIds: string[];

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ length: 50, default: 'UTC' })
  timeZone: string;

  @Column({ type: 'json', nullable: true })
  workingHours: WorkingHours;

  @Column({ type: 'json', nullable: true })
  settings: CalendarSettings;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: false })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'varchar', nullable: false })
  updatedBy: string;

  // Virtual properties populated by service layer
  owner?: any; // Populated from MongoDB User
  client?: any; // Populated from MongoDB ReactoryClient
  organization?: any; // Populated from MongoDB Organization
  businessUnit?: any; // Populated from MongoDB BusinessUnit
  allowedUsers?: any[]; // Populated from MongoDB Users
  allowedTeams?: any[]; // Populated from MongoDB Teams

  // Helper methods for common queries
  static findUserCalendars(userId: string, visibility?: CalendarVisibility) {
    const query = this.createQueryBuilder('calendar')
      .where('calendar.is_active = :isActive', { isActive: true })
      .andWhere(
        new Brackets(qb => {
          qb.where('calendar.owner_id = :userId', { userId })
            .orWhere('calendar.allowed_user_ids @> :userArray', { userArray: [userId] })
            .orWhere('calendar.visibility = :public', { public: 'public' })
            .orWhere('calendar.visibility = :organization', { organization: 'organization' });
        })
      );

    if (visibility) {
      query.andWhere('calendar.visibility = :visibility', { visibility });
    }

    return query.getMany();
  }
}
```

### CalendarEntry Entity

```typescript
@Entity({ name: 'reactory_calendar_entry' })
// Critical indexes for calendar performance
@Index(['calendar_id', 'start_date', 'end_date']) // Date range queries
@Index(['organizer_id', 'status']) // Organizer's events
@Index(['start_date', 'end_date']) // Global date filtering
@Index(['status', 'start_date']) // Active events
@Index(['calendar_id', 'status', 'start_date']) // Calendar view queries
export class ReactoryCalendarEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'calendar_id', type: 'integer', nullable: false })
  @Index()
  calendarId: number;

  @Column({ length: 255, nullable: false })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 500, nullable: true })
  location: string;

  @Column({ name: 'start_date', type: 'timestamptz', nullable: false })
  @Index()
  startDate: Date;

  @Column({ name: 'end_date', type: 'timestamptz', nullable: false })
  @Index()
  endDate: Date;

  @Column({ length: 50, nullable: false })
  timeZone: string;

  @Column({ name: 'is_all_day', default: false })
  isAllDay: boolean;

  // Store recurrence as JSON for flexibility
  @Column({ type: 'json', nullable: true })
  recurrence: RecurrencePattern;

  // Store as string ID - resolved in application layer
  @Column({ name: 'organizer_id', type: 'varchar', nullable: false })
  @Index()
  organizerId: string;

  @Column({
    type: 'enum',
    enum: ['draft', 'confirmed', 'cancelled', 'completed'],
    default: 'confirmed'
  })
  status: ReactoryCalendarEntryStatus;

  @Column({
    type: 'enum',
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  })
  priority: ReactoryCalendarEntryPriority;

  @Column({ length: 100, nullable: true })
  category: string;

  @Column({ type: 'json', nullable: true })
  tags: string[];

  // Store attachment IDs as JSON array
  @Column({ name: 'attachment_ids', type: 'json', nullable: true })
  attachmentIds: string[];

  @Column({ type: 'json', nullable: true })
  workflowTrigger: WorkflowTrigger;

  @Column({ type: 'json', nullable: true })
  serviceTrigger: ServiceTrigger;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'varchar', nullable: false })
  createdBy: string;

  @Column({ name: 'updated_by', type: 'varchar', nullable: false })
  updatedBy: string;

  // Virtual properties populated by service layer
  calendar?: ReactoryCalendar; // Populated from PostgreSQL
  organizer?: any; // Populated from MongoDB User
  attachments?: any[]; // Populated from MongoDB Attachments
  participants?: ReactoryCalendarParticipant[]; // Populated from PostgreSQL

  // Optimized query methods for calendar views
  static findInDateRange(calendarIds: number[], startDate: Date, endDate: Date) {
    return this.createQueryBuilder('entry')
      .where('entry.calendar_id IN (:...calendarIds)', { calendarIds })
      .andWhere('entry.status != :cancelled', { cancelled: 'cancelled' })
      .andWhere(
        new Brackets(qb => {
          qb.where('entry.start_date <= :endDate', { endDate })
            .andWhere('entry.end_date >= :startDate', { startDate });
        })
      )
      .orderBy('entry.start_date', 'ASC')
      .getMany();
  }

  static findUserEvents(userId: string, startDate: Date, endDate: Date) {
    return this.createQueryBuilder('entry')
      .innerJoin('reactory_calendar_participant', 'participant',
        'participant.entry_id = entry.id AND participant.user_id = :userId', { userId })
      .where('entry.status != :cancelled', { cancelled: 'cancelled' })
      .andWhere('entry.start_date <= :endDate', { endDate })
      .andWhere('entry.end_date >= :startDate', { startDate })
      .orderBy('entry.start_date', 'ASC')
      .getMany();
  }
}
```

## Enums and Types

Add new types to the `src/types/index.d.ts` in the Reactory Core module in the Reactory.Models namespace.

### ReactoryCalendarVisibility
```typescript
export enum ReactoryCalendarVisibility {
  PRIVATE = 'private',
  SHARED = 'shared',
  APPLICATION = 'application',
  ORGANIZATION = 'organization',
  PUBLIC = 'public'
}
```

### ReactoryCalendarEntryStatus
```typescript
export enum ReactoryCalendarEntryStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed'
}
```

### ReactoryCalendarEntryPriority
```typescript
export enum ReactoryCalendarEntryPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}
```

### ReactoryCalendarParticipantRole
```typescript
export enum ReactoryCalendarParticipantRole {
  ORGANIZER = 'organizer',
  REQUIRED = 'required',
  OPTIONAL = 'optional',
  RESOURCE = 'resource'
}
```

### ReactoryCalendarRSVPStatus
```typescript
export enum ReactoryCalendarRSVPStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  TENTATIVE = 'tentative'
}
```

### ReactoryCalendarRecurrenceFrequency
```typescript
export enum ReactoryCalendarRecurrenceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}
```

## Services Architecture

### ReactoryCalendarService

**Purpose**: Manages calendar CRUD operations and permissions

**Key Methods**:
- `createCalendar(input: CreateReactoryCalendarInput): Promise<ReactoryCalendar>`
- `updateCalendar(id: number, input: UpdateReactoryCalendarInput): Promise<ReactoryCalendar>`
- `deleteCalendar(id: number): Promise<boolean>`
- `getCalendar(id: number): Promise<ReactoryCalendar>`
- `listCalendars(filter: ReactoryCalendarFilter): Promise<ReactoryCalendar[]>`
- `shareCalendar(id: number, permissions: ReactoryCalendarPermissions): Promise<ReactoryCalendar>`
- `getUserCalendars(userId: string): Promise<ReactoryCalendar[]>`
- `checkCalendarAccess(calendarId: number, userId: string, action: string): Promise<boolean>`

### ReactoryCalendarEntryService

**Purpose**: Handles calendar entry CRUD operations and scheduling logic

**Key Methods**:
- `createEntry(input: CreateReactoryCalendarEntryInput): Promise<ReactoryCalendarEntry>`
- `updateEntry(id: number, input: UpdateReactoryCalendarEntryInput): Promise<ReactoryCalendarEntry>`
- `deleteEntry(id: number): Promise<boolean>`
- `getEntry(id: number): Promise<ReactoryCalendarEntry>`
- `getCalendarEntries(calendarId: number, filter: ReactoryCalendarEntryFilter): Promise<ReactoryCalendarEntry[]>`
- `getUserEntries(userId: string, filter: ReactoryCalendarEntryFilter): Promise<ReactoryCalendarEntry[]>`
- `inviteParticipants(entryId: number, participants: ReactoryCalendarParticipantInput[]): Promise<ReactoryCalendarEntry>`
- `updateParticipantStatus(entryId: number, userId: string, status: ReactoryCalendarRSVPStatus): Promise<boolean>`

### ReactoryCalendarIntegrationService

**Purpose**: Handles workflow and service triggers, notifications

**Key Methods**:
- `processWorkflowTriggers(entry: ReactoryCalendarEntry, eventType: ReactoryCalendarTriggerEventType): Promise<void>`
- `processServiceTriggers(entry: ReactoryCalendarEntry, eventType: ReactoryCalendarTriggerEventType): Promise<void>`
- `sendNotifications(entry: ReactoryCalendarEntry, eventType: ReactoryCalendarNotificationEventType): Promise<void>`
- `expandRecurringEntries(baseEntry: ReactoryCalendarEntry, startDate: Date, endDate: Date): Promise<ReactoryCalendarEntry[]>`

## GraphQL Schema

### Types

```graphql
type ReactoryCalendar {
  id: ID!
  name: String!
  description: String
  color: String
  visibility: ReactoryCalendarVisibility!
  owner: User!
  client: ReactoryClient
  organization: Organization
  businessUnit: BusinessUnit
  allowedUsers: [User!]!
  allowedTeams: [Team!]!
  isDefault: Boolean
  isActive: Boolean!
  timeZone: String!
  workingHours: ReactoryCalendarWorkingHours
  settings: ReactoryCalendarSettings
  entries(filter: ReactoryCalendarEntryFilter): [ReactoryCalendarEntry!]!
  createdAt: DateTime!
  updatedAt: DateTime!
  createdBy: User!
  updatedBy: User!
}

type ReactoryCalendarEntry {
  id: ID!
  calendar: ReactoryCalendar!
  title: String!
  description: String
  location: String
  startDate: DateTime!
  endDate: DateTime!
  timeZone: String!
  isAllDay: Boolean!
  recurrence: ReactoryCalendarRecurrencePattern
  participants: [ReactoryCalendarParticipant!]!
  organizer: User!
  status: ReactoryCalendarEntryStatus!
  priority: ReactoryCalendarEntryPriority!
  category: String
  tags: [String!]!
  attachments: [Attachment!]!
  workflowTrigger: ReactoryCalendarWorkflowTrigger
  serviceTrigger: ReactoryCalendarServiceTrigger
  metadata: Any
  createdAt: DateTime!
  updatedAt: DateTime!
  createdBy: User!
  updatedBy: User!
}

type ReactoryCalendarParticipant {
  id: ID!
  entry: ReactoryCalendarEntry!
  user: User!
  role: ReactoryCalendarParticipantRole!
  status: ReactoryCalendarRSVPStatus!
  invitedAt: DateTime!
  respondedAt: DateTime
  notes: String
}
```

### Queries

```graphql
type Query {
  # Calendar queries
  ReactoryCalendar(id: ID!): ReactoryCalendar
  ReactoryCalendars(filter: ReactoryCalendarFilter): [ReactoryCalendar!]!
  MyReactoryCalendars: [ReactoryCalendar!]!
  UserReactoryCalendars(userId: ID!): [ReactoryCalendar!]!

  # Calendar entry queries
  ReactoryCalendarEntry(id: ID!): ReactoryCalendarEntry
  ReactoryCalendarEntries(calendarId: ID!, filter: ReactoryCalendarEntryFilter): [ReactoryCalendarEntry!]!
  MyReactoryCalendarEntries(filter: ReactoryCalendarEntryFilter): [ReactoryCalendarEntry!]!
  UserReactoryCalendarEntries(userId: ID!, filter: ReactoryCalendarEntryFilter): [ReactoryCalendarEntry!]!

  # Availability queries
  ReactoryUserAvailability(userId: ID!, startDate: DateTime!, endDate: DateTime!, timeZone: String): [ReactoryCalendarTimeSlot!]!
  ReactoryCalendarAvailability(calendarId: ID!, startDate: DateTime!, endDate: DateTime!): [ReactoryCalendarTimeSlot!]!
}
```

### Mutations

```graphql
type Mutation {
  # Calendar mutations
  CreateReactoryCalendar(input: CreateReactoryCalendarInput!): ReactoryCalendar!
  UpdateReactoryCalendar(id: ID!, input: UpdateReactoryCalendarInput!): ReactoryCalendar!
  DeleteReactoryCalendar(id: ID!): Boolean!
  ShareReactoryCalendar(id: ID!, permissions: ReactoryCalendarPermissionsInput!): ReactoryCalendar!

  # Calendar entry mutations
  CreateReactoryCalendarEntry(input: CreateReactoryCalendarEntryInput!): ReactoryCalendarEntry!
  UpdateReactoryCalendarEntry(id: ID!, input: UpdateReactoryCalendarEntryInput!): ReactoryCalendarEntry!
  DeleteReactoryCalendarEntry(id: ID!): Boolean!
  DuplicateReactoryCalendarEntry(id: ID!, input: DuplicateReactoryCalendarEntryInput): ReactoryCalendarEntry!

  # Participant mutations
  InviteReactoryCalendarEntryParticipants(entryId: ID!, participants: [ReactoryCalendarParticipantInput!]!): ReactoryCalendarEntry!
  UpdateReactoryCalendarEntryParticipantStatus(entryId: ID!, status: ReactoryCalendarRSVPStatus!): Boolean!
  RemoveReactoryCalendarEntryParticipant(entryId: ID!, userId: ID!): Boolean!

  # Bulk operations
  BulkReactoryCalendarEntryCreateEntries(input: [CreateReactoryCalendarEntryInput!]!): [ReactoryCalendarEntry!]!
  BulkReactoryCalendarEntryUpdateEntries(updates: [BulkReactoryCalendarEntryUpdate!]!): [ReactoryCalendarEntry!]!
  BulkReactoryCalendarEntryDeleteEntries(ids: [ID!]!): Boolean!
}
```

## Security & Permissions

### Access Control Model

Calendars implement a hierarchical permission system:

1. **Owner**: Full control over the calendar and all entries
2. **Administrator**: Can manage calendar settings and all entries
3. **Editor**: Can create, update, and delete entries
4. **Viewer**: Can view calendar and entries (read-only)
5. **Participant**: Can view specific entries they're invited to

### Permission Checks

- Calendar visibility determines base access level
- Individual user permissions can override visibility settings
- Team memberships grant additional access
- Organization and business unit hierarchies affect permissions

### Audit Logging

All calendar operations are audited:
- Calendar creation, updates, and deletion
- Entry creation, updates, and deletion
- Permission changes
- Participant invitations and responses
- Trigger executions

## Performance Considerations

### PostgreSQL-Specific Optimizations

#### **Advanced Indexing Strategy**

1. **Date Range Queries**:
   ```sql
   -- BRIN index for large date ranges (better than B-tree for time-series)
   CREATE INDEX CONCURRENTLY idx_calendar_entry_dates_brin
   ON reactory_calendar_entry USING brin(start_date, end_date);

   -- GIST index for complex date overlaps
   CREATE INDEX CONCURRENTLY idx_calendar_entry_tstzrange
   ON reactory_calendar_entry USING gist (
     tstzrange(start_date, end_date, '[]')
   );
   ```

2. **Array Operations**:
   ```sql
   -- GIN indexes for JSON array operations
   CREATE INDEX CONCURRENTLY idx_calendar_allowed_users_gin
   ON reactory_calendar USING gin(allowed_user_ids);

   CREATE INDEX CONCURRENTLY idx_calendar_entry_tags_gin
   ON reactory_calendar_entry USING gin(tags);
   ```

3. **Full-Text Search**:
   ```sql
   -- Full-text search on calendar content
   CREATE INDEX CONCURRENTLY idx_calendar_entry_fts
   ON reactory_calendar_entry USING gin(
     to_tsvector('english', title || ' ' || coalesce(description, ''))
   );
   ```

#### **Query Optimization Techniques**

1. **Calendar View Queries** (Sub-50ms target):
   ```sql
   -- Optimized calendar view with date range
   SELECT * FROM reactory_calendar_entry
   WHERE calendar_id = ANY($1)
     AND status != 'cancelled'
     AND start_date <= $3
     AND end_date >= $2
   ORDER BY start_date ASC;
   ```

2. **Availability Queries** (Cross-calendar conflict detection):
   ```sql
   -- Window functions for availability analysis
   SELECT calendar_id, count(*) as conflicts
   FROM reactory_calendar_entry
   WHERE start_date <= $2 AND end_date >= $1
     AND calendar_id = ANY($3)
     AND status = 'confirmed'
   GROUP BY calendar_id;
   ```

3. **Recurring Event Expansion**:
   ```sql
   -- Generate recurring instances using CTE
   WITH RECURSIVE series AS (
     SELECT start_date, end_date, recurrence
     FROM reactory_calendar_entry
     WHERE id = $1
     UNION ALL
     SELECT
       series.start_date + (recurrence->>'interval')::interval,
       series.end_date + (recurrence->>'interval')::interval,
       recurrence
     FROM series
     WHERE series.start_date < (recurrence->>'end_date')::timestamp
   )
   SELECT * FROM series;
   ```

#### **Partitioning Strategy**

1. **Time-Based Partitioning**:
   ```sql
   -- Monthly partitions for calendar entries
   CREATE TABLE reactory_calendar_entry_y2024m01
   PARTITION OF reactory_calendar_entry
   FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

   -- Automatic partition creation
   CREATE OR REPLACE FUNCTION create_calendar_partition()
   RETURNS void AS $$
   DECLARE
     next_month date := date_trunc('month', now() + interval '2 months');
   BEGIN
     EXECUTE format('CREATE TABLE IF NOT EXISTS reactory_calendar_entry_y%sm%s
                     PARTITION OF reactory_calendar_entry
                     FOR VALUES FROM (%L) TO (%L)',
                     extract(year from next_month),
                     lpad(extract(month from next_month)::text, 2, '0'),
                     next_month,
                     next_month + interval '1 month');
   END;
   $$ LANGUAGE plpgsql;
   ```

#### **Expected Performance Metrics**

- **Calendar Views**: 20-50ms for monthly views (1000+ events)
- **Availability Checks**: 10-30ms for conflict detection across 10+ calendars
- **Search Operations**: 50-200ms for full-text search with relevance ranking
- **Write Operations**: 5-15ms for event creation with validation

### Caching Strategy

1. **Application Cache**:
   - User calendar lists cached with TTL
   - Calendar permissions cached
   - Frequently accessed calendar entries

2. **Calendar Views**:
   - Pre-computed availability slots
   - Cached recurring entry expansions

### Scalability Features

1. **Pagination**: All list operations support cursor-based pagination
2. **Background Processing**: Trigger execution and notifications handled asynchronously
3. **Rate Limiting**: API rate limiting to prevent abuse
4. **Archive Strategy**: Old calendar entries can be archived

## Integration Points

### Workflow Integration

Calendar entries can trigger workflows:
- **Event Creation**: Trigger when entry is created
- **Event Updates**: Trigger on status or participant changes
- **Time-based**: Trigger before/after event times
- **Participant Actions**: Trigger on RSVP responses

### Service Integration

Calendar entries can execute service functions:
- **Notification Services**: Send reminders and updates
- **External Calendar Sync**: Sync with Google Calendar, Outlook
- **Resource Booking**: Reserve meeting rooms, equipment
- **Task Creation**: Generate follow-up tasks

### Third-party Integrations

- **Google Calendar**: Bidirectional sync
- **Microsoft Outlook**: Calendar integration
- **Zoom/Teams**: Meeting creation and management
- **Slack**: Calendar notifications and reminders

## Implementation Plan

### Phase 1: PostgreSQL Schema & Core Entities
1. **Database Setup**:
   - Create PostgreSQL tables with optimized indexes
   - Set up partitioning for calendar entries
   - Configure connection pooling for high-read load

2. **TypeORM Entities**:
   - Implement Calendar and CalendarEntry entities with hybrid relationships
   - Add PostgreSQL-specific optimizations (GIN, BRIN, GIST indexes)
   - Create CalendarParticipant entity for attendee management

3. **Core Services**:
   - ReactoryCalendarService with PostgreSQL query optimizations
   - ReactoryCalendarEntryService with date range and availability logic
   - ReactoryCalendarIntegrationService for workflow and service triggers
   - Permission service for visibility and access control

4. **Migration Strategy**:
   ```sql
   -- Initial schema creation with performance optimizations
   CREATE TYPE calendar_visibility AS ENUM ('private', 'shared', 'application', 'organization', 'public');
   CREATE TYPE calendar_entry_status AS ENUM ('draft', 'confirmed', 'cancelled', 'completed');
   CREATE TYPE calendar_entry_priority AS ENUM ('low', 'normal', 'high', 'urgent');

   -- Tables with optimized schemas
   CREATE TABLE reactory_calendar (...);
   CREATE TABLE reactory_calendar_entry (...) PARTITION BY RANGE (start_date);
   CREATE TABLE reactory_calendar_participant (...);
   ```

### Phase 2: Advanced Features
1. Implement recurrence patterns
2. Add participant management
3. Create workflow and service triggers
4. Implement notification system

### Phase 3: Integration and Optimization
1. Add third-party calendar integrations
2. Implement caching and performance optimizations
3. Add comprehensive audit logging
4. Create administrative interfaces

### Phase 4: Advanced Features
1. Real-time collaboration features
2. Advanced recurrence patterns
3. Calendar analytics and reporting
4. Mobile application support

## Testing Strategy

### Unit Tests
- Service method testing
- Permission logic validation
- Date/time calculation testing
- Recurrence pattern expansion

### Integration Tests
- GraphQL API testing
- Database transaction testing
- Workflow trigger execution
- External service integration

### E2E Tests
- Complete calendar workflows
- User permission scenarios
- Third-party integration testing
- Performance and load testing

## Monitoring & Analytics

### Metrics to Track
1. **Usage Metrics**:
   - Calendar creation and usage statistics
   - Entry creation and participation rates
   - User engagement and adoption

2. **Performance Metrics**:
   - API response times
   - Database query performance
   - Cache hit rates

3. **Business Metrics**:
   - Calendar sharing and collaboration rates
   - Workflow trigger success rates
   - Integration usage statistics

This specification provides a comprehensive blueprint for implementing the Reactory Calendar system, covering all aspects from data modeling to API design, security, performance, and future extensibility.
