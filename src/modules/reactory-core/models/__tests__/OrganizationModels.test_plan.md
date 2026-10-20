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
