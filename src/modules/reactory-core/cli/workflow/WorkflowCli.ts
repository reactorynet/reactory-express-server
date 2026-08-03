import Reactory from '@reactorynet/reactory-core';
import { ReadLine } from 'readline';
import colors from 'colors/safe';
import fs from 'fs';
import yaml from 'js-yaml';
import { InstanceResourceManager } from '@reactory/server-modules/reactory-core/workflow/InstanceResourceManager';
import type { IReactoryWorkflowService } from '../../services/Workflow/types';

// ─── Color theme ─────────────────────────────────────────────────────────────
colors.setTheme({
  input: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red',
});

const WORKFLOW_SERVICE_ID = 'core.ReactoryWorkflowService@1.0.0';
const CONVERSATION_SERVICE_ID = 'reactor.ReactorConversationService@1.0.0';
const DEFAULT_PERSONA_ID = 'WorkflowWillAIPersona';

// Bounds for the data we hand to the AI persona so we never blow the context.
const AI_LOG_TAIL_LINES = 300;
const AI_LOG_MAX_CHARS = 60000;
const AI_INSTANCE_MAX_CHARS = 40000;

// ─── Help text ────────────────────────────────────────────────────────────────
const HelpText = `
The workflow CLI drives Reactory workflow execution instances.

Commands:
  start      <workflowId>   Start a new workflow instance
  continue   <instanceId>   Continue an instance: signal a waiting step's event,
                            or resume a paused instance
  get        <instanceId>   Fetch an instance, its steps and outcome
  terminate  <instanceId>   Terminate (cancel) a running instance
  stats      [instanceId]   Instance/step statistics, or engine-wide stats

Output options:
  -o --output <fmt>         Output format: json | yaml | text   (default: text)
  -v --verbose              Verbose output (include stack traces)
  -h --help                 Show this help message

AI summary (optional):
  When any of --persona / --provider / --model is supplied, the command runs a
  NON-streaming AI chat session after the operation and asks the persona to
  summarise the state and output of the instance (it is given the instance id,
  the log file reference and a bounded tail of the log).

  --persona  <id>           AI persona id           (default: ${DEFAULT_PERSONA_ID})
  --provider <id>           AI provider id override (e.g. anthropic, openai, google)
  --model    <id>           AI model id override    (e.g. claude-opus-4-8)

start options:
      --input      <json>   Inline JSON passed as the workflow input
      --input-file <path>   Path to a JSON file used as the workflow input
      --tags       <a,b,c>  Comma separated tags
      --priority   <n>      Execution priority (integer)
      --timeout    <ms>     Execution timeout in milliseconds

continue options:
      --step       <id>     Signal only the matching waiting step (id or name)
      --event      <name>   Publish a raw event by name (requires --event-key)
      --event-key  <key>    Event correlation key (for --event)
      --event-data <json>   JSON payload delivered to the resumed step

get options:
      --logs                Include a tail of the instance log in the output
      --tail       <n>      Number of log lines to include (default: 200)

stats options:
      --step       <id>     Restrict instance stats to a single step (id or name)

Examples:
  reactory workflow start core.MyWorkflow@1.0.0 --input='{"foo":1}'
  reactory workflow get 665f0c... -o json
  reactory workflow stats 665f0c... --step resolveWorkdir
  reactory workflow stats -o yaml
  reactory workflow get 665f0c... --persona=${DEFAULT_PERSONA_ID}
  reactory workflow terminate 665f0c... --provider=anthropic --model=claude-opus-4-8
`;

type ReactoryCliApp = Reactory.Server.TCli;
type OutputFormat = 'json' | 'yaml' | 'text';

// ─── Argument parser ──────────────────────────────────────────────────────────

interface ParsedArgs {
  command: string;
  target: string;
  output: OutputFormat;
  input?: string;
  inputFile?: string;
  tags?: string[];
  priority?: number;
  timeout?: number;
  step?: string;
  event?: string;
  eventKey?: string;
  eventData?: string;
  logs: boolean;
  tail: number;
  persona?: string;
  provider?: string;
  model?: string;
  verbose: boolean;
  help: boolean;
}

