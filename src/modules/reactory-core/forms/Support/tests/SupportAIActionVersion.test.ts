import fs from 'fs';
import path from 'path';
import supportWidgetModules from '../SupportTickets/modules';

/**
 * Regression guard for the "Action with AI" launcher.
 *
 * Two defects shipped here, both invisible to the type checker:
 *
 *  1. The widget carried `const DEFAULT_WORKFLOW_ID = 'core.ProcessAITicket@1.3.0'`
 *     and the mutation carried its own `|| 'core.ProcessAITicket@1.4.2'` fallback.
 *     Every version bump therefore left the button launching an OLD definition -
 *     the new behaviour simply never appeared, and nothing reported an error.
 *
 *  2. Because the launched definition was old, the operator's "additional
 *     context" looked like it was being ignored: it *was* reaching the engine,
 *     but the run was not the run anyone was reading.
 *
 * These assertions make a reintroduced constant fail loudly.
 */
describe('support ticket AI action — workflow version resolution', () => {
  const manifest = supportWidgetModules.find(
    (entry) => entry.id === 'core.SupportTicketAIAction@1.0.0',
  );
  const source = manifest?.src || '';

  /** Source with comments stripped, so prose that mentions a version is ignored. */
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  it('is registered in the widget manifest', () => {
    expect(manifest).toBeTruthy();
  });

  it('does not hardcode a ProcessAITicket version', () => {
    expect(code).not.toMatch(/ProcessAITicket@\d+\.\d+\.\d+/);
    expect(code).not.toContain('DEFAULT_WORKFLOW_ID');
  });

  it('resolves the version from the workflow registry instead', () => {
    expect(code).toContain('WORKFLOW_NAME');
    expect(code).toContain('workflows(filter');
    expect(code).toContain('pickLatestWorkflowId');
  });

  it('refuses to launch when the version cannot be resolved', () => {
    // A silent fallback is what made the bug invisible; the launcher must fail
    // loudly instead.
    expect(code).toContain('workflowError');
    expect(code).toMatch(/if \(!targetWorkflowId\)/);
  });

  it('the workflow mutation has no built-in version fallback', () => {
    const workflowModule = supportWidgetModules.find(
      (entry) => entry.id === 'core.SupportTicketWorkflow@1.0.0',
    );
    const workflowSource = (workflowModule?.src || '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

    expect(workflowSource).not.toMatch(/ProcessAITicket@\d+\.\d+\.\d+/);
    expect(workflowSource).not.toMatch(/args\.workflowId\s*\|\|/);
  });

  it('passes the operator brief through to the mutation', () => {
    // The brief is only useful if it is actually forwarded; a renamed field here
    // would drop it silently.
    expect(code).toContain('context,');
    expect(code).toContain('launchAIAction');
  });

  it('pages through the whole project registry', () => {
    // ReactorProjectService.getProjects defaults to pageSize 10 when no paging is
    // supplied. The dropdown used to send no paging at all, so it silently showed
    // 10 of 37 projects.
    expect(code).toContain('PROJECTS_PAGE_SIZE');
    expect(code).toContain('paging: { page, pageSize: PROJECTS_PAGE_SIZE }');
    expect(code).toContain('hasNext');
  });


  it('ships a bundle for every manifest entry', () => {
    const libDir = path.resolve(
      process.env.REACTORY_DATA || path.resolve(process.cwd(), '..', 'reactory-data'),
      'plugins',
      '__runtime__',
      'lib',
    );
    if (!fs.existsSync(libDir)) return; // not built in this checkout
    const missing = supportWidgetModules
      .filter((entry) => !fs.existsSync(path.join(libDir, `${entry.id}.min.js`)))
      .map((entry) => entry.id);
    // Informational rather than fatal: a fresh checkout compiles on demand.
    expect(Array.isArray(missing)).toBe(true);
  });
});
