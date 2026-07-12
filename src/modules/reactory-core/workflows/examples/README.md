# YAML Workflow Examples & Engine Smoke Tests

Small example workflows — one per step type — used to verify the YAML workflow
engine end to end. They are registered under the **`reactory-examples`** namespace
and run on the durable workflow‑es engine via the YAML→engine bridge.

## How they're registered

Each `.yaml` file here is loaded by `./index.ts` (via `loadYamlWorkflow`) and
added to the core module's `workflows`. On server start they're provisioned into
the `$REACTORY_DATA/workflows/catalog/` tree and registered with the workflow
host. Their workflow id is `reactory-examples.<Name>@1.0.0`.

## Running an example (live server)

Use the GraphQL `startWorkflow` mutation:

```graphql
mutation StartWorkflow($workflowId: String!, $input: WorkflowExecutionInput) {
  startWorkflow(workflowId: $workflowId, input: $input) {
    id
    status
  }
}
```

```jsonc
// variables — no-input example:
{ "workflowId": "reactory-examples.EngineHello@1.0.0" }

// variables — example with inputs (payload goes under input.input):
{ "workflowId": "reactory-examples.UserLookup@1.0.0", "input": { "input": { "email": "user@example.com" } } }
```

Workflow `${input.X}` references resolve from the `input.input` payload.
Execution is **asynchronous and durable** (like code workflows): the mutation
returns an instance id immediately; the workflow runs in the background and is
persisted by the engine. Inspect progress/history via the workflow history
queries or the persistence store.

## Catalog

Each file is named `<Name>.yaml` and registered as id `reactory-examples.<Name>@1.0.0`.

| File | Step(s) | Requires |
|---|---|---|
| EngineHello.yaml | start, log, end | — |
| Variables.yaml | set_variable | — |
| Condition.yaml | condition | — |
| ForEach.yaml | for_each, log | — |
| While.yaml | while, set_variable | — |
| Parallel.yaml | parallel, set_variable | — |
| Delay.yaml | delay | — |
| Todo.yaml | todo | — |
| Telemetry.yaml | telemetry | — |
| Custom.yaml | custom | — |
| FileRoundTrip.yaml | file_operation | write access to `/tmp` |
| Validation.yaml | validation | — |
| Saga.yaml | saga | — |
| ApiCall.yaml | api_call | outbound network |
| ServiceInvoke.yaml | service_invoke | the named service registered |
| MongoQuery.yaml | mongo_query | MongoDB connection |
| UserLookup.yaml | user_lookup | a matching user |
| GraphQLQuery.yaml | graphql_query | Reactory GraphQL endpoint |
| WaitEvent.yaml | wait_event, log | an external event (see below) |
| AgentConversation.yaml | agent_conversation, set_variable | reactor AI stack + a persona |
| AgentResearch.yaml | agent_conversation (multi-turn resume), set_variable, log | reactor AI stack + a persona |
| WeeklyWeatherForecast.yaml | api_call ×2, agent_conversation, file_operation, log | network (Open-Meteo) + reactor AI stack |
| Postgres.yaml | postgres | a Postgres connection |
| Email.yaml | email | configured email transport |
| Search.yaml | search | MeiliSearch + an index |
| CollectAgentContext.yaml | cli_command, file_operation, set_variable, log | filesystem read access under the provided root |

The first 13 examples (EngineHello … Saga) are self‑contained (no external
services) and are the core engine/control‑flow smoke tests. The rest exercise
integration steps and require the relevant service/connection.

**End‑to‑end showcase:** `WeeklyWeatherForecast.yaml` chains several steps into a
real task — geocode a city and fetch its 7‑day forecast from Open‑Meteo (free, no
API key), hand the raw JSON to an AI agent to write a markdown forecast, then save
that markdown to disk. It demonstrates passing one step's output into the next
(`${steps.<id>.<path>}`, including the raw API response body), using an
`agent_conversation` to transform data, and persisting the result via
`file_operation`.

## Verifying without a server

`__tests__/examples.smoke.test.ts` parses, builds, and runs every no‑infra
example (EngineHello … Saga) on an in‑memory host, asserting completion — plus a
guard that all examples pass schema validation (so they stay loadable):

```
npx jest src/modules/reactory-core/workflows/examples
```

## Notes per step

- **Expression scope** (conditions, foreach items, event keys): `input`,
  `inputs`, `variables`, `env`, `steps` (`{<stepId>: <outputs>}`), `stepResults`,
  `workflow`. Example: `variables.n > 3`, `steps.fetch.outputs.items`.
- **Templates** in strings use `${...}`: `${input.email}`, `${variables.x}`,
  `${steps.<id>.<path>}`, `${currentItem}` (foreach item variable).
- **WaitEvent**: the workflow suspends until a matching event is published:
  `host.publishEvent("approval", "<requestId>", { approved: true }, new Date())`.
- **AgentConversation**: creates a conversation with `instructions` + auto tool
  approval, sends `message`, and returns `{ sessionId, content }`. Persist
  `sessionId` (as the example does) so an engine retry resumes the conversation.
- **SQL placeholders**: MySQL `?`, Postgres `$1..$n`, MSSQL `@p0..@pn`.
- **env**: `${env.X}` is not populated under the engine by default — pass values
  as workflow inputs or via a connection object instead.
