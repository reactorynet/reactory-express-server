# Test plan — DemographicDefinition / DemographicValue models (ORG-003)

Companion to `DemographicModels.test.ts`. Model/schema ticket: no database is required
for the unit pass. Round-trips assert Mongoose construction, casting, defaults and
serialisation; index assertions read `schema.indexes()`.

## Scope under test

- `models/demographics/DemographicDefinition.ts` → `reactory_demographic_definitions`
- `models/demographics/DemographicValue.ts` → `reactory_demographic_values`
- Registration in `models/index.ts` (`ModelDefinitions`, exports, `CoreModelTypes`)
- `@deprecated` markers on `Demographic`, `AgeDemographic`, `OrganizationDemographicsSettings`

## Cases

| # | Case | Asserts |
|---|------|---------|
| 1 | Definition round-trip | every field survives `new Model()` → `toObject()` → re-hydration: organization, key (slug-normalised), title, description, icon, category, valueType, schema, options[], reference, widget, required, multiValued, sensitive, searchable, enabled, ordinal, roles, system, deleted, createdBy/updatedBy, createdAt/updatedAt |
| 2 | Definition defaults | `organization` null (global template), category `personal`, enabled `true`, ordinal `0`, roles `[]`, all boolean flags `false`, `deleted` `false` |
| 3 | Null/absent organization | a `null` organization validates (global template); an omitted one defaults to `null` |
| 4 | Definition validation | missing key/title/valueType rejected; invalid category, valueType and reference model rejected with the offending path in the message |
| 5 | Reserved `schema` path | `get('schema')`/`set('schema')` round-trip; `doc.schema` still resolves to the compiled schema (needed by Mongoose internals) on construction and hydration |
| 6 | Definition indexes | unique `{organization:1,key:1}`; `{organization:1,deleted:1}` |
| 7 | Value round-trip | organization, user, membership, definition, key snapshot (slug-normalised), array value, valueType snapshot, source, verified, effectiveFrom/effectiveTo, updatedBy |
| 8 | Value defaults | membership null, source `user`, verified `false`, effective dates null |
| 9 | Value validation | organization, user, definition and key required; invalid source/valueType rejected |
| 10 | Value indexes | unique `{organization:1,definition:1,user:1}`; `{organization:1,definition:1,value:1}`; `{organization:1,user:1}` |
| 11 | Vocabularies | categories, value types, reference models and value sources match the ticket/spec |
| 12 | Registry | both models registered in `ModelDefinitions` with namespace `core`, correct stems/tags/component; collection names match the ticket |
| 13 | Legacy models | all three remain registered; their schemas still contain every original path; their sources carry `@deprecated` and point at the new models |

## Deliberate non-cases

- No live MongoDB: the unique constraints are declared index metadata; a DB-level
  duplicate-key assertion belongs in the integration pass (see `test/integrationSuites.js`).
- No GraphQL/service behaviour: resolvers and `DemographicsService` are ORG-031/ORG-034.
- Legacy schema shape is asserted, not changed — ORG-003 deprecates but must not migrate.

## Commands

```bash
./bin/jest.sh reactory local 'Demographic'
npm run typecheck
```
