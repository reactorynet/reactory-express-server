# Test Plan — OrganizationService actor attribution through a singleton

## Problem

`core.OrganizationService` is declared `lifeCycle: 'singleton'` and its mutating
methods read `this.context.user._id` to populate `owner`, `createdBy` and
`updatedBy`. When `ServiceManager` returns the memoised instance built at
startup, that context is the **system** user, so teams/business units are
created on behalf of the system identity instead of the request operator.

See REACTORY-302016408/20261015/3703515660.

## Behaviour to lock down

1. Resolving the singleton from a request and calling `createTeam` records the
   request user in `owner`, `createdBy` and `updatedBy`.
2. The same is true when the caller passes its request context explicitly (the
   new optional `executionContext` parameter).
3. The `@roles` guard evaluates roles against the request user, not the system
   user.

## Test cases (`OrganizationService.test.ts`)

- `records the request user on a team created through a startup singleton`
  - register a singleton definition wrapping the real `OrganizationService`
  - `startServices({}, systemContext)` (constructs with the system user)
  - `getService(id, {}, requestContext)` then `createTeam(...)`
  - assert captured `Team` document `owner`/`createdBy`/`updatedBy` equal the
    request user id and differ from the system user id.
- `records the request user when the context is passed explicitly`
  - call `createTeam(id, name, requestContext)` on an instance bound to the
    system context and assert the same fields.
- `authorises against the request user`
  - assert `requestContext.hasRole` was called and `systemContext.hasRole` was
    not (the `@roles` decorator reads `this.context`).

Models are mocked; no database is required.

## Why these fail before the fix

Before the fix the cached singleton kept the system context, so `resolveActorId`
resolved the system user and every audit field was attributed to it.
