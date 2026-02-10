# Phase 5 Technical Specification - Summary

**Document:** `PHASE5_TECHNICAL_SPEC.md`  
**Date:** December 23, 2025  
**Status:** Ready for Review and Implementation

## Executive Summary

Comprehensive 11-section technical specification for implementing real-time notifications via GraphQL subscriptions in the Support Tickets system.

## Key Findings

### ✅ Client Infrastructure - Ready
- WebSocket client configured with `graphql-ws`
- Split link properly routes subscriptions
- Authentication headers included
- Retry logic in place

### ❌ Server Infrastructure - Needs Implementation
- No WebSocket server configured
- Missing PubSub mechanism
- No subscription context provider
- No subscription resolvers

### ✅ Notification API - Ready
- `reactory.createNotification()` available
- Standard Web Notification API support
- Type definitions complete

## Architecture Overview

### Event Flow
```
Mutation → PubSub.publish() → WebSocket Server → Filtered Subscribers → Notifications
```

### PubSub Options
- **Development:** In-memory PubSub (simple, single-server)
- **Production:** Redis PubSub (scalable, multi-server)

### Subscription Types Defined
1. `supportTicketEvents` - All ticket events with filters
2. `ticketUpdated` - Specific ticket updates
3. `myTicketUpdates` - User's tickets only
4. `teamTicketUpdates` - Team-wide updates

## Required Changes

### Server-Side (Critical)

**1. Install Dependencies**
```bash
npm install graphql-subscriptions ioredis
```

**2. Create PubSub Utility**
- Location: `/utils/pubsub.ts`
- Supports both in-memory and Redis

**3. Configure WebSocket Server**
- Modify: `/express/middleware/ReactoryGraph.ts`
- Add `WebSocketServer` from `ws`
- Configure `useServer` from `graphql-ws`
- Add subscription context with authentication

**4. Create Subscription Resolvers**
- Location: `/graph/resolvers/User/Support.ts`
- Implement filtering logic
- Add permission checks

**5. Publish Events from Mutations**
- Modify all Support ticket mutations
- Call `pubsub.publish()` after operations
- Include event metadata

### Client-Side (Enhancement)

**1. Create Subscription Hook**
- Location: `/hooks/useSupportTicketSubscription.ts`
- Wrapper around Apollo's `useSubscription`
- Integrated with `reactory.createNotification()`

**2. Integrate into Forms**
- Add hook to SupportTickets form
- Auto-refetch on events
- Display real-time updates

## GraphQL Schema

### Event Types
```graphql
enum SupportTicketEventType {
  CREATED, UPDATED, ASSIGNED, UNASSIGNED,
  STATUS_CHANGED, PRIORITY_CHANGED, COMMENTED,
  ATTACHMENT_ADDED, DELETED, RELATED_ADDED,
  TAG_ADDED, TAG_REMOVED
}
```

### Subscription Filters
```graphql
input SupportTicketSubscriptionFilter {
  ticketIds: [String!]
  eventTypes: [SupportTicketEventType!]
  assignedToUserId: String
  statuses: [String!]
  priorities: [String!]
  watchedOnly: Boolean
  includeCreated: Boolean
  includeAssigned: Boolean
}
```

## Security

### Authentication ✅
- Token validation on WebSocket connection
- Context-based user identification

### Authorization ✅
- Subscription filtering by user role
- Permission checks in resolvers
- Only relevant events sent to users

### Rate Limiting ⚠️
- Needs implementation
- Monitor concurrent connections
- Set max subscriptions per client

## Implementation Plan

### Phase 5.1: Server Infrastructure (Week 1)
- Install dependencies
- Create PubSub utility
- Configure WebSocket server
- Add subscription context
- Test connection

### Phase 5.2: GraphQL Schema (Week 1)
- Define event types
- Define subscriptions
- Update Support.graphql
- Generate TypeScript types

### Phase 5.3: Server Resolvers (Week 2)
- Create subscription resolvers
- Implement filtering logic
- Add PubSub to mutations
- Test with playground

### Phase 5.4: Client Implementation (Week 2)
- Create subscription hook
- Integrate into forms
- Implement notifications
- Test end-to-end

### Phase 5.5: Enhancements (Week 3)
- Browser notifications
- Sound alerts
- Notification history
- Connection state UI
- Optimistic updates

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| WebSocket Config | Medium | Follow spec exactly, test thoroughly |
| Performance | Low | Use Redis in production, monitor connections |
| Security | Low | Token validation, permission filtering |
| Scalability | Low | Redis PubSub handles multi-server |

## Benefits

### User Experience
- ✅ Real-time updates without refresh
- ✅ Instant notifications on changes
- ✅ Better awareness of ticket activity
- ✅ Reduced page refreshes

### Developer Experience
- ✅ Clean subscription API
- ✅ Reusable hook pattern
- ✅ Type-safe implementation
- ✅ Easy to extend

### Performance
- ✅ Push-based updates (efficient)
- ✅ Filtered subscriptions (targeted)
- ✅ Scalable architecture
- ✅ Redis support for production

## Next Steps

1. **Review Specification** - Ensure architecture meets requirements
2. **Approve Implementation** - Get stakeholder sign-off
3. **Begin Phase 5.1** - Server infrastructure setup
4. **Test Thoroughly** - Each phase before moving forward
5. **Monitor Performance** - After deployment

## Documentation Sections

The specification includes:
1. Executive Summary
2. Current Infrastructure Analysis
3. Architecture Design
4. GraphQL Schema (complete)
5. Server-Side Implementation (code examples)
6. Client-Side Implementation (code examples)
7. Notification System
8. Testing Strategy
9. Security Considerations
10. Performance Considerations
11. Implementation Plan

---

**Status:** ✅ Specification Complete  
**File:** `PHASE5_TECHNICAL_SPEC.md` (77KB, ~1,000 lines)  
**Estimated Effort:** 3 weeks  
**Ready for:** Implementation

