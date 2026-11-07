import Reactory from '@reactorynet/reactory-core';
import {
  WORKFLOW_NAME,
  WORKFLOW_NAME_SPACE,
  pickLatestWorkflowId,
  registeredWorkflowVersions,
} from './aiWorkflowVersion';

/**
 * core.SupportTicketAIAction@1.0.0
 *
 * A self-contained "Action with AI" control for a support ticket.
 *
 * Purpose
 * -------
 * The ticket pipeline (`core.ProcessAITicket`) can be launched automatically by the
 * dispatcher, but an engineer often wants to start it deliberately for one specific
 * ticket - to re-run a failed attempt, to pick a different specialist agent, or to
 * give extra instruction. This widget is that shortcut: one button on the ticket,
 * a form whose parameters are pre-filled from the ticket, and a link to the running
 * instance.
 *
 * It deliberately owns NOTHING except presentation + defaults. The mutation lives in
 * `core.SupportTicketWorkflow.launchAIAction` so a toolbar, a bulk action or a future
 * integration can trigger the same run without duplicating the contract.
 *
 * Parameter pre-fill (the point of the widget)
 * -------------------------------------------
 *  - ticketId        : always the ticket this widget is rendered against.
 *  - agentId         : last agent used in this browser, else ReactorAIPersona.
 *  - taskType        : derived from the ticket's requestType (bug -> bug, etc.).
 *  - workdir         : last repo used in this browser, else the `defaultWorkdir` prop.
 *  - reviewerId      : QualityQuinn.
 *  - oversightMode   : auto (matches the approved default); supervised available.
 *  - maxReviewCycles : 3.
 *  - requireSignoff  : true (a human still sees the result before the ticket moves).
 *  - context         : a brief that encodes the acceptance criteria AND the report /
 *                      verdict contract the pipeline depends on. Baked in on purpose:
 *                      the agent's report and the reviewer's verdict are machine-read,
 *                      and a run without a conforming report is a failed run.
 *
 * Identity note
 * -------------
 * The run executes as the signed-in user. The workflow engine stamps the start
 * context's identity onto the instance, which is exactly what makes the agent
 * conversations appear in that user's chat history - i.e. inspectable and
 * continuable afterwards. Do not proxy this through a service account.
 *
 * Folder selection
 * ----------------
 * The repository comes from the Reactor project registry, or is typed by hand.
 * Browsing is delegated to the registered `core.ServerFileExplorer@1.0.0`
 * instead of an inline picker. The old picker listed folder NAMES only and
 * joined paths client-side, so it silently depended on
 * `ReactoryFileService.getServerFiles` returning `path: dirent.name`; the shared
 * explorer reports the resolver's `fullPath` directly. That component is owned
 * by the PWA client and is resolved through `reactory.getComponents()` - this
 * widget is compiled into a client plugin and must not import it.
 *
 * The explorer is registered with roles ADMIN/DEVELOPER. A USER therefore sees
 * the workdir text field only: the Browse affordance is gated on the same
 * roles, and the explorer is never mounted for them.
 */

interface AIActionDependencies {
  React: Reactory.React,
  Material: Reactory.Client.Web.IMaterialModule,
  SupportTicketWorkflow: any,
}

interface AIActionProps {
  reactory: Reactory.Client.IReactoryApi,
  ticket: Reactory.Models.IReactorySupportTicket,
  /** Default repo root. The last value the user launches with is remembered. */
  defaultWorkdir?: string,
  /** Overridable so a workflow version bump needs no widget change. */
  workflowId?: string,
  variant?: 'contained' | 'outlined' | 'text',
  size?: 'small' | 'medium' | 'large',
  /** Render just the button without its own dialog (the host supplies the dialog). */
  buttonOnly?: boolean,
}

interface PersonaOption {
  id: string,
  name: string,
  description?: string,
}

const WORKDIR_STORAGE_KEY = 'reactory.support.aiAction.workdir';
const AGENT_STORAGE_KEY = 'reactory.support.aiAction.agentId';

/**
 * The workflow this widget starts, addressed by NAME.
 *
 * The version is deliberately NOT hardcoded. It used to be a constant
 * ('core.ProcessAITicket@1.3.0'), which silently kept launching a workflow
 * version that no longer matched the shipped definition - the new behaviours
 * simply never appeared because the old definition ran. The registry is the
 * source of truth: `pickLatestWorkflowId` resolves the newest registered
 * version when the dialog opens and the dialog shows it before launching.
 */
/**
 * Registered versions of the pipeline. The list returns one row per
 * registration, so the caller de-duplicates (see `registeredWorkflowVersions`).
 */
const WORKFLOWS_QUERY = `
  query SupportAIActionWorkflowVersions($filter: WorkflowFilterInput) {
    workflows(filter: $filter, pagination: { page: 1, limit: 50 }) {
      workflows {
        id
        nameSpace
        name
        version
      }
    }
  }`;