function parseArgs(kwargs: string[]): ParsedArgs {
  const result: ParsedArgs = {
    command: '',
    target: '',
    output: 'text',
    logs: false,
    tail: 200,
    verbose: false,
    help: false,
  };

  let idx = 0;

  // First positional token = sub-command.
  if (idx < kwargs.length && !kwargs[idx].startsWith('-')) {
    result.command = kwargs[idx++];
  }
  // Optional second positional token = target (instance/workflow id).
  if (idx < kwargs.length && !kwargs[idx].startsWith('-')) {
    result.target = kwargs[idx++];
  }

  while (idx < kwargs.length) {
    let flag: string;
    let value: string | null = null;

    const raw = kwargs[idx];
    if (raw.includes('=')) {
      const eq = raw.indexOf('=');
      flag = raw.slice(0, eq);
      value = raw.slice(eq + 1);
    } else {
      flag = raw;
      // Peek at the next token as the value when it is not itself a flag.
      if (idx + 1 < kwargs.length && !kwargs[idx + 1].startsWith('-')) {
        value = kwargs[idx + 1];
        idx++;
      }
    }

    switch (flag) {
      case '-o':
      case '--output': {
        const v = (value ?? '').toLowerCase();
        result.output = (['json', 'yaml', 'text'].includes(v) ? v : 'text') as OutputFormat;
        break;
      }
      case '--input':
        result.input = value ?? undefined;
        break;
      case '--input-file':
        result.inputFile = value ?? undefined;
        break;
      case '--tags':
        result.tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : undefined;
        break;
      case '--priority':
        result.priority = value ? parseInt(value, 10) : undefined;
        break;
      case '--timeout':
        result.timeout = value ? parseInt(value, 10) : undefined;
        break;
      case '--step':
        result.step = value ?? undefined;
        break;
      case '--event':
        result.event = value ?? undefined;
        break;
      case '--event-key':
        result.eventKey = value ?? undefined;
        break;
      case '--event-data':
        result.eventData = value ?? undefined;
        break;
      case '--logs':
        result.logs = true;
        break;
      case '--tail':
        result.tail = value ? parseInt(value, 10) : result.tail;
        break;
      case '--persona':
        result.persona = value ?? DEFAULT_PERSONA_ID;
        break;
      case '--provider':
        result.provider = value ?? undefined;
        break;
      case '--model':
        result.model = value ?? undefined;
        break;
      case '-v':
      case '--verbose':
        result.verbose = true;
        break;
      case '-h':
      case '--help':
        result.help = true;
        break;
      default:
        // Unknown flags are ignored gracefully.
        break;
    }

    idx++;
  }

  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "nameSpace.Name@version" → its parts (version defaults to 1.0.0). */
function parseWorkflowDefinitionId(definitionId: string): { nameSpace: string; name: string; version: string } | null {
  if (!definitionId) return null;
  const match = definitionId.match(/^([^.]+)\.(.+)@(.+)$/);
  if (match) {
    return { nameSpace: match[1], name: match[2], version: match[3] };
  }
  // Fallback: "nameSpace.Name" with no version.
  const dot = definitionId.indexOf('.');
  if (dot > 0) {
    return { nameSpace: definitionId.slice(0, dot), name: definitionId.slice(dot + 1), version: '1.0.0' };
  }
  return null;
}

/**
 * Resolve the raw local log file path for an instance and, when present, a
 * bounded tail of its contents. Never throws — returns nulls on any failure so
 * the CLI keeps working even when REACTORY_DATA is unset or the file is absent.
 */
function readInstanceLog(
  context: Reactory.Server.IReactoryContext,
  definitionId: string,
  instanceId: string,
  tailLines: number,
): { logPath: string | null; logText: string | null } {
  try {
    const parts = parseWorkflowDefinitionId(definitionId);
    if (!parts) return { logPath: null, logText: null };

    const rm = new InstanceResourceManager(parts.nameSpace, parts.name, parts.version, instanceId);
    const logPath = rm.getLogFilePath();

    if (!fs.existsSync(logPath)) return { logPath, logText: null };

    const raw = fs.readFileSync(logPath, 'utf8');
    const lines = raw.split(/\r?\n/);
    const tail = lines.slice(Math.max(0, lines.length - Math.max(1, tailLines))).join('\n');
    const bounded = tail.length > AI_LOG_MAX_CHARS ? tail.slice(tail.length - AI_LOG_MAX_CHARS) : tail;
    return { logPath, logText: bounded };
  } catch (err: any) {
    context.log(`WorkflowCli: unable to read instance log: ${err.message}`, {}, 'warning');
    return { logPath: null, logText: null };
  }
}

/** Compute per-step statistics from a history item's execution pointers. */
function computeStepStats(instance: any, stepFilter?: string) {
  const pointers: any[] = instance?.executionPointers || [];
  const matches = (p: any) =>
    !stepFilter || p.stepName === stepFilter || String(p.stepId) === stepFilter;

  const steps = pointers.filter(matches).map((p: any) => ({
    stepId: p.stepId,
    stepName: p.stepName,
    status: p.status,
    statusLabel: p.statusLabel,
    startTime: p.startTime,
    endTime: p.endTime,
    duration: p.duration,
    retryCount: p.retryCount ?? 0,
    active: Boolean(p.active),
    errorMessage: p.errorMessage ?? null,
  }));

  return {
    stepCount: instance?.stepCount ?? pointers.length,
    completedStepCount: instance?.completedStepCount ?? 0,
    failedStepCount: instance?.failedStepCount ?? 0,
    duration: instance?.duration ?? null,
    steps,
  };
}

// ─── AI persona summary (non-streaming) ─────────────────────────────────────────

interface SummaryContext {
  command: string;
  instanceId: string | null;
  instance: any;
  payload: any;
  logPath: string | null;
  logText: string | null;
}

function buildSummaryPrompt(ctx: SummaryContext): string {
  const instanceJson = (() => {
    try {
      const s = JSON.stringify(ctx.instance ?? ctx.payload ?? {}, null, 2);
      return s.length > AI_INSTANCE_MAX_CHARS ? `${s.slice(0, AI_INSTANCE_MAX_CHARS)}\n… (truncated)` : s;
    } catch {
      return '{}';
    }
  })();

  return [
    `You are reviewing a Reactory workflow execution following a "${ctx.command}" CLI operation.`,
    `Summarise the current state and output of the workflow instance: what has executed, the`,
    `outcome of each meaningful step, any failures (with the failing step and cause), and the`,
    `recommended next action. Be concise and use plain language.`,
    ``,
    ctx.instanceId ? `Instance id: ${ctx.instanceId}` : `No specific instance (engine-wide operation).`,
    ctx.logPath ? `Log file: ${ctx.logPath}` : `Log file: (unavailable)`,
    ``,
    `Instance / result data (JSON):`,
    '```json',
    instanceJson,
    '```',
    ctx.logText
      ? ['', `Log tail (last lines):`, '```', ctx.logText, '```'].join('\n')
      : '',
  ].join('\n');
}

/**
 * Run a single, non-streaming persona chat turn and return the summary text.
 * Resolves the conversation service dynamically so the workflow CLI carries no
 * hard dependency on the reactory-reactor (AI) module — if it is not enabled we
 * skip the summary gracefully.
 */
async function runPersonaSummary(
  context: Reactory.Server.IReactoryContext,
  ctx: SummaryContext,
  args: ParsedArgs,
): Promise<{ persona: string; provider?: string; model?: string; summary: string } | null> {
  const conversation = context.getService<any>(CONVERSATION_SERVICE_ID);
  if (!conversation || typeof conversation.sendMessage !== 'function') {
    context.log(
      `WorkflowCli: ${CONVERSATION_SERVICE_ID} is not available; skipping AI summary.`,
      {},
      'warning',
    );
    return null;
  }

  const personaId = args.persona || DEFAULT_PERSONA_ID;
  const message = buildSummaryPrompt(ctx);

  try {
    const response: any = await conversation.sendMessage({
      personaId,
      message,
      role: 'user',
      // String value of StreamingMode.NONE — avoids importing the enum (and a
      // hard cross-module dependency) while selecting a non-streaming turn.
      streamingMode: 'NONE',
      ...(args.model ? { modelId: args.model } : {}),
      ...(args.provider ? { providerId: args.provider } : {}),
    });

    if (response?.__typename === 'ReactorErrorResponse') {
      const errText = response?.message || response?.error || 'AI provider returned an error';
      context.log(`WorkflowCli: AI summary error: ${errText}`, {}, 'warning');
      return { persona: personaId, provider: args.provider, model: args.model, summary: `AI summary failed: ${errText}` };
    }

    const summary: string =
      response?.content ||
      response?.choices?.[0]?.message?.content ||
      '';

    return { persona: personaId, provider: args.provider, model: args.model, summary };
  } catch (err: any) {
    context.log(`WorkflowCli: AI summary threw: ${err.message}`, { err }, 'error');
    return { persona: personaId, provider: args.provider, model: args.model, summary: `AI summary failed: ${err.message}` };
  }
}

// ─── Sub-command handlers ───────────────────────────────────────────────────────
// Each returns a payload object; `instanceId` (when known) drives the AI summary.

interface CommandOutcome {
  instanceId: string | null;
  instance: any;
  payload: any;
}

async function handleStart(svc: IReactoryWorkflowService, args: ParsedArgs): Promise<CommandOutcome> {
  if (!args.target) throw new Error('start requires a <workflowId> (e.g. core.MyWorkflow@1.0.0)');

  let input: any = {};
  if (args.inputFile) {
    input = JSON.parse(fs.readFileSync(args.inputFile, 'utf8'));
  } else if (args.input) {
    input = JSON.parse(args.input);
  }

  const executionInput: any = { input };
  if (args.tags) executionInput.tags = args.tags;
  if (args.priority !== undefined) executionInput.priority = args.priority;
  if (args.timeout !== undefined) executionInput.timeout = args.timeout;

  const instance = await svc.startWorkflow(args.target, executionInput);
  const instanceId = (instance as any)?.id ?? null;

  return {
    instanceId,
    instance,
    payload: { workflowId: args.target, started: true, instance },
  };
}

async function handleContinue(svc: IReactoryWorkflowService, args: ParsedArgs): Promise<CommandOutcome> {
  if (!args.target && !args.event) throw new Error('continue requires an <instanceId> (or --event/--event-key)');

  let eventData: any;
  if (args.eventData !== undefined) {
    try { eventData = JSON.parse(args.eventData); } catch { eventData = args.eventData; }
  }

  // 1. Raw event publish by (name, key) — signals any matching waiting step.
  if (args.event) {
    if (!args.eventKey) throw new Error('--event requires --event-key');
    const result = await svc.publishWorkflowEvent(args.event, args.eventKey, eventData);
    return {
      instanceId: args.target || null,
      instance: null,
      payload: { instanceId: args.target || null, action: 'publish-event', event: args.event, eventKey: args.eventKey, result },
    };
  }

  // 2. Signal the instance's waiting step(s); fall back to a plain resume when
  //    nothing is actually waiting for an event.
  let result = await svc.signalWorkflowInstance(args.target, eventData, args.step);
  let action = 'signal';
  if (!result.success && /no step(s)? waiting/i.test(result.message || '')) {
    result = await svc.resumeWorkflowInstance(args.target);
    action = 'resume';
  }

  return {
    instanceId: args.target,
    instance: null,
    payload: { instanceId: args.target, action, step: args.step ?? null, result },
  };
}

async function handleGet(svc: IReactoryWorkflowService, args: ParsedArgs): Promise<CommandOutcome> {
  if (!args.target) throw new Error('get requires an <instanceId>');

  let instance: any = await svc.getWorkflowHistoryById(args.target);
  if (!instance) {
    // Fall back to the in-memory instance view for still-running instances.
    try { instance = await svc.getWorkflowInstance(args.target); } catch { /* ignore */ }
  }
  if (!instance) throw new Error(`Workflow instance not found: ${args.target}`);

  // Log attachment (when --logs is set) happens in the main flow, where the
  // Reactory context needed by the resource manager is available.
  return { instanceId: args.target, instance, payload: { instanceId: args.target, instance } };
}

async function handleTerminate(svc: IReactoryWorkflowService, args: ParsedArgs): Promise<CommandOutcome> {
  if (!args.target) throw new Error('terminate requires an <instanceId>');
  const result = await svc.cancelWorkflowInstance(args.target);
  return {
    instanceId: args.target,
    instance: null,
    payload: { instanceId: args.target, action: 'terminate', result },
  };
}

async function handleStats(svc: IReactoryWorkflowService, args: ParsedArgs): Promise<CommandOutcome> {
  if (args.target) {
    const instance: any = await svc.getWorkflowHistoryById(args.target);
    if (!instance) throw new Error(`Workflow instance not found: ${args.target}`);
    const stats = computeStepStats(instance, args.step);
    return {
      instanceId: args.target,
      instance,
      payload: { instanceId: args.target, scope: args.step ? 'step' : 'instance', step: args.step ?? null, stats },
    };
  }

  const stats = await svc.getWorkflowExecutionStats();
  return { instanceId: null, instance: null, payload: { scope: 'engine', stats } };
}

// ─── Text rendering ─────────────────────────────────────────────────────────────

function line(label: string, value: any): string {
  return `${colors.gray(label.padEnd(16))} ${colors.white(String(value ?? 'N/A'))}\n`;
}

function renderInstanceText(instance: any): string {
  let out = '';
  out += line('Instance ID', instance.id);
  out += line('Definition', instance.workflowDefinitionId);
  out += line('Version', instance.version);
  out += line('Status', instance.statusLabel ?? instance.status);
  out += line('Created', instance.createTime);
  out += line('Completed', instance.completeTime);
  out += line('Duration', instance.duration != null ? `${instance.duration}ms` : 'N/A');
  out += line('Steps', `${instance.completedStepCount ?? 0} done, ${instance.failedStepCount ?? 0} failed / ${instance.stepCount ?? 0}`);

  const pointers: any[] = instance.executionPointers || [];
  if (pointers.length > 0) {
    out += `\n${colors.cyan('Steps:')}\n`;
    pointers.forEach((p: any) => {
      const status = p.status === 6 ? colors.red(p.statusLabel || 'FAILED') : colors.green(p.statusLabel || String(p.status));
      out += `  • ${colors.white(p.stepName || p.stepId)}  [${status}]`;
      if (p.duration != null) out += colors.gray(` ${p.duration}ms`);
      if (p.retryCount) out += colors.yellow(` retries:${p.retryCount}`);
      out += '\n';
      if (p.errorMessage) out += `      ${colors.red(p.errorMessage)}\n`;
    });
  }
  return out;
}

function renderText(command: string, outcome: CommandOutcome, ai: { persona: string; summary: string } | null): string {
  let out = `\n${colors.green(`workflow ${command}`)}\n${colors.gray('─'.repeat(60))}\n`;
  const { payload, instance } = outcome;

  switch (command) {
    case 'start':
      out += line('Started', payload.workflowId);
      if (instance) out += line('Instance ID', (instance as any).id);
      if (instance) out += line('Status', (instance as any).statusLabel ?? (instance as any).status);
      break;
    case 'continue':
    case 'terminate': {
      const r = payload.result || {};
      out += line('Instance ID', payload.instanceId);
      out += line('Action', payload.action);
      out += line('Success', r.success);
      if (r.message) out += line('Message', r.message);
      break;
    }
    case 'get':
      if (instance) out += renderInstanceText(instance);
      if (payload.log) out += `\n${colors.cyan('Log tail:')}\n${colors.gray(payload.log)}\n`;
      break;
    case 'stats': {
      const stats = payload.stats || {};
      if (payload.scope === 'engine') {
        Object.entries(stats).forEach(([k, v]) => {
          if (k !== 'byWorkflowDefinition') out += line(k, typeof v === 'object' ? JSON.stringify(v) : v);
        });
      } else {
        out += line('Instance ID', payload.instanceId);
        out += line('Steps', `${stats.completedStepCount} done, ${stats.failedStepCount} failed / ${stats.stepCount}`);
        (stats.steps || []).forEach((s: any) => {
          const status = s.status === 6 ? colors.red(s.statusLabel || 'FAILED') : colors.green(s.statusLabel || String(s.status));
          out += `  • ${colors.white(s.stepName || s.stepId)} [${status}]`;
          if (s.duration != null) out += colors.gray(` ${s.duration}ms`);
          if (s.retryCount) out += colors.yellow(` retries:${s.retryCount}`);
          out += '\n';
        });
      }
      break;
    }
    default:
      out += colors.gray(JSON.stringify(payload, null, 2)) + '\n';
  }

  if (ai) {
    out += `\n${colors.cyan(`AI Summary (${ai.persona}):`)}\n${colors.white(ai.summary || '(no summary produced)')}\n`;
  }
  return out;
}

// ─── Main CLI handler ─────────────────────────────────────────────────────────

const WorkflowCli = async (
  kwargs: string[],
  context: Reactory.Server.IReactoryContext,
): Promise<void> => {
  const rl: ReadLine = context.readline as ReadLine;
  const emit = (text: string): void => { if (rl) rl.write(text); else console.log(text); };

  if (kwargs.length === 0 || kwargs.includes('-h') || kwargs.includes('--help')) {
    emit(colors.green(HelpText));
    return;
  }

  const args = parseArgs(kwargs);

  if (args.help) {
    emit(colors.green(HelpText));
    return;
  }

  if (!args.command) {
    context.error('No command provided. Use -h or --help for usage information.');
    process.exit(1);
  }

  let svc: IReactoryWorkflowService;
  try {
    svc = context.getService<IReactoryWorkflowService>(WORKFLOW_SERVICE_ID);
  } catch (err: any) {
    context.error(`Failed to load ReactoryWorkflowService: ${err.message}`);
    process.exit(1);
  }
  if (!svc) {
    context.error(`${WORKFLOW_SERVICE_ID} is not available. Ensure the reactory-core module is enabled.`);
    process.exit(1);
  }

  const aiRequested = Boolean(args.persona || args.provider || args.model);

  try {
    let outcome: CommandOutcome;
    switch (args.command) {
      case 'start':     outcome = await handleStart(svc, args); break;
      case 'continue':
      case 'resume':    outcome = await handleContinue(svc, args); break;
      case 'get':       outcome = await handleGet(svc, args); break;
      case 'terminate':
      case 'cancel':    outcome = await handleTerminate(svc, args); break;
      case 'stats':     outcome = await handleStats(svc, args); break;
      default:
        context.error(`Unknown command: "${args.command}". Use -h or --help for usage information.`);
        process.exit(1);
        return;
    }

    // Attach a log tail to `get --logs` output now that we have the context.
    if (args.command === 'get' && args.logs && outcome.instance?.workflowDefinitionId && outcome.instanceId) {
      const { logPath, logText } = readInstanceLog(context, outcome.instance.workflowDefinitionId, outcome.instanceId, args.tail);
      outcome.payload.logPath = logPath;
      outcome.payload.log = logText;
    }

    // Optional AI persona summary.
    let ai: { persona: string; provider?: string; model?: string; summary: string } | null = null;
    if (aiRequested) {
      // Ensure we have instance data + a log tail to give the persona.
      let instance = outcome.instance;
      if (!instance && outcome.instanceId) {
        try { instance = await svc.getWorkflowHistoryById(outcome.instanceId); } catch { /* ignore */ }
      }
      const { logPath, logText } = instance?.workflowDefinitionId && outcome.instanceId
        ? readInstanceLog(context, instance.workflowDefinitionId, outcome.instanceId, AI_LOG_TAIL_LINES)
        : { logPath: null, logText: null };

      if (args.output === 'text') {
        context.log('Running AI persona summary…', {}, 'info');
      }

      ai = await runPersonaSummary(
        context,
        { command: args.command, instanceId: outcome.instanceId, instance, payload: outcome.payload, logPath, logText },
        args,
      );
    }

    // Compose the final output document.
    const output: any = { command: args.command, ...outcome.payload };
    if (ai) {
      output.aiPersona = ai.persona;
      if (ai.provider) output.aiProvider = ai.provider;
      if (ai.model) output.aiModel = ai.model;
      output.aiSummary = ai.summary;
    }

    switch (args.output) {
      case 'json':
        console.log(JSON.stringify(output, null, 2));
        break;
      case 'yaml':
        console.log(yaml.dump(output));
        break;
      case 'text':
      default:
        console.log(renderText(args.command, outcome, ai));
        break;
    }
  } catch (err: any) {
    context.error(`Error: ${err.message}`);
    if (args.verbose && err.stack) context.error(err.stack);
    process.exit(1);
  }
};

// ─── CLI definition ───────────────────────────────────────────────────────────

type ReactoryCliDefinition = Reactory.IReactoryComponentDefinition<ReactoryCliApp>;

const WorkflowCliDefinition: ReactoryCliDefinition = {
  nameSpace: 'core',
  name: 'Workflow',
  version: '1.0.0',
  description: HelpText,
  component: WorkflowCli as unknown as ReactoryCliApp,
  domain: Reactory.ComponentDomain.plugin,
  features: [
    {
      feature: 'Workflow',
      featureType: Reactory.FeatureType.function,
      action: ['workflow', 'start', 'continue', 'get', 'terminate', 'stats'],
      stem: 'workflow',
    },
  ],
  overwrite: false,
  roles: ['SYSTEM', 'ADMIN', 'WORKFLOW_ADMIN', 'WORKFLOW_OPERATOR'],
  stem: 'workflow',
  tags: ['workflow', 'instance', 'cli', 'ai', 'persona'],
  toString(includeVersion?: boolean) {
    return includeVersion ? `${this.nameSpace}.${this.name}@${this.version}` : this.name;
  },
};

export default WorkflowCliDefinition;
