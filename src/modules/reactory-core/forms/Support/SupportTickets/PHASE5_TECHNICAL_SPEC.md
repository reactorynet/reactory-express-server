# Phase 5 Technical Specification: Real-time Notifications via GraphQL Subscriptions

**Date:** December 23, 2025  
**Version:** 1.0  
**Status:** Technical Specification - Pre-Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Infrastructure Analysis](#current-infrastructure-analysis)
3. [Architecture Design](#architecture-design)
4. [GraphQL Schema](#graphql-schema)
5. [Server-Side Implementation](#server-side-implementation)
6. [Client-Side Implementation](#client-side-implementation)
7. [Notification System](#notification-system)
8. [Testing Strategy](#testing-strategy)
9. [Security Considerations](#security-considerations)
10. [Performance Considerations](#performance-considerations)
11. [Implementation Plan](#implementation-plan)

---

## 1. Executive Summary

### Objective
Implement real-time notifications for Support Tickets using GraphQL subscriptions, enabling users to receive instant updates when tickets are created, updated, assigned, commented on, or deleted.

### Scope
- GraphQL subscription infrastructure setup
- Server-side subscription resolvers
- Client-side subscription consumers
- Integration with `reactory.createNotification()` API
- Toast notifications with customizable properties
- Browser notifications (optional)
- Optimistic UI updates

### Key Technologies
- **Server:** Apollo Server 4 (already configured)
- **Client:** Apollo Client with `GraphQLWsLink` (already configured)
- **Transport:** WebSocket (ws:// for subscriptions)
- **Protocol:** graphql-ws

---

## 2. Current Infrastructure Analysis

### 2.1 Server Configuration

**File:** `/express/middleware/ReactoryGraph.ts`

#### Current State ✅
```typescript
// Apollo Server is configured with proper plugins
const apolloServer = new ApolloServer({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    ...plugins,
  ],
});
```

#### Missing Components ❌
1. **No WebSocket Server** - Apollo Server 4 requires separate WebSocket server for subscriptions
2. **No Subscription Context** - Need to pass authentication/user context to subscriptions
3. **No PubSub** - Need a publish/subscribe mechanism for events

#### Required Changes
1. Install `graphql-subscriptions` package
2. Create WebSocket server using `ws` library
3. Configure `useServer` from `graphql-ws/lib/use/ws`
4. Set up PubSub instance (in-memory for development, Redis for production)
5. Pass authentication token through connection params
6. Add subscription context provider

### 2.2 Client Configuration

**File:** `/api/ReactoryApolloClient.ts`

#### Current State ✅
```typescript
// WebSocket link already configured
const ws_client = createClient({
  url: `${localStorage.getItem('REACT_APP_API_ENDPOINT')}/graph`.replace('http', 'ws'),
  retryAttempts: 5,
  connectionParams: {
    Authorization: `Bearer ${token}`,
    authToken: token
  }
})

const ws_link = new GraphQLWsLink(ws_client);

// Split link correctly routes subscriptions to WebSocket
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  ws_link,
  authLink.concat(uploadLink),
);
```

#### Status ✅
- WebSocket client properly configured
- Authentication headers included
- Split link routing subscriptions correctly
- Retry logic in place

#### Potential Enhancements
1. Add connection state management (connected/disconnected/reconnecting)
2. Add error handling for subscription failures
3. Add subscription cleanup on component unmount
4. Add reconnection strategy with exponential backoff

### 2.3 Notification API

**Type Definition:** `Reactory.Client.NotificationProperties`

```typescript
export interface NotificationProperties {
  title: string;
  options: NotificationOptions; // Standard Web Notification API
}

// Usage
reactory.createNotification(
  title: string,
  notificationProperties: NotificationProperties | unknown,
): void;
```

#### NotificationOptions (Standard Web API)
```typescript
interface NotificationOptions {
  body?: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  timestamp?: number;
  actions?: NotificationAction[];
}
```

### 2.4 Existing GraphQL Subscription Infrastructure

**Found Subscription Types:**

1. **System/Scalars.graphql** - Base subscription type
   ```graphql
   type Subscription {
     # Base subscription type
   }
   ```

2. **User/User.graphql** - User-related subscriptions
   ```graphql
   extend type Subscription {
     # User subscriptions
   }
   ```

3. **User/UserImport.graphql** - Import progress subscriptions
   ```graphql
   extend type Subscription {
     # Import progress subscriptions
   }
   ```

---

## 3. Architecture Design

### 3.1 Event Flow

```
[Ticket Action]
     ↓
[GraphQL Mutation/Resolver]
     ↓
[PubSub.publish(event)]
     ↓
[WebSocket Server]
     ↓
[Subscription Resolver (with filter)]
     ↓
[Connected Clients (filtered)]
     ↓
[Apollo Client (ws_link)]
     ↓
[Subscription Handler]
     ↓
[reactory.createNotification()]
     ↓
[Toast/Browser Notification]
```

### 3.2 PubSub Architecture

```
┌─────────────────────────────────────┐
│    GraphQL Mutation Resolvers       │
│  (Create, Update, Delete, Comment)  │
└──────────────┬──────────────────────┘
               │ pubsub.publish()
               ↓
┌─────────────────────────────────────┐
│         PubSub Manager              │
│  (In-Memory / Redis / EventEmitter) │
└──────────────┬──────────────────────┘
               │ AsyncIterator
               ↓
┌─────────────────────────────────────┐
│    Subscription Resolvers           │
│  (Filter by user, team, ticket)     │
└──────────────┬──────────────────────┘
               │ WebSocket
               ↓
┌─────────────────────────────────────┐
│         Client Consumers            │
│  (useSubscription / Apollo Client)  │
└─────────────────────────────────────┘
```

### 3.3 Subscription Filtering

Subscriptions must be filtered to ensure users only receive relevant notifications:

| Subscription | Filter Criteria |
|--------------|----------------|
| `ticketCreated` | User is team member OR ticket is assigned to user OR user is creator |
| `ticketUpdated` | User is watching ticket OR assigned to ticket OR is creator |
| `ticketAssigned` | User is new assignee OR user is requester |
| `ticketCommented` | User is watching ticket OR assigned to ticket OR is creator |
| `ticketStatusChanged` | User is watching ticket OR assigned to ticket OR is creator |
| `ticketDeleted` | User was watching ticket |

---

## 4. GraphQL Schema

### 4.1 Subscription Types

**File:** `/modules/reactory-core/graph/types/User/Support.graphql`

```graphql
"""
Enum for different types of ticket events
"""
enum SupportTicketEventType {
  CREATED
  UPDATED
  ASSIGNED
  UNASSIGNED
  STATUS_CHANGED
  PRIORITY_CHANGED
  COMMENTED
  ATTACHMENT_ADDED
  DELETED
  RELATED_ADDED
  RELATED_REMOVED
  TAG_ADDED
  TAG_REMOVED
}

"""
Support ticket event payload for subscriptions
"""
type SupportTicketEvent {
  """Event type"""
  eventType: SupportTicketEventType!
  
  """The ticket that changed"""
  ticket: ReactorySupportTicket!
  
  """Previous state (for updates)"""
  previousState: JSON
  
  """User who triggered the event"""
  triggeredBy: ReactoryUser!
  
  """Timestamp of the event"""
  timestamp: Date!
  
  """Additional event data"""
  metadata: JSON
  
  """Comment content (for comment events)"""
  comment: ReactorySupportTicketComment
  
  """Old and new values (for specific field changes)"""
  changes: [FieldChange!]
}

"""
Field change detail"""
type FieldChange {
  field: String!
  oldValue: JSON
  newValue: JSON
}

"""
Subscription filter input"""
input SupportTicketSubscriptionFilter {
  """Filter by ticket IDs"""
  ticketIds: [String!]
  
  """Filter by event types"""
  eventTypes: [SupportTicketEventType!]
  
  """Filter by assigned user"""
  assignedToUserId: String
  
  """Filter by status"""
  statuses: [String!]
  
  """Filter by priority"""
  priorities: [String!]
  
  """Only tickets user is watching"""
  watchedOnly: Boolean
  
  """Include tickets user created"""
  includeCreated: Boolean
  
  """Include tickets assigned to user"""
  includeAssigned: Boolean
}

"""
Extend the Subscription type"""
extend type Subscription {
  """
  Subscribe to support ticket events
  """
  supportTicketEvents(
    """Optional filter criteria"""
    filter: SupportTicketSubscriptionFilter
  ): SupportTicketEvent!
  
  """
  Subscribe to specific ticket updates"""
  ticketUpdated(ticketId: String!): SupportTicketEvent!
  
  """
  Subscribe to tickets assigned to current user"""
  myTicketUpdates: SupportTicketEvent!
  
  """
  Subscribe to team ticket updates"""
  teamTicketUpdates: SupportTicketEvent!
}
```

### 4.2 Mutation Return Types (Enhanced)

All mutations should return additional fields for optimistic updates:

```graphql
type SupportTicketMutationResult {
  success: Boolean!
  ticket: ReactorySupportTicket
  event: SupportTicketEvent
  error: String
}
```

---

## 5. Server-Side Implementation

### 5.1 Dependencies

**Required NPM Packages:**
```json
{
  "graphql-subscriptions": "^2.0.0",
  "ioredis": "^5.3.0" // For production PubSub
}
```

### 5.2 PubSub Setup

**File:** `/utils/pubsub.ts` (NEW)

```typescript
import { PubSub } from 'graphql-subscriptions';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import Redis from 'ioredis';
import logger from '@reactory/server-core/logging';

const { NODE_ENV, REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } = process.env;

let pubsub: PubSub | RedisPubSub;

if (NODE_ENV === 'production' && REDIS_HOST) {
  // Production: Use Redis for multi-server support
  const options = {
    host: REDIS_HOST,
    port: parseInt(REDIS_PORT || '6379'),
    password: REDIS_PASSWORD,
    retryStrategy: (times: number) => {
      return Math.min(times * 50, 2000);
    },
  };

  pubsub = new RedisPubSub({
    publisher: new Redis(options),
    subscriber: new Redis(options),
  });

  logger.info('✅ Redis PubSub initialized');
} else {
  // Development: Use in-memory PubSub
  pubsub = new PubSub();
  logger.info('✅ In-Memory PubSub initialized (development mode)');
}

export default pubsub;

// Event channel names
export const SUPPORT_TICKET_EVENTS = {
  CREATED: 'SUPPORT_TICKET_CREATED',
  UPDATED: 'SUPPORT_TICKET_UPDATED',
  ASSIGNED: 'SUPPORT_TICKET_ASSIGNED',
  UNASSIGNED: 'SUPPORT_TICKET_UNASSIGNED',
  STATUS_CHANGED: 'SUPPORT_TICKET_STATUS_CHANGED',
  COMMENTED: 'SUPPORT_TICKET_COMMENTED',
  DELETED: 'SUPPORT_TICKET_DELETED',
  ALL: 'SUPPORT_TICKET_ALL_EVENTS',
};
```

### 5.3 WebSocket Server Setup

**File:** `/express/middleware/ReactoryGraph.ts` (MODIFICATIONS)

```typescript
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';

const ReactoryGraphMiddleware = async (app: express.Application, httpServer: http.Server) => {
  // ... existing code ...

  // Create Apollo Server
  const apolloServer = new ApolloServer(expressConfig);
  await apolloServer.start();

  // **NEW: WebSocket Server for Subscriptions**
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graph',
  });

  // **NEW: graphql-ws Server**
  const serverCleanup = useServer({
    schema,
    context: async (ctx, msg, args) => {
      // Get auth token from connection params
      const token = ctx.connectionParams?.authToken || ctx.connectionParams?.Authorization?.replace('Bearer ', '');
      
      if (!token) {
        throw new Error('Unauthorized: No token provided');
      }

      // Verify token and get user context
      try {
        const context = await ReactoryContextProvider(null, { token });
        return context;
      } catch (error) {
        logger.error('Subscription authentication failed:', error);
        throw new Error('Unauthorized: Invalid token');
      }
    },
    onConnect: async (ctx) => {
      logger.info('WebSocket client connected');
    },
    onDisconnect: (ctx, code, reason) => {
      logger.info(`WebSocket client disconnected: ${code} - ${reason}`);
    },
  }, wsServer);

  // ... existing Express middleware setup ...

  logger.info('✅ WebSocket server started for subscriptions');
};
```

### 5.4 Subscription Resolvers

**File:** `/modules/reactory-core/graph/resolvers/User/Support.ts` (NEW)

```typescript
import { withFilter } from 'graphql-subscriptions';
import pubsub, { SUPPORT_TICKET_EVENTS } from '@reactory/server-core/utils/pubsub';
import Reactory from '@reactory/reactory-core';

const subscriptionResolvers: Reactory.Server.IReactoryResolvers = {
  Subscription: {
    supportTicketEvents: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUPPORT_TICKET_EVENTS.ALL]),
        (payload, variables, context: Reactory.Server.IReactoryContext) => {
          const { supportTicketEvents } = payload;
          const { filter } = variables;
          const { user } = context;

          if (!user) return false;

          // Apply filters
          if (filter) {
            // Filter by event types
            if (filter.eventTypes && !filter.eventTypes.includes(supportTicketEvents.eventType)) {
              return false;
            }

            // Filter by ticket IDs
            if (filter.ticketIds && !filter.ticketIds.includes(supportTicketEvents.ticket.id)) {
              return false;
            }

            // Filter by assigned user
            if (filter.assignedToUserId && supportTicketEvents.ticket.assignedTo?.id !== filter.assignedToUserId) {
              return false;
            }

            // Filter by status
            if (filter.statuses && !filter.statuses.includes(supportTicketEvents.ticket.status)) {
              return false;
            }

            // Filter by priority
            if (filter.priorities && !filter.priorities.includes(supportTicketEvents.ticket.priority)) {
              return false;
            }
          }

          // Check permissions: user must be involved with the ticket
          const isCreator = supportTicketEvents.ticket.createdBy.id === user.id;
          const isAssignee = supportTicketEvents.ticket.assignedTo?.id === user.id;
          const isWatcher = supportTicketEvents.ticket.watchers?.some((w: any) => w.id === user.id);
          const isTeamMember = user.roles?.includes('SUPPORT_AGENT') || user.roles?.includes('ADMIN');

          return isCreator || isAssignee || isWatcher || isTeamMember;
        }
      ),
      resolve: (payload) => payload.supportTicketEvents,
    },

    ticketUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUPPORT_TICKET_EVENTS.UPDATED, SUPPORT_TICKET_EVENTS.STATUS_CHANGED]),
        (payload, variables, context: Reactory.Server.IReactoryContext) => {
          return payload.supportTicketEvents.ticket.id === variables.ticketId;
        }
      ),
      resolve: (payload) => payload.supportTicketEvents,
    },

    myTicketUpdates: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUPPORT_TICKET_EVENTS.ALL]),
        (payload, variables, context: Reactory.Server.IReactoryContext) => {
          const { user } = context;
          const { ticket } = payload.supportTicketEvents;
          return ticket.assignedTo?.id === user.id || ticket.createdBy.id === user.id;
        }
      ),
      resolve: (payload) => payload.supportTicketEvents,
    },

    teamTicketUpdates: {
      subscribe: withFilter(
        () => pubsub.asyncIterator([SUPPORT_TICKET_EVENTS.ALL]),
        (payload, variables, context: Reactory.Server.IReactoryContext) => {
          const { user } = context;
          return user.roles?.includes('SUPPORT_AGENT') || user.roles?.includes('ADMIN');
        }
      ),
      resolve: (payload) => payload.supportTicketEvents,
    },
  },
};

export default subscriptionResolvers;
```

### 5.5 Publishing Events

**File:** `/models/graphql/resolvers/Support/mutations.ts` (MODIFICATIONS)

```typescript
import pubsub, { SUPPORT_TICKET_EVENTS } from '@reactory/server-core/utils/pubsub';

// Example: Update ticket status
const updateSupportTicketStatus = async (obj, args, context) => {
  const { id, status, comment } = args;
  const { user } = context;

  // Perform the update
  const ticket = await SupportTicket.findByIdAndUpdate(
    id,
    { status, updatedDate: new Date() },
    { new: true }
  ).populate('createdBy assignedTo');

  // Publish event
  await pubsub.publish(SUPPORT_TICKET_EVENTS.ALL, {
    supportTicketEvents: {
      eventType: 'STATUS_CHANGED',
      ticket,
      triggeredBy: user,
      timestamp: new Date(),
      changes: [
        {
          field: 'status',
          oldValue: ticket.previousStatus, // You'd need to track this
          newValue: status,
        },
      ],
      metadata: {
        comment,
      },
    },
  });

  await pubsub.publish(SUPPORT_TICKET_EVENTS.STATUS_CHANGED, {
    supportTicketEvents: {
      eventType: 'STATUS_CHANGED',
      ticket,
      triggeredBy: user,
      timestamp: new Date(),
    },
  });

  return {
    success: true,
    ticket,
  };
};
```

---

## 6. Client-Side Implementation

### 6.1 Subscription Hook

**File:** `/hooks/useSupportTicketSubscription.ts` (NEW)

```typescript
import { useEffect } from 'react';
import { useSubscription, gql } from '@apollo/client';
import { useReactory } from '@reactory/client-core/api';

const SUPPORT_TICKET_EVENTS_SUBSCRIPTION = gql`
  subscription SupportTicketEvents($filter: SupportTicketSubscriptionFilter) {
    supportTicketEvents(filter: $filter) {
      eventType
      ticket {
        id
        reference
        request
        status
        priority
        assignedTo {
          id
          firstName
          lastName
        }
        createdBy {
          id
          firstName
          lastName
        }
        updatedDate
      }
      triggeredBy {
        id
        firstName
        lastName
      }
      timestamp
      changes {
        field
        oldValue
        newValue
      }
      comment {
        id
        comment
      }
    }
  }
`;

interface UseSupportTicketSubscriptionOptions {
  filter?: any;
  onEvent?: (event: any) => void;
  showNotifications?: boolean;
  enabled?: boolean;
}

export const useSupportTicketSubscription = (options: UseSupportTicketSubscriptionOptions = {}) => {
  const {
    filter,
    onEvent,
    showNotifications = true,
    enabled = true,
  } = options;

  const reactory = useReactory();

  const { data, loading, error } = useSubscription(
    SUPPORT_TICKET_EVENTS_SUBSCRIPTION,
    {
      variables: { filter },
      skip: !enabled,
      onSubscriptionData: ({ subscriptionData }) => {
        const event = subscriptionData.data?.supportTicketEvents;
        
        if (event) {
          // Call custom handler
          onEvent?.(event);

          // Show notification
          if (showNotifications) {
            showTicketNotification(event, reactory);
          }
        }
      },
    }
  );

  return {
    event: data?.supportTicketEvents,
    loading,
    error,
  };
};

const showTicketNotification = (event: any, reactory: any) => {
  const { eventType, ticket, triggeredBy } = event;

  const notificationConfig = getNotificationConfig(eventType, ticket, triggeredBy);

  reactory.createNotification(
    notificationConfig.title,
    {
      title: notificationConfig.title,
      options: {
        body: notificationConfig.body,
        icon: notificationConfig.icon || '/icons/ticket-icon.png',
        badge: '/icons/badge-icon.png',
        tag: `ticket-${ticket.id}`,
        requireInteraction: notificationConfig.requireInteraction || false,
        data: {
          ticketId: ticket.id,
          eventType,
          url: `/support/tickets/${ticket.id}`,
        },
        actions: [
          {
            action: 'view',
            title: 'View Ticket',
            icon: '/icons/view-icon.png',
          },
          {
            action: 'dismiss',
            title: 'Dismiss',
          },
        ],
      },
    }
  );
};

const getNotificationConfig = (eventType: string, ticket: any, triggeredBy: any) => {
  const configs = {
    CREATED: {
      title: 'New Ticket Created',
      body: `${triggeredBy.firstName} created ticket "${ticket.request}"`,
      icon: '/icons/new-ticket.png',
    },
    ASSIGNED: {
      title: 'Ticket Assigned to You',
      body: `${triggeredBy.firstName} assigned you ticket "${ticket.request}"`,
      icon: '/icons/assigned.png',
      requireInteraction: true,
    },
    STATUS_CHANGED: {
      title: 'Ticket Status Updated',
      body: `${ticket.reference}: ${ticket.status}`,
      icon: '/icons/status-change.png',
    },
    COMMENTED: {
      title: 'New Comment',
      body: `${triggeredBy.firstName} commented on "${ticket.request}"`,
      icon: '/icons/comment.png',
    },
    DELETED: {
      title: 'Ticket Deleted',
      body: `Ticket "${ticket.request}" was deleted`,
      icon: '/icons/deleted.png',
    },
  };

  return configs[eventType] || {
    title: 'Ticket Updated',
    body: `Ticket "${ticket.request}" was updated`,
    icon: '/icons/update.png',
  };
};
```

### 6.2 Integration into SupportTickets Form

**File:** `components/SupportTicketsList.tsx` (MODIFICATIONS)

```typescript
import { useSupportTicketSubscription } from '@reactory/client-core/hooks/useSupportTicketSubscription';

const SupportTicketsList = (props) => {
  const { reactory, data, refetch } = props;

  // Subscribe to ticket events
  useSupportTicketSubscription({
    filter: {
      includeAssigned: true,
      includeCreated: true,
    },
    onEvent: (event) => {
      // Refetch data on relevant events
      if (['CREATED', 'UPDATED', 'DELETED', 'STATUS_CHANGED'].includes(event.eventType)) {
        refetch();
      }
    },
    showNotifications: true,
  });

  // ... rest of component
};
```

---

## 7. Notification System

### 7.1 Notification Manager

**File:** `/utils/NotificationManager.ts` (NEW)

```typescript
class NotificationManager {
  private notifications: Map<string, Notification> = new Map();
  private permission: NotificationPermission = 'default';

  constructor() {
    this.checkPermission();
  }

  async checkPermission() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
      if (this.permission === 'default') {
        this.permission = await Notification.requestPermission();
      }
    }
  }

  show(title: string, options: NotificationOptions) {
    if (this.permission !== 'granted') {
      console.warn('Notification permission not granted');
      return null;
    }

    const notification = new Notification(title, options);

    // Store notification
    const tag = options.tag || `notif-${Date.now()}`;
    this.notifications.set(tag, notification);

    // Auto-close after duration (if not requireInteraction)
    if (!options.requireInteraction) {
      setTimeout(() => {
        notification.close();
        this.notifications.delete(tag);
      }, 5000);
    }

    // Handle clicks
    notification.onclick = (event) => {
      event.preventDefault();
      const url = options.data?.url;
      if (url) {
        window.open(url, '_self');
      }
      notification.close();
    };

    return notification;
  }

  closeAll() {
    this.notifications.forEach((notif) => notif.close());
    this.notifications.clear();
  }
}

export default new NotificationManager();
```

---

## 8. Testing Strategy

### 8.1 Server-Side Tests

```typescript
describe('Support Ticket Subscriptions', () => {
  it('should publish event when ticket is created', async () => {
    // Test PubSub publishing
  });

  it('should filter events by user permissions', async () => {
    // Test subscription filtering
  });

  it('should handle concurrent subscriptions', async () => {
    // Test scalability
  });
});
```

### 8.2 Client-Side Tests

```typescript
describe('useSupportTicketSubscription', () => {
  it('should connect to WebSocket', () => {
    // Test connection
  });

  it('should receive and display notifications', () => {
    // Test notification display
  });

  it('should handle disconnection gracefully', () => {
    // Test reconnection logic
  });
});
```

---

## 9. Security Considerations

### 9.1 Authentication
- ✅ Token validation on WebSocket connection
- ✅ Context-based user identification
- ✅ Permission checks in subscription filters

### 9.2 Authorization
- ✅ Only send events to authorized users
- ✅ Filter events based on team membership
- ✅ Respect ticket visibility rules

### 9.3 Rate Limiting
- ⚠️ Implement subscription rate limiting
- ⚠️ Monitor concurrent connections per user
- ⚠️ Set max subscriptions per client

---

## 10. Performance Considerations

### 10.1 Scalability
- Use Redis PubSub for multi-server deployments
- Implement connection pooling
- Monitor WebSocket connection count

### 10.2 Optimization
- Debounce rapid events
- Batch notifications where appropriate
- Lazy load notification data

---

## 11. Implementation Plan

### Phase 5.1: Server Infrastructure (Week 1)
- [ ] Install dependencies (`graphql-subscriptions`, `ioredis`)
- [ ] Create PubSub utility
- [ ] Configure WebSocket server in ReactoryGraph.ts
- [ ] Add subscription context provider
- [ ] Test WebSocket connection

### Phase 5.2: GraphQL Schema (Week 1)
- [ ] Define `SupportTicketEvent` type
- [ ] Define subscription types
- [ ] Add to Support.graphql
- [ ] Generate TypeScript types

### Phase 5.3: Server Resolvers (Week 2)
- [ ] Create subscription resolvers
- [ ] Implement filtering logic
- [ ] Add PubSub publishing to mutations
- [ ] Test with GraphQL Playground

### Phase 5.4: Client Implementation (Week 2)
- [ ] Create `useSupportTicketSubscription` hook
- [ ] Integrate into SupportTickets form
- [ ] Implement notification display
- [ ] Test end-to-end

### Phase 5.5: Enhancements (Week 3)
- [ ] Browser notifications
- [ ] Sound alerts (optional)
- [ ] Notification history
- [ ] Connection state UI
- [ ] Optimistic updates

---

## Conclusion

This technical specification provides a comprehensive plan for implementing real-time notifications via GraphQL subscriptions. The infrastructure is largely in place on the client side, requiring primarily server-side implementation of the WebSocket server, PubSub mechanism, and subscription resolvers.

**Next Steps:**
1. Review and approve this specification
2. Begin Phase 5.1 implementation
3. Test with development environment
4. Deploy to staging
5. Monitor performance and adjust

---

**Status:** ✅ Ready for Implementation  
**Estimated Effort:** 3 weeks  
**Risk Level:** Medium (requires WebSocket server configuration)  
**Dependencies:** None (all infrastructure exists)