const DEFAULT_AGENT_ID = 'ReactorAIPersona';
const DEFAULT_REVIEWER_ID = 'QualityQuinn';

/**
 * Repositories come from the Reactor project registry: by convention every repo
 * has a project, and repoPath is its absolute checkout path. That is a far better
 * default than making the engineer type a path.
 *
 * NOTE the shape: ReactorProjects returns a PAGED object, not a list, so the
 * selection must go through "projects". Querying name/repoPath directly off the
 * field is a schema error (HTTP 400), which is easy to mistake for a permission
 * problem.
 */
const PROJECTS_QUERY = `
  query SupportAIActionProjects($filter: ReactorProjectFilter) {
    ReactorProjects(filter: $filter) {
      projects {
        id
        name
        nameSpace
        repoPath
      }
      paging {
        total
        page
        pageSize
        hasNext
      }
    }
  }`;

/**
 * How many projects to pull per page.
 *
 * The service DEFAULTS TO 10 when no paging is supplied (see
 * ReactorProjectService.getProjects), and the dropdown only ever fetched page 1
 * with no paging - so it silently showed 10 of the 37 registered projects. The
 * remaining ones were reachable only by typing a path by hand.
 */
const PROJECTS_PAGE_SIZE = 100;

/** Safety stop so a bad paging response cannot spin forever. */
const PROJECTS_MAX_PAGES = 20;

/**
 * The shared folder browser is registered under this FQN by the PWA client.
 * Resolution MUST go through the component registry (see the call in the
 * component body): a server module is compiled into a client plugin, so a
 * static import of a client component would not resolve at bundle time.
 */
const SERVER_FILE_EXPLORER_FQN = 'core.ServerFileExplorer@1.0.0';

/** Roles the explorer is registered with; used to gate the Browse affordance. */
const FOLDER_BROWSER_ROLES = ['ADMIN', 'DEVELOPER'];

/**
 * True when a path is absolute enough to seed the folder browser with.
 *
 * This matters beyond cosmetics: `ReactoryFileService.getServerFiles` returns an
 * ABSOLUTE `fullPath` only when the requested `serverPath` is already absolute.
 * For a templated root (`${APP_DATA_ROOT}`) it returns `path.join(serverPath,
 * name)`, i.e. still templated - and that is what would then be persisted as the
 * workflow's workdir. The picker therefore refuses to open without an absolute
 * seed, and the text field stays the manual override for anything else.
 */
const isAbsoluteServerPath = (value?: string): boolean => String(value || '').trim().startsWith('/');

/**
 * Agents that are actually able to take an engineering ticket.
 *
 * The full persona list is still selectable - this only sorts the ones that make
 * sense to the top and marks them, so a first-time user does not have to guess
 * between "Docent Daan" (a Dutch tutor) and the engineering personas.
 */
const RECOMMENDED_AGENTS = [
  'ReactorAIPersona',
  'InfrastructureIvyAIPersona',
  'SecuritySamAIPersona',
  'WorkflowWillAIPersona',
  'DataAnalyticsDanaAIPersona',
  'GitGuardian',
  'Formidable',
];

const RECOMMENDED_REVIEWERS = ['QualityQuinn', 'GitGuardian'];

/** Map the ticket's requestType onto the worktree branch prefix the workflow expects. */
const taskTypeForRequestType = (requestType?: string): string => {
  const value = String(requestType || '').trim().toLowerCase();
  if (value === 'bug' || value === 'performance' || value === 'integration') return 'bug';
  if (value === 'documentation') return 'chore';
  return 'feature';
};

const readStored = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStored = (key: string, value: string): void => {
  try {
    if (value) window.localStorage.setItem(key, value);
  } catch {
    /* storage can be unavailable (private mode); remembering is a convenience only */
  }
};

/**
 * The brief is pre-filled because the pipeline depends on two machine-read artifacts.
 * Without a conforming completion report the run is treated as failed; without a
 * conforming review verdict the reviewer cannot be parsed and the loop stalls.
 */
const buildDefaultContext = (ticket: Reactory.Models.IReactorySupportTicket): string => {
  const reference = ticket?.reference || ticket?.id || 'this ticket';
  return [
    `Work the support ticket ${reference}.`,
    '',
    'ACCEPTANCE CRITERIA (treat these as the definition of done)',
    '1. The behaviour described in the ticket is corrected.',
    '2. Existing tests still pass. Do not weaken, skip or delete an assertion to make a suite green.',
    '3. Add or update a test that would have failed before this change.',
    '',
    'REPORT CONTRACT (machine-read - the run is treated as FAILED without it)',
    'Write .ai-agent/report.json containing a TOP-LEVEL "summary" string and a TOP-LEVEL',
    '"status" set to exactly one of "completed", "blocked" or "failed".',
    '',
    'REVIEW CONTRACT (machine-read)',
    'Write .ai-agent/review.json containing a TOP-LEVEL "verdict" of "approved" or',
    '"rejected", plus "requiredChanges" (a list) when rejecting.',
  ].join('\n');
};

