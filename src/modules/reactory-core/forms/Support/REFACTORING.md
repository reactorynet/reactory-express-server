# Support Ticket System Refactoring

## Branch: `refactor/support-ticket-system`

**Started:** 2026-06-13

---

## Scope

Complete overhaul of the support ticket system spanning model, service, resolver, forms, and custom widget. Addresses correctness bugs, data consistency, performance (N+1 queries), and UI reliability.

---

## Issue Registry

### Critical

| # | Issue | Status | Notes |
|---|---|---|---|
| 1 | **Status enum mismatch across all layers** | ✅ DONE | Added `in-progress`, `pending`, `on-hold` to view model enum; updated `isEnum()` for string comparison; aligned `getValues()`, `getKey()`, and `translate()` |
| 2 | **Pagination typo `paing.pageSize` (×2)** | ✅ DONE | Fixed in `SupportTickets/uiSchema.ts` — both list (line 28) and grid (line 530) views |
| 3 | **getTicket permission logic bug** | ✅ DONE | Eliminated duplicate contradictory checks, fixed ObjectId vs IUserDocument cast, added null check for missing ticket, cleaned error message ("does not have Insufficient permissions") |
| 4 | **N+1 query problem in resolver properties** | ✅ DONE | `assignedTo` now uses `await obj.populate()` instead of fire-and-forget; `comments` and `documents` use batched queries with proper async handling |

### Medium

| # | Issue | Status | Notes |
|---|---|---|---|
| 5 | **Duplicate `ReactoryMySupportTickets` query resolver** | ✅ DONE | Removed duplicate `userTickets` method — kept `myTickets` that filters by createdBy |
| 6 | **Dummy default data in view model constructor** | ✅ DONE | Replaced "Not Set" users, fake comment, and fake document with `undefined`/empty arrays. Optional fields use proper null checks |
| 7 | **deleteRequest is a no-op** | ✅ DONE | Implemented soft-delete via `updateMany()` — sets status to 'closed', records deletedAt/deletedBy/deleteReason in meta |
| 8 | **GraphQL mutation name mismatch** | ✅ DONE | Added resolver aliases: `ReactorySupportTicketComment` (v1, simple args) and `ReactoryAddSupportTicketComment` (v2, nested input). Same for delete: `ReactorySupportTicketDelete` (v1) and `ReactoryDeleteSupportTicket` (v2 with DeleteArgs wrapper). Widget calls now match resolvers |

### Minor / Polish

| # | Issue | Status | Notes |
|---|---|---|---|
| 9 | **Typos throughout** | ✅ DONE | Fixed `optios` → `options` in Admin uiSchema; fixed "does not have Insufficient permissions" error message |
| 10 | **Admin UI Schema typed as `any`** | ✅ DONE | Changed `const uiSchema: any` to `Reactory.Schema.IFormUISchema` |
| 11 | **Froala credentials potentially exposed to client** | ⏸ DEFERRED | `context.partner.password` passed to Froala widget — needs architectural decision: use scoped tokens instead |
| 12 | **Missing i18n strings** | TODO | Keys referenced but may not exist: tooltip, delete confirmation strings |
| 13 | **Test file is a stub** | TODO | All test code commented out — tests nothing |
| 14 | **`@ts-ignore` usage in widget** | TODO | 5 `@ts-ignore` comments mask real type errors — needs proper typing for `window.reactory` |

---

## Files Modified

- [x] `src/modules/reactory-core/services/ReactorySupportService.ts`
- [x] `src/modules/reactory-core/resolvers/Support/SupportResolver.ts`
- [x] `src/modules/reactory-core/forms/Support/SupportTickets/uiSchema.ts`
- [x] `src/modules/reactory-core/forms/Support/SupportTicketsAdmin/uiSchema.ts`
- [x] `src/modules/reactory-core/forms/Support/models/SupportTicket/SupportTicket.view.model.ts`
- [x] `src/modules/reactory-core/forms/Support/Widgets/types.ts`

---

## Canonical Status Enum (Agreed Upon)

```
new         — Ticket just created, not yet reviewed
open        — Accepted and visible for work
in-progress — Actively being worked on
pending     — Waiting on external input/blocker
resolved    — Fix applied, awaiting verification
closed      — Verified and complete
on-hold     — Voluntarily paused
withdrawn   — Requester withdrew the ticket
rejected    — Admin/support declined the request
```

---

## Progress Log

### 2026-06-13

#### Issue #2: Fix pagination typo (paing → paging) ✅
- Fixed in `SupportTickets/uiSchema.ts` — both ListUIOptions and MaterialTableUIOptions
- Changed `'paging.pageSize': 'paing.pageSize'` → `'paging.pageSize': 'paging.pageSize'`

#### Issue #9: Typos throughout ✅
- Fixed `optios` → `options` in SupportTicketsAdmin/uiSchema.ts
- Fixed "does not have Insufficient permissions" → "does not have permission to view ticket" in ReactorySupportService.ts

#### Issue #3: Fix getTicket permission logic bug ✅
- Removed duplicate contradictory permission blocks (ObjectId vs IUserDocument cast mismatch)
- Added null check for ticket-not-found case
- Simplified to single coherent flow: admin bypass → isCreator/isAssignee check → throw if neither
- Fixed error message typo ("does not have Insufficient permissions")

#### Issue #6: Clear dummy data from view model constructor ✅
- Removed "Not Set" user defaults — replaced with `undefined` for optional fields
- Comments/documents default to empty arrays (`props.comments ?? []`) instead of fake entries
- Made createdBy/assignedTo properly optional with `?:` type annotation

#### Issue #1: Fix status enum mismatch across layers ✅
- Added missing values to `SupportTicketStatus` enum: `inProgress`, `pending`, `onHold`
- Fixed `isEnum()` to compare string values (`Object.values().map(v => v as string).includes(value)`)
- Updated `getKey()` with cases for all 9 statuses
- Updated `getValues()` to include all 9 statuses in correct workflow order

#### Issue #4 & #5: Fix N+1 queries + duplicate resolver ✅
- Fixed `assignedTo` property resolver: changed fire-and-forget `obj.populate()` → `await obj.populate()`
- Added `populated()` check before repopulating (avoids redundant queries)
- Same fix for `createdBy` property
- Removed duplicate `@query("ReactoryMySupportTickets")` — kept `myTickets`, removed `userTickets`

#### Issue #7: Implement actual delete functionality ✅
- Implemented `deleteRequest` using `updateMany()` for soft-delete
- Sets `status: 'closed'` and records metadata: `deletedAt`, `deletedBy`, `deleteReason`
- Logs the deletion with count of affected documents
- Early return if no IDs provided

#### Issue #8: Align GraphQL mutation names ✅
- Added `ReactorySupportTicketComment` (simple args) — matches widget at line 168
- Kept `ReactoryAddSupportTicketComment` (nested input with parentId/attachments) — extended version
- Added `ReactorySupportTicketDelete` (simple `{ ids: string[] }`) — matches widget at line 192
- Kept `ReactoryDeleteSupportTicket` (wrapped `deleteInput`) — v2 for future use

#### Issue #10: Admin UI Schema typed as `any` ✅
- Changed `const uiSchema: any` → `const uiSchema: Reactory.Schema.IFormUISchema`
- Enables type safety for future edits
