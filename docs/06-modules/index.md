# Module documentation

Narrative documentation for Reactory modules, one directory per module. Every page
follows the 10-section template: purpose and status, module contract, data model,
GraphQL API, services, UI surface, workflows, operations, limitations and roadmap,
evidence index.

| Module | FQN | Status | Page |
|---|---|---|---|
| `reactory-queue` | `reactory.Queue@1.0.0` | Partial | [overview](./reactory-queue/overview.md) · [migration](./reactory-queue/migration.md) |

## Where the facts live

- **Module registry** — which modules exist, are enabled and are installed — is
  authoritative in the code, not in this table:
  `src/modules/available.json`, `src/modules/enabled-reactory.json`,
  `src/modules/installed.json`.
- **Generated reference** (GraphQL schema, service catalogue, workflow steps,
  widgets, macros, environment variables) is derived from code. Do not hand-edit
  it.
- **Narrative and limitations** live in each module's page.
- **Build, test and contribute** instructions live in the module repository's
  `README.md`.

Do not copy module counts, provider counts or version numbers into prose. Reference
the registry or the generated reference instead.
