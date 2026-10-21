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

---

## ORG-002 — organization identity writes and media persistence

### Defects

1. `updateOrganizationLogo` wrote bytes to `${APP_DATA_ROOT}/organization/<id>/`
   and returned the organization untouched, so `logo` was never set.
2. `uploadOrganizationImage` called `organization.save()` without awaiting it
   and returned before persistence.
3. `setOrganization` used `updates.name || organization.name` (no field could be
   cleared) and the deprecated `Organization.count`.
4. Cache-busting / aliasing was the only way `logoURL` could ever resolve.

### Behaviour to lock down

1. `uploadOrganizationImage('logo' | 'avatar')` uploads through
   `core.ReactoryFileService@1.0.0`, assigns the returned `alias` to the
   document and awaits `save()` before resolving.
2. `updateOrganizationLogo` converts a base64 data URI into the `IFile` contract
   (correct mimetype, extension and byte stream), uploads it through the same
   service, assigns the alias and persists.
3. `setOrganization` treats `undefined` as "leave alone", `null`/blank as
   "clear", trims supplied values, rejects an empty `name`, and uses
   `countDocuments`.

### Test cases (`OrganizationService.test.ts`)

- `uploadOrganizationImage`
  - `stores the returned alias on the document and persists it`
  - `stores the alias on the avatar for avatar uploads`
  - `does not resolve before the save has completed` (deferred `save` promise)
- `updateOrganizationLogo`
  - `uploads a data URI through the file service and persists the alias`
    (asserts upload args, mimetype, filename, decoded stream bytes and alias)
  - `rejects image data that is not a data URI`
- `setOrganization`
  - `clears code and tradingName when they are explicitly cleared`
  - `leaves unspecified fields untouched`
  - `uses countDocuments rather than the deprecated count`
  - `rejects an empty name` / `rejects an explicit null name`

Models are mocked; the file service is a stub returning a `{ id, hash, alias }`
model. No database or filesystem writes are required.

## Verification

```bash
./bin/jest.sh reactory local 'OrganizationService'
npm run typecheck
```