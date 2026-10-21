/**
 * Which `core.ProcessAITicket` version should a UI launcher start?
 *
 * Kept in one place because the answer was previously duplicated (and drifted)
 * between a hardcoded constant and the mutation's own fallback. Both are gone:
 * the widgets resolve the answer here, from the workflow registry, and the
 * caller is expected to show the resolved id before launching.
 *
 * Why "newest registered" is the right rule
 * -----------------------------------------
 * The registry keeps every version that was ever registered so historical
 * instances can still be inspected. A launch therefore has to make an explicit
 * choice, and the newest definition is the one the codebase ships. Anything
 * that addresses the workflow by name has to apply the same rule - the runner
 * does (see `selectWorkflowByName`), and so does this module.
 */

export const WORKFLOW_NAME_SPACE = 'core';
export const WORKFLOW_NAME = 'ProcessAITicket';

/** Minimal shape of a row returned by the `workflows` GraphQL query. */
export interface IRegisteredWorkflowRow {
  id?: string;
  nameSpace?: string;
  name?: string;
  version?: string;
}

/**
 * Compare two workflow versions numerically, segment by segment.
 *
 * Versions here are dotted numeric triples ('1.4.3'). A string comparison sorts
 * '1.10.0' BELOW '1.9.0', which would make a minor bump look like a downgrade.
 * Missing segments count as 0 and a non-numeric suffix is ignored.
 *
 * Returns a positive number when `a` is newer than `b`.
 */
export const compareVersions = (a: string, b: string): number => {
  const parse = (value: string): number[] => String(value || '0')
    .trim()
    .split('.')
    .map((segment) => parseInt(segment, 10) || 0);
  const left = parse(a);
  const right = parse(b);
  const length = Math.max(left.length, right.length, 3);
  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] || 0) - (right[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

/**
 * Distinct registered versions of the pipeline, newest first.
 *
 * The registry list returns one row per registration, so the same version can
 * appear several times (every server restart re-registers it). De-duplicating
 * means the "latest" decision is taken over distinct versions rather than over
 * however many times each one happened to be registered. Rows without a version
 * are ignored: they cannot be addressed as a workflow id.
 */
export const registeredWorkflowVersions = (rows: IRegisteredWorkflowRow[]): string[] => {
  const seen: Record<string, boolean> = {};
  const versions: string[] = [];
  (rows || []).forEach((row) => {
    if (!row || row.nameSpace !== WORKFLOW_NAME_SPACE || row.name !== WORKFLOW_NAME) return;
    const version = String(row.version || '').trim();
    if (!version || seen[version]) return;
    seen[version] = true;
    versions.push(version);
  });
  return versions.sort((a, b) => compareVersions(b, a));
};

/** Newest registered version of the pipeline, or null when none is registered. */
export const pickLatestWorkflowId = (rows: IRegisteredWorkflowRow[]): string | null => {
  const versions = registeredWorkflowVersions(rows);
  if (versions.length === 0) return null;
  return `${WORKFLOW_NAME_SPACE}.${WORKFLOW_NAME}@${versions[0]}`;
};

/** The id a launcher must NOT use, given the resolved id - for the UI hint. */
export const olderWorkflowVersions = (rows: IRegisteredWorkflowRow[], resolvedWorkflowId?: string): string[] =>
  registeredWorkflowVersions(rows).filter(
    (version) => `${WORKFLOW_NAME_SPACE}.${WORKFLOW_NAME}@${version}` !== String(resolvedWorkflowId || ''),
  );
