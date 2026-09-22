# Generic form submission pipeline

Before this pipeline, a Reactory form that wanted to store what a user typed had
to ship a GraphQL definition: a mutation, a resolver, a service and somewhere to
put the data. That is the right shape for a form that feeds a real domain model,
and the wrong shape for the long tail of forms — a contact form, a survey, an
RSVP, a feedback panel — whose only requirement is *keep what was submitted, and
let someone look at it later*.

A form joins the pipeline by declaring one block. No mutation, no resolver, no
table.

```ts
const ContactForm: Reactory.Forms.IReactoryForm = {
  id: 'contact.Form@1.0.0',
  nameSpace: 'contact',
  name: 'Form',
  version: '1.0.0',
  schema,
  uiSchema,
  submission: {
    enabled: true,
    allowAnonymous: true,
    readRoles: ['ADMIN'],
    successMessage: 'Thank you, we will be in touch shortly',
  },
};
```

A complete worked example lives in
`src/modules/reactory-core/forms/Samples/ContactForm.ts`. Like everything else
in `Samples/`, it is not registered in `forms/index.ts` — add it there to see the
pipeline run end to end.

## How a submission travels

1. **Resolution.** `ReactoryFormService.get()` (and `list()`) run every form
   through `applySubmissionPipeline`. A form with `submission.enabled === true`
   gets the generic `ReactoryFormSubmit` mutation merged into its
   `graphql.mutation.new` and `.edit`, and its `submission` block replaced with
   the resolved one (defaults applied). A mutation the form declares itself is
   never overwritten — the pipeline fills gaps only.
2. **Submit.** The client's existing `useGraphQLDataManager` sees a mutation
   where there was none and submits through it. The variable map pulls the fqn
   off `form.id`, so the form definition never repeats its own name.
3. **Storage.** `ReactoryFormSubmissionResolver` hands the call to
   `ReactoryFormSubmissionService`, which checks permissions and the rate limit
   and writes a `reactory_form_submission` row: fqn, clientKey, userId (null
   when anonymous), formData as JSONB, ipAddress, createdAt, updatedAt.
4. **Explore.** `core.ReactoryFormSubmissions@1.0.0` — itself a Reactory form —
   reads the rows back. It is reached from the form list's card action and
   context menu, at `/<forms route>/<formId>/submissions`.

## Opt in is always explicit

`submission.enabled` must be the boolean `true`. Not `"true"`, not truthy,
not "the form has no mutation, so it probably wants one". A form that has not
opted in can never write a submission row, which is what keeps the existing
several hundred mutation-less forms in the codebase from silently starting to
persist data.

## Permissions

| Setting | Default | Governs |
|---|---|---|
| `allowAnonymous` | `false` | Whether a caller holding only `ANON` may submit |
| `submitRoles` | the form's own `roles`, else `['USER']` | Who may submit when signed in |
| `readRoles` | `['ADMIN']` | Who may open the explorer and read submissions |
| `deleteRoles` | `readRoles` | Who may delete a submission |
| `allowUpdate` | `false` | Whether a submitter may amend their own submission |
| `rateLimit` | 20/minute when anonymous, otherwise none | Per address / per user submit budget |

`ReactoryFormSubmit` carries no `@roles` decorator, because the roles that may
call it are declared per form rather than per resolver, and an anonymous caller
is legitimate for a form that asked for one. The service enforces the rules
before touching the table, and `resolveSubmissionConfig` is shared between the
service and the form service so the roles the UI is told about and the roles the
database checks cannot drift apart.

A submission also carries the `clientKey` of the ReactoryClient it was captured
under, and every read is filtered by it. Reactory serves multiple clients from
one server and forms are shared across them, so without that partition an
administrator of one client would read another client's submissions.

## Querying the data

Three filters compose, all applied in the database:

- **Dates** — `from` / `to` against `created_at`.
- **User** — `userId`, or `anonymous: true|false`.
- **Content** — `search` for a case insensitive substring anywhere in the
  document, and `query` for a structured predicate.

The structured predicate is a small declarative DSL compiled into JSONB
operators by `SubmissionFilter.ts`:

```json
{
  "and": [
    { "path": "country", "op": "eq",       "value": "ZA" },
    { "path": "score",   "op": "gte",      "value": 80, "valueType": "number" },
    { "path": "notes",   "op": "contains", "value": "urgent" }
  ]
}
```

A predicate is `{ path, op, value, valueType }`. Paths address the document
(`address.country`, `lines[0].sku`). Groups are `and`, `or` and `not`, and
nest. Operators: `eq ne gt gte lt lte contains startsWith endsWith in nin exists
isNull between`. `valueType` is `string` (default), `number`, `boolean` or
`date`.

Two properties of the compiler are worth knowing:

- **Nothing the caller supplies reaches the statement text.** Paths are bound as
  `text[]` parameters consumed by `#>` / `#>>`, so a field name containing
  quotes, braces or commas is data, not syntax.
- **A numeric comparison cannot abort the query.** Documents are schema-less, so
  a path may hold a string in one row and a number in the next. The compiler
  emits a regex guarded `CASE` that yields `NULL` — and therefore a non-match —
  rather than `invalid input syntax for type numeric`.

Filters are budgeted at 64 conditions and 8 levels of nesting.

`created_at` and the JSONB document are indexed (the GIN index is created in
`models/index.ts` during schema sync, because TypeORM's decorators cannot
express one).

## Files

| File | Role |
|---|---|
| `models/ReactoryFormSubmission.ts` | The entity |
| `types/FormSubmission.ts` | Config, filter and result types |
| `services/FormSubmission/SubmissionConfig.ts` | Config resolution + mutation injection |
| `services/FormSubmission/SubmissionFilter.ts` | The filter DSL compiler |
| `services/FormSubmission/FormSubmissionService.ts` | Storage, permissions, queries |
| `resolvers/ReactoryForm/ReactoryFormSubmissionResolver.ts` | GraphQL transport |
| `graph/types/Forms/FormSubmission.graphql` | Schema |
| `forms/FormSubmissions/` | The explorer form |
| `forms/Samples/ContactForm.ts` | Worked example (not registered) |

On the client: `components/shared/FormSubmissions/` holds the three components
the explorer registers (`core.ReactoryFormSubmissionSummary@1.0.0`,
`…Detail@1.0.0`, `…QueryBuilder@1.0.0`), and `components/shared/FormList`
offers the explorer where `submission.canExplore` is true.
