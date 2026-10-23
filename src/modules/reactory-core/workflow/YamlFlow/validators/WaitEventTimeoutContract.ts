/**
 * wait_event timeout contract — the single source of truth for REJECTING a
 * `timeout` on a `wait_event` step (REACTORY-302016408).
 *
 * ── Why a `timeout` cannot work on wait_event ────────────────────────────────
 * A `wait_event` step suspends by handing the engine an effective date
 * (`ExecutionResult.waitForEvent(eventName, eventKey, effectiveDate)`). The
 * MongoDB persistence provider turns that into `subscriptions.subscribeAsOf`,
 * which the event queue matches as `subscribeAsOf <= event.eventTime` — a LOWER
 * BOUND on when the event was published, NOT a deadline for the wait. There is
 * no timer: `determineNextExecutionTime` only schedules from `pointer.sleepUntil`
 * on *active* pointers, and an event-wait pointer is `active = false`. The queue
 * worker then loops the matched subscriptions and calls `markEventProcessed()`
 * on the event unconditionally.
 *
 * So a `timeout` of T used to set the watermark to `now + T`, which made the
 * subscription DEAF for T milliseconds: an event published inside that window
 * matched no subscription, was marked processed, and was lost permanently. After
 * the window the wait simply continued forever. The value never behaved as an
 * expiry, and the failure mode was silent signal loss — strictly worse than no
 * timeout at all.
 *
 * ── The supported alternative (named in the rejection message) ───────────────
 * Expiry must be DELIVERED AS AN EVENT — the same rule the sibling suspension
 * path already follows (`YamlStepBody.ts`, `control.waitForEvent`, which always
 * passes `new Date()`). Publish a sentinel event at the deadline on the SAME
 * `eventName`/`eventKey` (e.g. payload `{ timedOut: true }`); the engine resumes
 * the step normally and the workflow branches on the payload. Implementing a
 * real timeout needs a sweeper over `WaitingForEvent` pointers, which is a
 * separate piece of work (the continuation feature) and is deliberately NOT
 * attempted here.
 *
 * ── Why this module ─────────────────────────────────────────────────────────
 * The rejection has to happen on three different paths — the builder (definition
 * load / registration), the durable executor's pre-flight `validateWorkflow()`
 * (what the designer's `yamlValidationErrors` resolver calls) and the standalone
 * YAML validator (`parseAndValidate`) — and all of them must say exactly the same
 * thing. Hence: one message builder, one walker, no imports.
 */

/** Stable error code so callers/GraphQL clients can branch on the rejection. */
export const WAIT_EVENT_TIMEOUT_CODE = 'WAIT_EVENT_TIMEOUT_UNSUPPORTED';

/** A `wait_event` step that declares a `timeout` anywhere it would be read. */
export interface WaitEventTimeoutViolation {
  /** The YAML step id (e.g. `awaitApproval`). */
  stepId: string;
  /** The event name the step waits on, used to make the message actionable. */
  eventName: string;
  /** The offending property name, as authored (`timeout`). */
  field: string;
  /** Dotted/indexed path to the offending property, e.g. `steps[awaitApproval].config.timeout`. */
  path: string;
}

/** Config keys that hold a nested step list inside a structural step's config. */
const NESTED_CONFIG_STEP_KEYS = [
  'thenSteps',
  'elseSteps',
  'steps',
  'compensate',
  'compensateSteps',
];

/** Parse a JSON-string config/inputs value; anything unparseable yields null. */
function parseJsonObject(value: any): Record<string, any> | null {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
  return value && typeof value === 'object' ? value : null;
}

/**
 * Where the `timeout` will actually be read from, or null when there is none.
 *
 * Mirrors the precedence both resolvers use (`resolveStepConfig`): `config` wins
 * over `inputs`, and `inputs` may be a JSON string (the designer stores it that
 * way). A top-level `step.timeout` is also rejected: it is schema-valid, but on a
 * suspending step it can never fire — accepting it would just be a second way to
 * silently ignore the author's intent. `null` means "no timeout" and is allowed.
 */
