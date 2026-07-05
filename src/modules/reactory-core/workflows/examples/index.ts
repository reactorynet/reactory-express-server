/**
 * Example / smoke-test YAML workflows.
 *
 * Each file is loaded via loadYamlWorkflow (which provisions it into the
 * $REACTORY_DATA workflow catalog and parses it) and registered as a workflow
 * under the `reactory-examples` namespace. Run any of them on a live server with
 * the GraphQL `startWorkflow` mutation using id `reactory-examples.<Name>@1.0.0`.
 *
 * Sample files are named `<Name>.yaml` (matching the workflow name) so the
 * catalog filename is canonical and consistent with what the designer saves.
 *
 * The first group are self-contained engine/control-flow smoke tests (no
 * external services). The remainder exercise integration steps and require the
 * relevant service/connection — see each file's header.
 */

import Reactory from '@reactorynet/reactory-core';
import { loadYamlWorkflow } from '@reactory/server-modules/reactory-core/workflow/YamlFlow/YamlToWorkflow';

const NS = 'reactory-examples';
const VERSION = '1.0.0';

const EXAMPLE_NAMES: string[] = [
  // Engine / control-flow (no external dependencies)
  'EngineHello',
  'Variables',
  'Condition',
  'ForEach',
  'While',
  'Parallel',
  'Delay',
  'Todo',
  'Telemetry',
  'Custom',
  'FileRoundTrip',
  'Validation',
  'Saga',
  'CollectAgentContext',
  // Integration steps (require the relevant service / connection)
  'ApiCall',
  'ServiceInvoke',
  'MongoQuery',
  'UserLookup',
  'GraphQLQuery',
  'WaitEvent',
  'AgentConversation',
  'AgentResearch',
  'WeeklyWeatherForecast',
  'Postgres',
  'Email',
  'Search',
];

const exampleWorkflows: Reactory.Workflow.IWorkflow[] = EXAMPLE_NAMES
  .map((name) => loadYamlWorkflow(NS, name, `${name}.yaml`, VERSION, __dirname))
  .filter((w): w is Reactory.Workflow.IWorkflow => w !== null);

export default exampleWorkflows;
