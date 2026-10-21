# Test plan — ORG-001 organization domain models

**Ticket:** ORG-001 Register and extend organization domain models
**Test file:** `src/modules/reactory-core/models/__tests__/OrganizationModels.test.ts`

## Scope

Schema/registry-only changes. No service, resolver or GraphQL behaviour is
exercised here (explicitly out of scope for ORG-001).

## What is covered

| # | Case | Assertion |
|---|---|---|
| 1 | `Organization` round-trip | Every identity, lifecycle, branding and audit field added by ORG-001 survives `new Organization(...)` → `toObject()` → re-hydration |
| 2 | `Organization` defaults | `status = active`, `deleted = false`, `themeMode = dark` for documents that do not specify them (existing documents keep loading) |
| 3 | `Organization` enum validation | An invalid `status` fails validation on the `status` path |
| 4 | `Organization` indexes | `name`, `code`, `status`, `deleted` single-field indexes and the `{ 'clients.active': 1, code: 1 }` compound index are declared; the compound index is *not* unique |
| 5 | `Team` round-trip | `description`, `avatar` and `businessUnit` are stored/read back; `name` still defaults from `title`; `organization`, `owner` and `members` are retained |
| 6 | `Team` indexes | `organization`, `businessUnit` and `deleted` indexes are declared |
| 7 | `BusinessUnit` round-trip | `createdBy` / `updatedBy` round-trip; existing `deleted` and `owner` are retained |
| 8 | `BusinessUnit` indexes | Compound `{ organization: 1, deleted: 1 }` index is declared |
| 9 | Demographics registration | `Demographic`, `AgeDemographic` and `OrganizationDemographicSettings` are exported from `models/index.ts` and present in `ModelDefinitions` with the expected `stem` and component |
| 10 | Demographic indexes | Compound unique `{ organization, type, key }` + `{ deleted: 1 }` on `Demographic`; unique `{ organization: 1 }` on `OrganizationDemographicSettings` |
| 11 | Legacy documents | A document shaped like the pre-ORG-001 schema (no status/theme/audit fields) validates without error |

## Out of scope

- Persisting to a live MongoDB — the assertions use Mongoose document
  construction/serialisation only, so the suite stays in the unit pass.
- `Organization.settings` behaviour (ORG-002), demographic definitions/values
  (ORG-003), theme mutations (ORG-004) and service/resolver changes (ORG-005).

## Verification

```bash
./bin/jest.sh reactory local 'src/modules/reactory-core/models/__tests__/*.test.ts'
npx tsc --noEmit   # no NEW errors in touched files (repo has a pre-existing ratchet baseline)
```

---

## ORG-002 — `Organization.setSetting` first write, update and second add

### Defect

`setSetting` returned `null` whenever `this.settings` was empty, so the first
setting could never be persisted. The index handling was also unsafe:
`_idx` started as `null` (and `null >= 0` is `true` in JavaScript), while
`Array#push` returns the *new length* rather than the index.

### Behaviour to lock down

1. First call on an empty/missing `settings` array persists and is readable via
   `getSetting`.
2. A second call for the same name updates in place (no duplicate entries).
3. A call for a new name appends while preserving the first.
4. Omitting `componentFqn` on update retains the stored component.
5. The stored subdocument is returned so callers can use it immediately.

### Test cases (`OrganizationModels.test.ts`)

- `writes the first setting when settings is empty`
- `writes the first setting when the settings path is unset`
- `updates an existing setting instead of appending a duplicate`
- `retains the existing componentFqn when the update omits one`
- `adds a second setting while keeping the first`
- `returns the stored subdocument so callers can read it back immediately`

In-memory mongoose documents only; no database is required.

## Verification

```bash
./bin/jest.sh reactory local 'OrganizationModels'
npm run typecheck   # ratchet gate, must end with "No new type errors."
```