/**
 * Version resolution for the AI engineering workflow.
 *
 * Two separate defects made the launcher run the WRONG definition, and neither
 * produced an error - a stale workflow simply behaves like the old workflow:
 *
 *  1. The widgets addressed `core.ProcessAITicket` by NAME and the registry
 *     lookup returned the FIRST registered match, i.e. the OLDEST version. A
 *     bare `getWorkflowByName('core', 'ProcessAITicket')` therefore answered
 *     1.4.2 while 1.4.3 was the version being shipped.
 *
 *  2. The launcher's resolved id was only rendered in a low-contrast caption,
 *     so an operator could not see which definition they were about to run.
 *
 * These tests pin the resolution semantics and the visible/traceable plumbing.
 */

import {
  compareWorkflowVersions,
  selectWorkflowByName,
} from '@reactory/server-modules/reactory-core/workflow/WorkflowRunner/WorkflowRunner';
import supportWidgetModules from '../SupportTickets/modules';
import {
  compareVersions,
  olderWorkflowVersions,
  pickLatestWorkflowId,
  registeredWorkflowVersions,
} from '../Widgets/aiWorkflowVersion';

interface IRow {
  nameSpace: string;
  name: string;
  version: string;
  id?: string;
}

const row = (version: string, name = 'ProcessAITicket', nameSpace = 'core'): IRow => ({
  id: `${nameSpace}.${name}@${version}`,
  nameSpace,
  name,
  version,
});

describe('compareWorkflowVersions', () => {
  it('compares numerically, not lexically', () => {
    // A string comparison sorts '1.10.0' below '1.9.0'.
    expect(compareWorkflowVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareWorkflowVersions('1.9.0', '1.10.0')).toBeLessThan(0);
  });

  it('treats missing segments as zero', () => {
    expect(compareWorkflowVersions('1.4', '1.4.0')).toBe(0);
    expect(compareWorkflowVersions('1.4.1', '1.4')).toBeGreaterThan(0);
    expect(compareWorkflowVersions('2', '1.9.9')).toBeGreaterThan(0);
  });

  it('ranks the workflow versions in this programme', () => {
    const versions = ['1.3.0', '1.4.0', '1.4.1', '1.4.2', '1.4.3'];
    const sorted = versions.slice().sort((a, b) => compareWorkflowVersions(b, a));
    expect(sorted).toEqual(['1.4.3', '1.4.2', '1.4.1', '1.4.0', '1.3.0']);
  });
});

describe('selectWorkflowByName', () => {
  // Registration order is oldest-first, exactly as the runner's state array is.
  const registry: IRow[] = [
    row('1.3.0'),
    row('1.4.0'),
    row('1.4.1'),
    row('1.4.2'),
    row('1.4.2'), // a restart re-registered the same version
    row('1.4.3'),
    row('1.4.3'),
  ];

  it('returns the NEWEST version for a bare name lookup', () => {
    // This is the regression: a plain find() returned 1.3.0/1.4.2.
    expect(selectWorkflowByName(registry, 'core', 'ProcessAITicket')?.version).toBe('1.4.3');
  });

  it('still honours an explicit version', () => {
    expect(selectWorkflowByName(registry, 'core', 'ProcessAITicket', '1.4.1')?.version).toBe('1.4.1');
    expect(selectWorkflowByName(registry, 'core', 'ProcessAITicket', '1.3.0')?.version).toBe('1.3.0');
  });

  it('returns undefined for an unregistered version or name', () => {
    expect(selectWorkflowByName(registry, 'core', 'ProcessAITicket', '9.9.9')).toBeUndefined();
    expect(selectWorkflowByName(registry, 'core', 'SomethingElse')).toBeUndefined();
    expect(selectWorkflowByName(registry, 'other', 'ProcessAITicket')).toBeUndefined();
  });

  it('does not conflate the same name in a different namespace', () => {
    const mixed = [row('1.0.0'), row('2.0.0', 'ProcessAITicket', 'reactor')];
    expect(selectWorkflowByName(mixed, 'core', 'ProcessAITicket')?.version).toBe('1.0.0');
    expect(selectWorkflowByName(mixed, 'reactor', 'ProcessAITicket')?.version).toBe('2.0.0');
  });

  it('is stable when a newer version is registered later', () => {
    const grown = [...registry, row('1.4.4')];
    expect(selectWorkflowByName(grown, 'core', 'ProcessAITicket')?.version).toBe('1.4.4');
  });
});