const SupportTicketAIAction = (props: AIActionProps) => {
  const { reactory, ticket, defaultWorkdir, workflowId, variant = 'outlined', size = 'small', buttonOnly = false } = props;

  const { React, Material, SupportTicketWorkflow } = reactory.getComponents<AIActionDependencies>([
    'react.React',
    'material-ui.Material',
    'core.SupportTicketWorkflow',
  ]);

  const { MaterialCore } = Material;
  const {
    Box,
    Button,
    Typography,
    Icon,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    FormControlLabel,
    Switch,
    Alert,
    Divider,
    Chip,
    CircularProgress,
    Link,
    Tooltip,
  } = MaterialCore;

  const [open, setOpen] = React.useState<boolean>(false);
  const [personas, setPersonas] = React.useState<PersonaOption[]>([]);
  const [personasLoading, setPersonasLoading] = React.useState<boolean>(false);
  const [personasError, setPersonasError] = React.useState<string | null>(null);

  const [agentId, setAgentId] = React.useState<string>(DEFAULT_AGENT_ID);
  const [reviewerId, setReviewerId] = React.useState<string>(DEFAULT_REVIEWER_ID);
  const [taskType, setTaskType] = React.useState<string>(taskTypeForRequestType(ticket?.requestType));
  const [workdir, setWorkdir] = React.useState<string>(defaultWorkdir || '');
  const [oversightMode, setOversightMode] = React.useState<string>('auto');
  const [maxReviewCycles, setMaxReviewCycles] = React.useState<number>(3);
  const [requireSignoff, setRequireSignoff] = React.useState<boolean>(true);
  const [context, setContext] = React.useState<string>(buildDefaultContext(ticket));

  const [launching, setLaunching] = React.useState<boolean>(false);
  const [result, setResult] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Resolved from the workflow registry when the dialog opens - never hardcoded.
  const [resolvedWorkflowId, setResolvedWorkflowId] = React.useState<string>(workflowId || "");
  const [workflowLoading, setWorkflowLoading] = React.useState<boolean>(false);
  const [workflowError, setWorkflowError] = React.useState<string | null>(null);
  // Distinct registered versions, newest first, for the "what else exists" hint.
  const [workflowVersions, setWorkflowVersions] = React.useState<string[]>([]);

  // Repositories (Reactor projects) - the primary way to choose a workdir.
  const [projects, setProjects] = React.useState<any[]>([]);
  const [projectsLoading, setProjectsLoading] = React.useState<boolean>(false);
  const [projectsError, setProjectsError] = React.useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('');

  // Folder picker (fallback / override). The browser itself is the shared
  // core.ServerFileExplorer - only its open state and its absolute seed path are
  // owned here. `pickerNotice` explains why the browser did not open.
  const [pickerOpen, setPickerOpen] = React.useState<boolean>(false);
  const [pickerSeedPath, setPickerSeedPath] = React.useState<string>('');
  const [pickerNotice, setPickerNotice] = React.useState<string | null>(null);

  /**
   * The explorer requires ADMIN or DEVELOPER (its registered roles). Mirroring
   * that here keeps a USER's experience honest: they get the text field only,
   * rather than a Browse button that cannot produce a usable component.
   */
  const canBrowseFolders = React.useMemo(() => {
    try {
      return typeof reactory.hasRole === 'function' && reactory.hasRole(FOLDER_BROWSER_ROLES) === true;
    } catch {
      return false;
    }
  }, [reactory]);

  /**
   * The shared folder browser (owned by the PWA client), resolved from the
   * registry: a static import would not resolve, because this widget is packaged
   * as a client plugin.
   *
   * It may legitimately be undefined - the registry may not know the component
   * yet, and the resolution itself may fail - so every use degrades to the
   * workdir text field rather than blanking the ticket. A USER never asks for it
   * at all.
   */
  const ServerFileExplorer = React.useMemo(() => {
    if (!canBrowseFolders) return undefined;
    try {
      const resolved = reactory.getComponents<{ ServerFileExplorer: any }>([SERVER_FILE_EXPLORER_FQN]);
      return resolved ? resolved.ServerFileExplorer : undefined;
    } catch {
      return undefined;
    }
  }, [reactory, canBrowseFolders]);

  const otherWorkflowVersions = React.useMemo(
    () => workflowVersions.filter((version) => `${WORKFLOW_NAME_SPACE}.${WORKFLOW_NAME}@${version}` !== resolvedWorkflowId),
    [workflowVersions, resolvedWorkflowId],
  );

  const ticketStatus = String(ticket?.status || '').toLowerCase();
  const ticketIsClosed = ticketStatus === 'closed' || ticketStatus === 'resolved' || ticketStatus === 'withdrawn';
  const hasWorkdir = typeof workdir === 'string' && workdir.trim().length > 0;

  /**
   * Resolve the newest registered version of the pipeline.
   *
   * Failure is surfaced (not silently defaulted): starting an older or
   * non-existent definition is worse than refusing to start, because the run
   * looks healthy while doing the wrong thing.
   */
  const loadWorkflowVersion = React.useCallback(async () => {
    if (workflowId) {
      setResolvedWorkflowId(workflowId);
      return;
    }
    setWorkflowLoading(true);
    setWorkflowError(null);
    try {
      const response: any = await reactory.graphqlQuery(WORKFLOWS_QUERY, {
        filter: { nameSpace: WORKFLOW_NAME_SPACE, name: WORKFLOW_NAME },
      }).then();
      const rows = response?.data?.workflows?.workflows || [];
      const versions = registeredWorkflowVersions(rows);
      const latest = pickLatestWorkflowId(rows);
      setWorkflowVersions(versions);
      setResolvedWorkflowId(latest || "");
      if (!latest) {
        setWorkflowError(`No registered ${WORKFLOW_NAME_SPACE}.${WORKFLOW_NAME} workflow was found. Deploy the definition before launching a run.`);
      }
    } catch (loadError: any) {
      setWorkflowVersions([]);
      setResolvedWorkflowId("");
      setWorkflowError(loadError?.message || "Could not read the workflow registry.");
    } finally {
      setWorkflowLoading(false);
    }
  }, [reactory, workflowId]);

  /**
   * Load the persona catalogue so the agent can be chosen by name rather than by id.
   * Failure is non-fatal: the id fields remain usable, so a permissions or network
   * problem never blocks starting a run.
   */
  const loadPersonas = React.useCallback(async () => {
    if (personas.length > 0 || personasLoading) return;
    setPersonasLoading(true);
    setPersonasError(null);
    try {
      const response: any = await reactory.graphqlQuery(`
        query SupportAIActionPersonas {
          ReactorPersonas {
            id
            name
            description
          }
        }`, {}).then();

      const list: PersonaOption[] = response?.data?.ReactorPersonas || [];
      setPersonas(list);
      if (list.length === 0) setPersonasError('No personas were returned - you can still enter an agent id directly.');
    } catch (loadError: any) {
      setPersonasError(loadError?.message || 'Could not load the agent list.');
    } finally {
      setPersonasLoading(false);
    }
  }, [personas.length, personasLoading, reactory]);

  /**
   * Re-seed the form whenever the dialog opens for a (possibly different) ticket.
   * Doing this on open rather than on mount means the values always reflect the
   * ticket currently displayed, and the remembered workdir/agent stay useful.
   */
  React.useEffect(() => {
    if (!open) return;

    const rememberedWorkdir = readStored(WORKDIR_STORAGE_KEY);
    const rememberedAgent = readStored(AGENT_STORAGE_KEY);

    setAgentId(rememberedAgent || DEFAULT_AGENT_ID);
    setReviewerId(DEFAULT_REVIEWER_ID);
    setTaskType(taskTypeForRequestType(ticket?.requestType));
    setWorkdir(rememberedWorkdir || defaultWorkdir || '');
    setOversightMode('auto');
    setMaxReviewCycles(3);
    setRequireSignoff(true);
    setContext(buildDefaultContext(ticket));
    setResult(null);
    setError(null);
    setPickerOpen(false);
    setPickerNotice(null);

    loadPersonas();
    loadProjects();
    loadWorkflowVersion();
  }, [open, ticket?.id]);

  /**
   * Load the FULL repository catalogue.
   *
   * Two things matter here, both of which were wrong before:
   *
   *  1. Pagination. `ReactorProjects` is paged and the service defaults to
   *     pageSize 10, so an unpaged query returns 10 rows out of 37. We walk every
   *     page until `hasNext` is false.
   *  2. Filtering happens on the COMBINED set, not per page. Filtering each page
   *     before merging would still leave holes once the list exceeds one page.
   *
   * Non-fatal throughout: the manual path field still works if this fails.
   */
  const loadProjects = React.useCallback(async () => {
    if (projects.length > 0 || projectsLoading) return;
    setProjectsLoading(true);
    setProjectsError(null);
    try {
      const collected: any[] = [];
      let page = 1;
      let hasNext = false;

      do {
        const response: any = await reactory.graphqlQuery(PROJECTS_QUERY, {
          filter: { paging: { page, pageSize: PROJECTS_PAGE_SIZE } },
        }).then();

        const payload = response?.data?.ReactorProjects;
        collected.push(...(payload?.projects || []));
        hasNext = Boolean(payload?.paging?.hasNext);
        page += 1;
      } while (hasNext && page <= PROJECTS_MAX_PAGES);

      const withRepo = collected.filter((project: any) => !!project && !!project.repoPath);
      // Stable, predictable order: namespace, then name.
      withRepo.sort((a: any, b: any) =>
        String(a.nameSpace || '').localeCompare(String(b.nameSpace || '')) ||
        String(a.name || '').localeCompare(String(b.name || '')));

      setProjects(withRepo);
      if (withRepo.length === 0) {
        setProjectsError(
          collected.length === 0
            ? 'No Reactor projects are registered.'
            : `${collected.length} project(s) are registered but none has a repository path, so none can be worked.`,
        );
      }
    } catch (loadError: any) {
      setProjectsError(loadError?.message || 'Could not load projects.');
    } finally {
      setProjectsLoading(false);
    }
  }, [projects.length, projectsLoading, reactory]);

  const selectedProject = React.useMemo(
    () => projects.find((project: any) => String(project.id) === selectedProjectId) || null,
    [projects, selectedProjectId]
  );

  /**
   * Open the shared folder browser.
   *
   * The seed MUST be absolute (see `isAbsoluteServerPath`), so it is resolved from
   * the best candidate available in this order: the path currently in the field,
   * the path remembered from the last launch, the selected project's repoPath,
   * then the `defaultWorkdir` prop. A templated or relative value never reaches
   * the explorer: the operator is told to type an absolute path instead.
   */
  const openPicker = () => {
    if (!ServerFileExplorer) {
      setPickerNotice(
        'The shared folder browser is not available in this session, so the repository path has to be entered by hand.',
      );
      return;
    }

    const seed = [workdir, readStored(WORKDIR_STORAGE_KEY) || '', selectedProject?.repoPath || '', defaultWorkdir || '']
      .map((candidate) => String(candidate || '').trim())
      .find(isAbsoluteServerPath) || '';

    if (!seed) {
      setPickerNotice(
        'The folder browser needs an absolute path to start from. Pick a project above or type an absolute path (starting with "/") in the repository field.',
      );
      return;
    }

    setPickerNotice(null);
    setPickerSeedPath(seed);
    setPickerOpen(true);
  };

  /**
   * The explorer reports the resolver's `fullPath` verbatim, so no client-side
   * path joining happens here - that was the fragility the inline picker carried.
   * A folder chosen by hand is no longer a registered project, so the Project
   * dropdown falls back to "Custom path".
   */
  const handleFolderSelection = (folders: Array<{ fullPath?: string }>) => {
    const chosen = String((folders && folders[0] && folders[0].fullPath) || '').trim();
    if (chosen) {
      setWorkdir(chosen);
      setSelectedProjectId('');
    }
    setPickerOpen(false);
  };

  const chooseProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    const project = projects.find((candidate: any) => String(candidate.id) === projectId);
    if (project && project.repoPath) setWorkdir(String(project.repoPath));
  };

  /**
   * If a remembered agent/reviewer no longer exists (persona renamed or removed),
   * fall back to the defaults. Without this the Select would render blank while the
   * stale id was still submitted.
   */
  React.useEffect(() => {
    if (!open || personas.length === 0) return;
    const ids = personas.map((persona) => persona.id);
    if (!agentId || ids.indexOf(agentId) === -1) {
      setAgentId(ids.indexOf(DEFAULT_AGENT_ID) !== -1 ? DEFAULT_AGENT_ID : ids[0]);
    }
    if (!reviewerId || ids.indexOf(reviewerId) === -1) {
      setReviewerId(ids.indexOf(DEFAULT_REVIEWER_ID) !== -1 ? DEFAULT_REVIEWER_ID : ids[0]);
    }
  }, [personas, open]);

  /**
   * Keep the Project dropdown honest: if the workdir exactly matches a project's
   * repository path (e.g. restored from localStorage), reflect that selection rather
   * than showing "Custom path" beside a path that clearly is a project.
   */
  React.useEffect(() => {
    if (!open || projects.length === 0) return;
    const current = String(workdir || '').trim().replace(/\/+$/, '');
    if (!current) return;
    const match = projects.find((project: any) => String(project.repoPath || '').replace(/\/+$/, '') === current);
    setSelectedProjectId(match ? String(match.id) : '');
  }, [projects, open]);

  const openDialog = () => {
    setOpen(true);
  };

  const closeDialog = () => {
    if (launching) return;
    setOpen(false);
  };

  const launch = async () => {
    if (!agentId || !hasWorkdir) return;
    if (!SupportTicketWorkflow || typeof SupportTicketWorkflow.launchAIAction !== 'function') {
      setError('The SupportTicketWorkflow module is not available in this session, so the run cannot be started.');
      return;
    }
    // Never fall back to a constant: launching a stale or unregistered version
    // produces a run that looks healthy while executing the wrong definition.
    const targetWorkflowId = workflowId || resolvedWorkflowId;
    if (!targetWorkflowId) {
      setError(workflowError || 'The workflow version could not be resolved, so the run cannot be started.');
      return;
    }

    setLaunching(true);
    setError(null);
    setResult(null);

    const launched = await SupportTicketWorkflow.launchAIAction({
      ticket,
      agentId,
      reviewerId,
      taskType,
      workdir: workdir.trim(),
      oversightMode,
      maxReviewCycles,
      requireSignoff,
      context,
      workflowId: targetWorkflowId,
    });

    setLaunching(false);

    if (launched?.instanceId) {
      // Remember the choices that are per-environment rather than per-ticket, so the
      // next launch from any ticket is a one-click confirmation.
      writeStored(WORKDIR_STORAGE_KEY, workdir.trim());
      writeStored(AGENT_STORAGE_KEY, agentId);
      setResult(launched);
    } else {
      setError(launched?.error || 'Failed to start the AI run.');
    }
  };

  const viewInstance = () => {
    const instanceId = result?.instanceId;
    if (!instanceId) return;
    try {
      reactory.navigation(`/workflows/instances/${instanceId}`);
    } catch {
      /* navigation is best-effort; the instance id is shown for manual lookup */
    }
  };

  // ── Persona option rendering ────────────────────────────────────────────────
  const sortPersonas = (ids: string[]) => (a: PersonaOption, b: PersonaOption) => {
    const aRank = ids.indexOf(a.id);
    const bRank = ids.indexOf(b.id);
    const aScore = aRank === -1 ? 999 : aRank;
    const bScore = bRank === -1 ? 999 : bRank;
    if (aScore !== bScore) return aScore - bScore;
    return (a.name || a.id).localeCompare(b.name || b.id);
  };

  const agentOptions = React.useMemo(() => {
    if (!personas || personas.length === 0) return [];
    return [...personas].sort(sortPersonas(RECOMMENDED_AGENTS));
  }, [personas]);

  const reviewerOptions = React.useMemo(() => {
    if (!personas || personas.length === 0) return [];
    return [...personas].sort(sortPersonas(RECOMMENDED_REVIEWERS));
  }, [personas]);

  const renderPersonaItem = (persona: PersonaOption, recommendedIds: string[]) => (
    <MenuItem key={persona.id} value={persona.id}>
      <Box sx={{ display: 'flex', flexDirection: 'column', py: 0.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{persona.name || persona.id}</Typography>
          {recommendedIds.indexOf(persona.id) !== -1 && (
            <Chip label="recommended" size="small" variant="outlined" color="primary" sx={{ height: 18, fontSize: '0.65rem' }} />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', maxWidth: 520 }}>
          {persona.description || persona.id}
        </Typography>
      </Box>
    </MenuItem>
  );

  const personaCount = personas.length;

  // ── Trigger button ─────────────────────────────────────────────────────────
  const trigger = (
    <Tooltip title="Start an AI engineering run against this ticket">
      <Button
        variant={variant}
        color="secondary"
        size={size}
        startIcon={<Icon>smart_toy</Icon>}
        onClick={openDialog}
      >
        Action with AI
      </Button>
    </Tooltip>
  );

  if (buttonOnly) return trigger;

  // ── Dialog ─────────────────────────────────────────────────────────────────
  return (
    <>
      {trigger}

      <Dialog open={open} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon color="secondary">smart_toy</Icon>
          <Box>
            <Typography variant="h6" component="div" sx={{ lineHeight: 1.2 }}>
              Action with AI
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {ticket?.reference || ticket?.id}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {personasError && (
            <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setPersonasError(null)}>
              {personasError}
            </Alert>
          )}

          <Alert severity="info" icon={<Icon>badge</Icon>} sx={{ mb: 2 }}>
            The run executes <strong>as you</strong>, so the agent and reviewer conversations appear in your
            chat history and can be inspected or continued. The agent works in an isolated git worktree; on a
            passing review the pipeline commits, pushes and opens a pull request for your approval. The ticket
            moves to <strong>in_progress</strong> when the run starts and to <strong>resolved</strong> only
            once the pull request is merged.
          </Alert>

          {ticketIsClosed && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              This ticket is <strong>{ticketStatus}</strong>. Starting a run on a terminal ticket is allowed
              (for example to re-verify a fix), but the result will still require sign-off before anything changes.
            </Alert>
          )}

          {!hasWorkdir && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No repository selected. The agent needs an absolute path to the checkout it should work in.
            </Alert>
          )}

          {workflowError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setWorkflowError(null)}>
              {workflowError}
            </Alert>
          )}

          {/* ── Agent ─────────────────────────────────────────────────────── */}
          <FormControl fullWidth size="small" sx={{ mb: 2 }} disabled={personasLoading}>
            <InputLabel id="ai-action-agent-label">Agent</InputLabel>
            <Select
              labelId="ai-action-agent-label"
              label="Agent"
              value={agentId}
              onChange={(event: any) => setAgentId(String(event.target.value))}
              MenuProps={{ PaperProps: { sx: { maxHeight: 420 } } }}
            >
              {agentOptions.length === 0 && (
                <MenuItem value={agentId}>{agentId}</MenuItem>
              )}
              {agentOptions.map((persona) => renderPersonaItem(persona, RECOMMENDED_AGENTS))}
            </Select>
          </FormControl>
          {personasLoading && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">Loading agents…</Typography>
            </Box>
          )}

          {/* ── Task type + workdir ───────────────────────────────────────── */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="ai-action-tasktype-label">Task type</InputLabel>
              <Select
                labelId="ai-action-tasktype-label"
                label="Task type"
                value={taskType}
                onChange={(event: any) => setTaskType(String(event.target.value))}
              >
                <MenuItem value="bug">bug</MenuItem>
                <MenuItem value="feature">feature</MenuItem>
                <MenuItem value="chore">chore</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="ai-action-oversight-label">Oversight</InputLabel>
              <Select
                labelId="ai-action-oversight-label"
                label="Oversight"
                value={oversightMode}
                onChange={(event: any) => setOversightMode(String(event.target.value))}
              >
                <MenuItem value="auto">auto — fully autonomous</MenuItem>
                <MenuItem value="supervised">supervised — approve risky tools</MenuItem>
              </Select>
            </FormControl>

            <TextField
              size="small"
              type="number"
              label="Max review cycles"
              value={maxReviewCycles}
              onChange={(event: any) => {
                const parsed = Number(event.target.value);
                setMaxReviewCycles(Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1);
              }}
              inputProps={{ min: 1, max: 10 }}
              sx={{ width: 180 }}
            />
          </Box>

          {/* Repository: pick the project (by convention one per repo), or override. */}
          <FormControl fullWidth size="small" sx={{ mb: 1.5 }} disabled={projectsLoading}>
            <InputLabel id="ai-action-project-label">Project</InputLabel>
            <Select
              labelId="ai-action-project-label"
              label="Project"
              value={selectedProjectId}
              onChange={(event: any) => chooseProject(String(event.target.value))}
              MenuProps={{ PaperProps: { sx: { maxHeight: 380 } } }}
            >
              <MenuItem value="">
                <em>Custom path (set the repository field below)</em>
              </MenuItem>
              {projects.map((project: any) => (
                <MenuItem key={project.id} value={String(project.id)}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', py: 0.25 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{project.name}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                      {project.repoPath}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {projectsError && (
            <Alert severity="info" sx={{ mb: 1.5 }} onClose={() => setProjectsError(null)}>
              {projectsError} You can still set the repository path below.
            </Alert>
          )}

          {!projectsError && projects.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
              {projects.length} repositories available from the Reactor project registry.
            </Typography>
          )}

          <TextField
            fullWidth
            size="small"
            label="Repository (workdir)"
            placeholder="/absolute/path/to/repository"
            value={workdir}
            onChange={(event: any) => {
              setWorkdir(event.target.value);
              // Typing a path means it no longer matches the selected project.
              setSelectedProjectId('');
            }}
            helperText={
              selectedProject
                ? 'Using project "' + selectedProject.name + '". The agent works in an isolated git worktree of this repository.'
                : 'The agent works in an isolated git worktree of this repository. Remembered for next time.'
            }
            InputProps={{
              sx: { fontFamily: 'monospace', fontSize: '0.85rem' },
              // The shared browser requires ADMIN/DEVELOPER; for everyone else the
              // field itself is the only (and sufficient) way to set the workdir.
              endAdornment: canBrowseFolders ? (
                <Button size="small" startIcon={<Icon>folder_open</Icon>} onClick={openPicker}>
                  Browse
                </Button>
              ) : null,
            }}
            sx={{ mb: pickerNotice ? 0.5 : 2 }}
          />

          {pickerNotice && (
            <Alert severity="info" sx={{ mb: 2 }} onClose={() => setPickerNotice(null)}>
              {pickerNotice}
            </Alert>
          )}

          <FormControlLabel
            control={
              <Switch
                checked={requireSignoff}
                onChange={(event: any) => setRequireSignoff(Boolean(event.target.checked))}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body2">Require human sign-off</Typography>
                <Typography variant="caption" color="text.secondary">
                  Raises a task in your task list with the pull request link; the ticket is resolved only after
                  the merge.
                </Typography>
              </Box>
            }
            sx={{ mb: 2, alignItems: 'flex-start' }}
          />

          <Divider sx={{ mb: 2 }} />

          {/* ── Reviewer (advanced) ───────────────────────────────────────── */}
          <FormControl fullWidth size="small" sx={{ mb: 2 }} disabled={personasLoading}>
            <InputLabel id="ai-action-reviewer-label">Reviewer</InputLabel>
            <Select
              labelId="ai-action-reviewer-label"
              label="Reviewer"
              value={reviewerId}
              onChange={(event: any) => setReviewerId(String(event.target.value))}
              MenuProps={{ PaperProps: { sx: { maxHeight: 380 } } }}
            >
              {reviewerOptions.length === 0 && (
                <MenuItem value={reviewerId}>{reviewerId}</MenuItem>
              )}
              {reviewerOptions.map((persona) => renderPersonaItem(persona, RECOMMENDED_REVIEWERS))}
            </Select>
          </FormControl>

          {/* ── Brief ─────────────────────────────────────────────────────── */}
          <TextField
            fullWidth
            multiline
            minRows={8}
            maxRows={18}
            label="Additional context / instruction"
            value={context}
            onChange={(event: any) => setContext(event.target.value)}
            helperText="Pre-filled with the acceptance criteria and the machine-read report/verdict contract. Edit freely."
            InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
            sx={{ mb: 1 }}
          />

          {/*
            Make the definition this run will execute explicit.

            Launching the WRONG version is silent: the run looks healthy and
            simply performs the old behaviour. Before this line the version was
            only in a low-contrast caption, so an operator could not tell which
            definition they were about to run, and a stale constant went
            unnoticed for several releases.
          */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Workflow
            </Typography>
            {workflowLoading ? (
              <Chip
                size="small"
                variant="outlined"
                icon={<CircularProgress size={12} />}
                label="resolving registry…"
              />
            ) : resolvedWorkflowId ? (
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                icon={<Icon fontSize="small">account_tree</Icon>}
                label={resolvedWorkflowId}
                sx={{ fontFamily: 'monospace' }}
              />
            ) : (
              <Chip size="small" color="error" variant="outlined" label="version unresolved" />
            )}
            {!workflowLoading && otherWorkflowVersions.length > 0 && (
              <Typography variant="caption" color="text.secondary">
                (older registered: {otherWorkflowVersions.slice(0, 3).join(', ')}
                {otherWorkflowVersions.length > 3 ? '…' : ''})
              </Typography>
            )}
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            {`Brief: ${(context || "").trim().length} characters included`}
          </Typography>

          <Typography variant="caption" color="text.secondary">
            {personaCount > 0 ? `${personaCount} agents available.` : 'Agent list unavailable — the id will be used as entered.'}
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {result?.instanceId && (
            <Alert
              severity="success"
              sx={{ mt: 2 }}
              action={
                <Button color="inherit" size="small" onClick={viewInstance}>
                  View
                </Button>
              }
            >
              <Typography variant="subtitle2">AI run started</Typography>
              <Typography variant="caption" display="block">
                Instance <Link component="span" sx={{ fontFamily: 'monospace' }}>{result.instanceId}</Link> • Status: {result.status}
              </Typography>
              <Typography variant="caption" display="block">
                Workflow {result.workflowId || resolvedWorkflowId} · brief {(context || "").trim().length} characters included.
              </Typography>
              <Typography variant="caption" display="block">
                The agent's conversation is in your chat history. A pull request approval task will appear in your
                task list when the review passes.
              </Typography>
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDialog} disabled={launching}>
            {result?.instanceId ? 'Close' : 'Cancel'}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={launching ? <CircularProgress size={18} color="inherit" /> : <Icon>play_arrow</Icon>}
            onClick={launch}
            disabled={launching || !agentId || !hasWorkdir || !(workflowId || resolvedWorkflowId)}
          >
            {launching ? 'Starting…' : 'Start AI run'}
          </Button>
        </DialogActions>
      </Dialog>

      {/*
        Folder picker - the "capability to select a folder" escape hatch.

        Delegated to the shared core.ServerFileExplorer@1.0.0, seeded with an
        absolute path. It reports the resolver's `fullPath` directly, so the
        workdir no longer depends on how the resolver shapes relative paths.
        Rendered only for the explorer's roles, and only when it resolved - a
        plugin built before that registration must degrade to the text field, not
        crash.
      */}
      {canBrowseFolders && ServerFileExplorer && (
        <ServerFileExplorer
          reactory={reactory}
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          serverPath={pickerSeedPath}
          title="Choose repository folder"
          onFolderSelection={handleFolderSelection}
          readonly
          allowUpload={false}
          allowCreateFolder={false}
          allowDelete={false}
          allowRename={false}
          closeOnFolderSelection
        />
      )}
    </>
  );
};

const Definition: any = {
  name: 'SupportTicketAIAction',
  nameSpace: 'core',
  version: '1.0.0',
  component: SupportTicketAIAction,
  roles: ['USER'],
};

//@ts-ignore
if (window?.reactory?.api) {
  //@ts-ignore
  window.reactory.api.registerComponent(
    Definition.nameSpace,
    Definition.name,
    Definition.version,
    SupportTicketAIAction,
    ['Support Ticket', 'AI'],
    Definition.roles,
    true,
    [],
    'widget'
  );
  //@ts-ignore
  window.reactory.api.amq.raiseReactoryPluginEvent('loaded', {
    componentFqn: `${Definition.nameSpace}.${Definition.name}@${Definition.version}`,
    component: SupportTicketAIAction
  });
}

export default SupportTicketAIAction;