function locateTimeout(step: any, stepPath: string): { field: string; path: string } | null {
  const config = parseJsonObject(step.config);
  if (config && config.timeout != null) {
    return { field: 'timeout', path: `${stepPath}.config.timeout` };
  }

  const inputs = parseJsonObject(step.inputs);
  if (inputs && inputs.timeout != null) {
    return { field: 'timeout', path: `${stepPath}.inputs.timeout` };
  }

  if (step.timeout != null) {
    return { field: 'timeout', path: `${stepPath}.timeout` };
  }

  return null;
}

/**
 * Recursively collect every `wait_event` step that declares a `timeout`,
 * descending into the nested scopes the builder interprets structurally
 * (condition then/else, for_each/while/saga bodies, parallel branches and saga
 * compensation). Nested steps matter: a timeout inside a `for_each` body is just
 * as deaf as a top-level one.
 */
export function findWaitEventTimeoutViolations(
  steps: any,
  basePath = 'steps',
): WaitEventTimeoutViolation[] {
  const violations: WaitEventTimeoutViolation[] = [];
  const list = Array.isArray(steps) ? steps : [];

  list.forEach((step, index) => {
    if (!step || typeof step !== 'object') return;
    const stepPath = `${basePath}[${step.id ?? index}]`;

    if (step.type === 'wait_event') {
      const config = parseJsonObject(step.config) || {};
      const inputs = parseJsonObject(step.inputs) || {};
      const eventName = String(
        config.eventName ?? config.event ?? inputs.eventName ?? inputs.event ?? step.id ?? '',
      );
      const located = locateTimeout(step, stepPath);
      if (located) {
        violations.push({
          stepId: String(step.id ?? stepPath),
          eventName,
          field: located.field,
          path: located.path,
        });
      }
    }

    // Descend into nested step scopes. `step.steps` is tolerated for definitions
    // authored slightly off-spec; the config keys are the documented shapes.
    const nestedLists: any[] = [step.steps];
    const stepConfig = parseJsonObject(step.config);
    if (stepConfig) {
      for (const key of NESTED_CONFIG_STEP_KEYS) nestedLists.push(stepConfig[key]);
      if (Array.isArray(stepConfig.branches)) {
        for (const branch of stepConfig.branches) {
          if (branch) nestedLists.push(branch.steps);
        }
      }
    }
    for (const nested of nestedLists) {
      if (Array.isArray(nested) && nested.length > 0) {
        violations.push(...findWaitEventTimeoutViolations(nested, `${stepPath}.steps`));
      }
    }
  });

  return violations;
}

/**
 * The canonical rejection text. Names the sentinel-event alternative and the
 * exact `eventName` the sentinel must be published on, so an author can act on
 * it without reading the engine source.
 */
export function waitEventTimeoutMessage(violation: WaitEventTimeoutViolation): string {
  const eventLabel = violation.eventName ? `'${violation.eventName}'` : 'the same';
  return (
    `Step '${violation.stepId}' (wait_event) sets '${violation.field}' at ${violation.path}: ` +
    `'${violation.field}' is not supported on wait_event and is rejected rather than ignored. ` +
    'A wait_event cannot expire itself — the engine matches a subscription only for events ' +
    'published at or after the subscription was created, so a timeout would make the wait ' +
    'ignore every event published before the deadline and then wait forever: the signal is ' +
    `discarded, not delayed. Remove '${violation.field}' and, if the wait must expire, publish ` +
    `a sentinel event at the deadline on the same eventName (${eventLabel}) and eventKey, then ` +
    'branch on its payload (e.g. { timedOut: true }).'
  );
}

/**
 * Throw when any `wait_event` step (at any nesting depth) declares a `timeout`.
 * Called eagerly by `buildYamlWorkflowClass` so a bad definition fails at load /
 * registration — before a single instance is created — with the same message the
 * validators report.
 */
export function assertNoWaitEventTimeouts(steps: any, definitionLabel?: string): void {
  const violations = findWaitEventTimeoutViolations(steps);
  if (violations.length === 0) return;

  const scope = definitionLabel ? ` in workflow '${definitionLabel}'` : '';
  const detail = violations.map(waitEventTimeoutMessage).join(' | ');
  throw new Error(
    violations.length === 1
      ? `${WAIT_EVENT_TIMEOUT_CODE}: invalid wait_event step${scope}. ${detail}`
      : `${WAIT_EVENT_TIMEOUT_CODE}: ${violations.length} invalid wait_event steps${scope}. ${detail}`,
  );
}