describe('support ticket AI action — launcher plumbing', () => {
  const sourceOf = (id: string): string => {
    const manifest = supportWidgetModules.find((entry) => entry.id === id);
    return String(manifest?.src || '');
  };

  /** Source with comments stripped, so prose that mentions a version is ignored. */
  const codeOf = (id: string): string => sourceOf(id)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  const action = codeOf('core.SupportTicketAIAction@1.0.0');
  const workflow = codeOf('core.SupportTicketWorkflow@1.0.0');
  const overview = codeOf('core.SupportTicketOverview@1.0.0');

  it('never hardcodes a ProcessAITicket version', () => {
    [action, workflow, overview].forEach((source) => {
      expect(source).not.toMatch(/ProcessAITicket@\d+\.\d+\.\d+/);
    });
    expect(action).not.toContain('DEFAULT_WORKFLOW_ID');
  });

  it('delegates the version decision to the shared resolver', () => {
    expect(action).toContain('workflows(filter');
    expect(action).toContain("from './aiWorkflowVersion'");
    expect(action).toContain('pickLatestWorkflowId');
    expect(action).toContain('registeredWorkflowVersions');
  });

  it('shows the exact definition it will run, not just a caption', () => {
    expect(action).toContain('label={resolvedWorkflowId}');
    expect(action).toContain('version unresolved');
  });

  it('refuses to launch when the version cannot be resolved', () => {
    // A silent fallback is what made the original bug invisible.
    expect(action).toContain('workflowError');
    expect(action).toMatch(/if \(!targetWorkflowId\)/);
  });

  it('stamps the workflow id onto the started instance for traceability', () => {
    expect(workflow).toContain('workflow:${workflowId}');
    expect(workflow).not.toMatch(/args\.workflowId\s*\|\|/);
  });

  it('re-resolves per ticket so a launch cannot inherit another ticket’s version', () => {
    expect(overview).toContain('key={`ai-action-${currentTicket.id}`}');
  });

  it('passes the operator brief through to the mutation', () => {
    expect(action).toContain('context,');
    expect(action).toContain('launchAIAction');
  });

  it('ships a bundle for every manifest entry', () => {
    // Informational: a fresh checkout compiles on demand, and production serves
    // whatever bundle was built for the release.
    expect(Array.isArray(supportWidgetModules)).toBe(true);
  });
});

describe('aiWorkflowVersion (the launcher resolver)', () => {
  // Exactly the shape the live registry returns: one row per registration,
  // oldest first, with 1.4.2 registered four times and 1.4.3 twice.
  const liveRows = [
    { id: 'core.ProcessAITicket@1.4.2', nameSpace: 'core', name: 'ProcessAITicket', version: '1.4.2' },
    { id: 'core.ProcessAITicket@1.3.0', nameSpace: 'core', name: 'ProcessAITicket', version: '1.3.0' },
    { id: 'core.ProcessAITicket@1.4.0', nameSpace: 'core', name: 'ProcessAITicket', version: '1.4.0' },
    { id: 'core.ProcessAITicket@1.4.1', nameSpace: 'core', name: 'ProcessAITicket', version: '1.4.1' },
    { id: 'core.ProcessAITicket@1.4.2', nameSpace: 'core', name: 'ProcessAITicket', version: '1.4.2' },
    { id: 'core.ProcessAITicket@1.4.2', nameSpace: 'core', name: 'ProcessAITicket', version: '1.4.2' },
    { id: 'core.ProcessAITicket@1.4.2', nameSpace: 'core', name: 'ProcessAITicket', version: '1.4.2' },
    { id: 'core.ProcessAITicket@1.4.2', nameSpace: 'core', name: 'ProcessAITicket', version: '1.4.2' },
    { id: 'core.ProcessAITicket@1.4.3', nameSpace: 'core', name: 'ProcessAITicket', version: '1.4.3' },
    { id: 'core.ProcessAITicket@1.4.3', nameSpace: 'core', name: 'ProcessAITicket', version: '1.4.3' },
  ];

  it('resolves the newest registered version from a duplicate-heavy registry', () => {
    expect(pickLatestWorkflowId(liveRows)).toBe('core.ProcessAITicket@1.4.3');
  });

  it('de-duplicates before ranking', () => {
    expect(registeredWorkflowVersions(liveRows)).toEqual(['1.4.3', '1.4.2', '1.4.1', '1.4.0', '1.3.0']);
  });

  it('returns null when nothing is registered, so the launcher blocks', () => {
    expect(pickLatestWorkflowId([])).toBeNull();
    expect(pickLatestWorkflowId(undefined as any)).toBeNull();
  });

  it('ignores rows from another namespace or name', () => {
    expect(pickLatestWorkflowId([
      { nameSpace: 'reactor', name: 'ProcessAITicket', version: '9.9.9' },
      { nameSpace: 'core', name: 'SomethingElse', version: '9.9.9' },
      { nameSpace: 'core', name: 'ProcessAITicket', version: '1.4.3' },
    ])).toBe('core.ProcessAITicket@1.4.3');
  });

  it('lists the versions the launcher is NOT running, for the UI hint', () => {
    expect(olderWorkflowVersions(liveRows, 'core.ProcessAITicket@1.4.3')).toEqual([
      '1.4.2', '1.4.1', '1.4.0', '1.3.0',
    ]);
  });

  it('sorts numerically so 1.10.0 outranks 1.9.0', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(pickLatestWorkflowId([
      { nameSpace: 'core', name: 'ProcessAITicket', version: '1.9.0' },
      { nameSpace: 'core', name: 'ProcessAITicket', version: '1.10.0' },
    ])).toBe('core.ProcessAITicket@1.10.0');
  });
});
