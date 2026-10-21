# Test plan — validateDemographicValue (ORG-003)

Companion to `validateDemographicValue.test.ts`. The helper is pure (no database, no
network), so every rule is exercised with plain definition objects.

## Contract under test

`validateDemographicValue(definition, value) => { valid, errors: [{ path, message }] }`

Rules, in evaluation order:

1. definition required
2. `required` — null/undefined rejected
3. `multiValued` — array required when true; array rejected when false, except for
   `valueType: 'array'` and `reference.multiple: true`, whose single value *is* an array
4. per-type shape checks (`string`, `number`, `boolean`, `date`, `object`, `array`)
5. enum / multi-enum membership against `options[].key` (deprecated options stay valid)
6. `reference` — id shape only (24-hex string, ObjectId-like, or `{_id}`), never a lookup
7. `schema` — ajv (with ajv-formats) when present; invalid schemas are reported, not thrown

## Cases

| Area | Cases |
|------|-------|
| Guard | null/undefined definition → error with empty path |
| Cardinality | multi-valued accepts an array; rejects a scalar; single-valued rejects an array; `valueType: 'array'` accepts an array; item errors carry `[index]` paths |
| Required | null/undefined rejected when required; allowed when optional |
| Types | matching and mismatching values per type; unsupported value type reported at `valueType` |
| Enum | valid option; deprecated option still valid; unknown option lists the allowed keys; enum without options reported at `options`; multi-enum validates each item |
| JSON Schema | valid object; missing required property path `city`; type mismatch; `additionalProperties` path `foo`; per-item validation for multi-valued (`[1].city`); schema applied to non-object types (pattern); `format: email` via ajv-formats; invalid schema reported at `schema` |
| Reference | hex id; ObjectId instance; `{_id}` document; bad shape; array rejected for single; array accepted/checked for `multiple: true`; missing/unsupported model reported at `reference.model`; `isDemographicReferenceId` helper |
| Hydrated definition documents | `Model.hydrate()` with and without a JSON Schema; `new Model()` straight in; hydrated enum options; hydrated schema pass and fail paths returning field-level `city`; Schema-like non-serialisable `schema` and a circular schema both reported at `schema` instead of throwing |

### Why the hydrated-document cases exist (review defect RC-1)

`DemographicDefinition` keeps the JSON Schema in a path named `schema` and restores
Mongoose's `Document#schema` accessor on the prototype. On a hydrated document
`definition.schema` is therefore the **compiled Mongoose Schema**, so the validator must read
the JSON Schema through `doc.get('schema')` (see `readDefinitionPath`). Before the fix every
hydrated definition threw `TypeError: Converting circular structure to JSON --> starting at
object with constructor 'DocumentArrayPath'` from the schema cache key, including definitions
that declared no schema at all. The hydrated cases pin that contract, and the Schema-like and
circular cases pin the hardened cache-key path.

## Commands

```bash
./bin/jest.sh reactory local 'Demographic'
npm run typecheck
```
