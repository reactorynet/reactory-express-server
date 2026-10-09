/**
 * ReactorySupportWorkflowService
 *
 * Integration service backing the Support ticket triage & escalation workflows.
 *
 * WHY THIS EXISTS
 * ---------------
 * YAML workflows run on the durable engine with a context rebuilt per step from
 * a serializable identity. The core support service (`core.ReactorySupportService`)
 * is role-gated and read/write methods take multiple positional arguments, which
 * cannot be invoked from the `service_invoke` step (it passes a SINGLE argument).
 * The `mongo_query` / `mongo_write` steps are not usable in this deployment
 * (no Mongo service is registered and the Reactory context exposes no mongoose
 * handle).
 *
 * This service therefore owns every read/write the support workflows need, using
 * a SINGLE-OBJECT-ARG convention so it is directly callable via `service_invoke`:
 *
 *   - id: core.ReactorySupportWorkflowService@1.0.0
 *   - all public methods accept exactly one params object and return plain,
 *     JSON-serializable data (safe for durable workflow-instance persistence).
 *
 * It also owns:
 *   - loading `~/.reactor/support-routing.yaml` (owner routing, notifications,
 *     priority matrix, status lifecycle, escalation policy);
 *   - least-loaded owner resolution;
 *   - routing all outbound notifications through the reactory-communicator
 *     module by placing messages on its queue.
 */

import Reactory from '@reactorynet/reactory-core';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { ObjectId } from 'mongodb';
import { service } from '@reactory/server-core/application/decorators';
import { roles } from '@reactory/server-core/authentication/decorators';
import ReactorySupportTicketModel from '../models/ReactorySupportTicket';
import UserModel from '../models/User';
import CommunicatorMessageModel from '@reactory/server-modules/reactory-communicator/models/Message';

const SUPPORT_SERVICE_ID = 'core.ReactorySupportService@1.0.0';
const COMMUNICATOR_QUEUE_SERVICE_ID = 'communicator.CommunicatorQueueService@1.0.0';
const COMMUNICATOR_MESSAGE_SERVICE_ID = 'communicator.MessageService@1.0.0';

/** Canonical storage form for enumeration values: lowercase snake_case. */
const canonicalEnum = (value: string): string =>
  String(value ?? '').trim().toLowerCase().replace(/-/g, '_');

/** Both kebab and snake variants, so filters match either stored convention. */
const enumVariants = (values: string | string[]): string[] => {
  const variants = new Set<string>();
  (Array.isArray(values) ? values : [values]).forEach((value) => {
    const raw = String(value ?? '').trim().toLowerCase();
    if (!raw) return;
    variants.add(raw);
    variants.add(raw.replace(/-/g, '_'));
    variants.add(raw.replace(/_/g, '-'));
  });
  return Array.from(variants);
};

/**
 * An unresolved optional `${...}` template token is passed through verbatim by
 * the step template resolver (by design, so callers can detect "not supplied").
 * Treat any such token — or an empty string — as absent before using the value.
 */
const cleanArg = <T = any>(value: T): T | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '' || trimmed.includes('${')) return undefined;
  }
  return value === null ? undefined : value;
};

// ─────────────────────────────────────────────────────────────────────────────
// support-routing.yaml — typed shape + loader (mtime-cached, fail-safe)
// ─────────────────────────────────────────────────────────────────────────────

export interface ISupportRoutingConfig {
  version?: string;
  ownerRouting?: {
    assignment?: {
      singleAssignee?: boolean;
      strategy?: string;
      loadStatuses?: string[];
      tieBreakers?: string[];
      fallbackEmails?: string[];
      /**
       * When true and NO candidate email resolves to a user account (e.g. the
       * routing file still holds placeholder addresses in a non-production
       * environment), fall back to the system user (SYSTEM_USER_EMAIL) so
       * ownership can still be assigned. Marked with source 'system-fallback'
       * and logged as a warning so misconfiguration stays visible.
       */
      fallbackToSystemUser?: boolean;
    };
    rules?: Record<string, { emails?: string[] }>;
  };
  notifications?: {
    transport?: {
      provider?: string;
      queueService?: string;
      mode?: string;
      channels?: string[];
      priorityMap?: Record<string | number, string>;
      maxRetries?: number;
    };
    recipients?: Record<string, string>;
    rules?: Array<{
      priority: number;
      id: string;
      description?: string;
      event: string;
      when?: string;
      channel?: string;
      to?: string[];
      template?: string;
    }>;
  };
  clocks?: Record<string, any>;
  priorityMatrix?: {
    default?: string;
    levels?: Record<
      string,
      {
        rank?: number;
        firstResponseTarget?: { minutes: number };
        updateIntervalTarget?: { minutes: number };
        resolutionTarget?: { minutes: number };
        clock?: string;
        escalateOnMissedUpdates?: number;
        notifyPriority?: number;
      }
    >;
  };
  statuses?: {
    canonical?: string[];
    storageForm?: string;
    terminal?: string[];
    active?: string[];
    lifecycle?: Record<string, string[]>;
  };
  escalation?: Record<string, any>;
  [key: string]: any;
}

/** Defaults used when the routing file is absent or invalid — never crash a run. */
const DEFAULT_LOAD_STATUSES = ['new', 'open', 'in_progress', 'blocked'];
const DEFAULT_ACTIVE_STATUSES = ['new', 'open', 'in_progress', 'blocked'];
const DEFAULT_TERMINAL_STATUSES = ['resolved', 'withdrawn', 'closed'];
const DEFAULT_FALLBACK_EMAILS = ['support@reactory.net'];

interface IRoutingConfigCache {
  mtimeMs: number;
  config: ISupportRoutingConfig;
}

let routingConfigCache: IRoutingConfigCache | null = null;

/** Resolve the routing config path, mirroring the ~/.reactor providers.yaml convention. */
export const resolveRoutingConfigPath = (): string =>
  path.join(process.env.HOME || '/', '.reactor', 'support-routing.yaml');

/**
 * Load `~/.reactor/support-routing.yaml`, re-reading only when the file's
 * mtime changes. Any failure degrades to the last good config, or `{}`.
 */
export const loadSupportRoutingConfig = (): ISupportRoutingConfig => {
  const filePath = resolveRoutingConfigPath();
  try {
    const stat = fs.statSync(filePath);
    if (routingConfigCache && routingConfigCache.mtimeMs === stat.mtimeMs) {
      return routingConfigCache.config;
    }
    const parsed = (yaml.load(fs.readFileSync(filePath, 'utf8')) || {}) as ISupportRoutingConfig;
    routingConfigCache = { mtimeMs: stat.mtimeMs, config: parsed };
    return parsed;
  } catch {
    return routingConfigCache?.config ?? {};
  }
};

/** Statuses considered "open work" (used for owner load and escalation). */
const loadStatuses = (config: ISupportRoutingConfig): string[] =>
  config?.ownerRouting?.assignment?.loadStatuses?.length
    ? config.ownerRouting.assignment.loadStatuses
    : config?.statuses?.active?.length
      ? config.statuses.active
      : DEFAULT_LOAD_STATUSES;

const activeStatuses = (config: ISupportRoutingConfig): string[] =>
  config?.statuses?.active?.length ? config.statuses.active : DEFAULT_ACTIVE_STATUSES;

const terminalStatuses = (config: ISupportRoutingConfig): string[] =>
  config?.statuses?.terminal?.length ? config.statuses.terminal : DEFAULT_TERMINAL_STATUSES;

// ─────────────────────────────────────────────────────────────────────────────
// Parameter shapes (single-object-arg convention)
// ─────────────────────────────────────────────────────────────────────────────

export interface IFindNewTicketsParams {
  limit?: number;
  sinceMinutes?: number;
  statuses?: string[];
  requestTypes?: string[];
}

export interface ILoadTicketParams {
  id?: string;
  reference?: string;
}

export interface IResolveOwnerParams {
  requestType?: string;
  loadStatuses?: string[];
}

export interface ISupportTriageDecision {
  category?: string;
  requestType?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low' | string;
  assignedToUserId?: string;
  ownerEmail?: string;
  ownerRationale?: string;
  status?: string;
  summary?: string;
  followUpRequired?: boolean;
  delegatedPersona?: string;
  confidence?: number;
}

export interface IApplyTriageParams {
  ticketId: string;
  decision: ISupportTriageDecision;
  triagedBy?: string;
  comment?: string;
}

export interface INotifyParams {
  event: string;
  ticketId?: string;
  level?: number;
  to?: string[];
  extra?: Record<string, any>;
}

export interface IEscalationApplyParams {
  ticketId: string;
  level: number;
  actions?: string[];
}

export interface IFindSlaBreachesParams {
  /** Max breaches to return per run (default 50). */
  limit?: number;
}

// ─────────────────────────────────────────────────────────────────────────────

@service({
  id: 'core.ReactorySupportWorkflowService@1.0.0',
  nameSpace: 'core',
  name: 'ReactorySupportWorkflowService',
  version: '1.0.0',
  description:
    'Integration service for the Support triage & escalation workflows: ticket reads/writes, owner routing, and communicator-queue notifications.',
  serviceType: 'support',
  secondaryTypes: ['workflow', 'customerManagement'],
})
class ReactorySupportWorkflowService {
  private context: Reactory.Server.IReactoryContext;

  constructor(_props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.context = context;
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, meta?: any): void {
    try {
      this.context?.log?.(`[SupportWorkflow] ${message}`, meta || {}, level, 'core.ReactorySupportWorkflowService@1.0.0');
    } catch {
      /* logging must never break a workflow step */
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Reads
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Find tickets awaiting triage: by default `status: new`, unassigned, created
   * within the look-back window. Returns minimal, JSON-serializable rows.
   */
  @roles(['ADMIN', 'SUPPORT_ADMIN', 'SUPPORT'])
  async findNewTickets(params: IFindNewTicketsParams = {}): Promise<{ tickets: any[]; count: number }> {
    const config = loadSupportRoutingConfig();
    const {
      limit = 25,
      sinceMinutes = 7 * 24 * 60,
      statuses = ['new'],
    } = params || {};

    const createdAfter = new Date(Date.now() - sinceMinutes * 60 * 1000);
    const filter: any = {
      status: { $in: enumVariants(statuses) },
      createdDate: { $gte: createdAfter },
      $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }],
    };

    const rows = await ReactorySupportTicketModel.find(filter)
      .sort({ createdDate: 1 })
      .limit(Math.max(1, Math.min(limit, 200)))
      .lean()
      .exec();

    const tickets = (rows || []).map((t: any) => ({
      id: t._id?.toString?.() ?? String(t._id),
      reference: t.reference,
      request: t.request,
      requestType: t.requestType,
      priority: t.priority,
      status: t.status,
      createdDate: t.createdDate,
      assignedTo: t.assignedTo ? String(t.assignedTo) : null,
    }));

    this.log('info', `findNewTickets: ${tickets.length} candidate(s)`, { statuses, limit, sinceMinutes });
    return { tickets, count: tickets.length };
  }

  /** Load a single ticket by id or reference, returning a serializable snapshot. */
  @roles(['ADMIN', 'SUPPORT_ADMIN', 'SUPPORT'])
  async loadTicket(params: ILoadTicketParams = {}): Promise<any | null> {
    const id = cleanArg(params?.id);
    const reference = cleanArg(params?.reference);
    if (!id && !reference) {
      this.log('warn', 'loadTicket called without id or reference');
      return null;
    }

    const query = id ? { _id: new ObjectId(String(id)) } : { reference: String(reference) };
    const ticket = await ReactorySupportTicketModel.findOne(query)
      .populate('createdBy assignedTo')
      .lean()
      .exec();

    if (!ticket) return null;

    return this.serializeTicket(ticket);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Owner routing (least-loaded)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Resolve the single owner for a ticket's requestType.
   *
   * Reads the candidate emails from `support-routing.yaml`, resolves them to
   * user accounts, and selects the LEAST-LOADED candidate (fewest active tickets).
   * Tie-break: the candidate whose most recent assignment is oldest, then email
   * order (deterministic). Falls back to `fallbackEmails` when a rule is missing
   * or no candidate resolves.
   */
  @roles(['ADMIN', 'SUPPORT_ADMIN', 'SUPPORT'])
  async resolveOwner(params: IResolveOwnerParams = {}): Promise<{
    userId: string | null;
    email: string | null;
    load: number | null;
    candidates: Array<{ userId: string; email: string; load: number; lastAssignedAt: string | null }>;
    source: 'rule' | 'fallback' | 'system-fallback' | 'none';
  }> {
    const config = loadSupportRoutingConfig();
    const requestType = String(cleanArg(params?.requestType) || 'general').trim().toLowerCase();
    const rule = config?.ownerRouting?.rules?.[requestType];
    const fallbacks = config?.ownerRouting?.assignment?.fallbackEmails?.length
      ? config.ownerRouting.assignment.fallbackEmails
      : DEFAULT_FALLBACK_EMAILS;

    const source: 'rule' | 'fallback' | 'none' = rule?.emails?.length ? 'rule' : 'fallback';
    const emails = (rule?.emails?.length ? rule.emails : fallbacks)
      .map((e) => String(e).trim().toLowerCase())
      .filter(Boolean);

    if (emails.length === 0) {
      return { userId: null, email: null, load: null, candidates: [], source: 'none' };
    }

    const users = await UserModel.find({ email: { $in: emails } })
      .select({ email: 1, firstName: 1, lastName: 1 })
      .lean()
      .exec();

    if (!users || users.length === 0) {
      this.log('warn', `resolveOwner: no user accounts resolved for ${emails.join(', ')}`);
      // Dev-friendly, explicitly-opt-in fallback so a pipeline with placeholder
      // routing addresses can still assign ownership.
      if (config?.ownerRouting?.assignment?.fallbackToSystemUser === true) {
        const sys = await this.systemUserCandidate();
        if (sys) {
          this.log('warn', `resolveOwner: falling back to system user ${sys.email}`);
          return {
            userId: sys.userId,
            email: sys.email,
            load: 0,
            candidates: [{ ...sys, load: 0, lastAssignedAt: null }],
            source: 'system-fallback',
          };
        }
      }
      return { userId: null, email: null, load: null, candidates: [], source };
    }

    const idToEmail = new Map<string, string>();
    const candidateIds: ObjectId[] = [];
    for (const u of users as any[]) {
      const userId = u._id?.toString?.() ?? String(u._id);
      idToEmail.set(userId, String(u.email || '').toLowerCase());
      candidateIds.push(new ObjectId(userId));
    }

    const statuses = params?.loadStatuses?.length ? params.loadStatuses : loadStatuses(config);
    const loadRows = await ReactorySupportTicketModel.aggregate([
      { $match: { assignedTo: { $in: candidateIds }, status: { $in: enumVariants(statuses) } } },
      { $group: { _id: '$assignedTo', load: { $sum: 1 }, lastAssignedAt: { $max: '$updatedDate' } } },
    ]).exec();

    const loadById = new Map<string, { load: number; lastAssignedAt: Date | null }>();
    for (const row of loadRows as any[]) {
      loadById.set(String(row._id), { load: row.load || 0, lastAssignedAt: row.lastAssignedAt || null });
    }

    const candidates = Array.from(idToEmail.entries()).map(([userId, email]) => {
      const entry = loadById.get(userId);
      return {
        userId,
        email,
        load: entry?.load ?? 0,
        lastAssignedAt: entry?.lastAssignedAt ? new Date(entry.lastAssignedAt).toISOString() : null,
      };
    });

    candidates.sort((a, b) => {
      if (a.load !== b.load) return a.load - b.load; // least loaded first
      const aTime = a.lastAssignedAt ? Date.parse(a.lastAssignedAt) : 0;
      const bTime = b.lastAssignedAt ? Date.parse(b.lastAssignedAt) : 0;
      if (aTime !== bTime) return aTime - bTime; // oldest last-assignment first
      return a.email.localeCompare(b.email); // deterministic
    });

    const winner = candidates[0];
    this.log('info', `resolveOwner(${requestType}) → ${winner.email} (load ${winner.load})`, {
      source,
      candidates,
    });

    return { userId: winner.userId, email: winner.email, load: winner.load, candidates, source };
  }

  /**
   * Resolve the L3 escalation owner.
   *
   * Prefers `escalation.reassignToEmail`, then the notification `supportLead`
   * recipient, then the system account — and falls back to the run's execution
   * identity if none resolve, so a reassignment always targets a real user.
   */
  private async resolveEscalationOwner(config: any): Promise<{ userId: string; email: string } | null> {
    const configured =
      config?.escalation?.reassignToEmail ||
      config?.notifications?.recipients?.supportLead;

    if (configured) {
      try {
        const email = String(configured).trim().toLowerCase();
        const user: any = await UserModel.findOne({ email }).select({ email: 1 }).lean().exec();
        if (user?._id) return { userId: user._id.toString(), email };
      } catch {
        /* fall through to the execution identity */
      }
    }

    return this.systemUserCandidate();
  }

  /**
   * Last-resort owner candidate for the dev fallback.
   *
   * Prefers the workflow's EXECUTION IDENTITY (`this.context.user`) — which is the
   * account the run is actually executing as (the schedule's `runAs` user, or the
   * system user) — because that user is guaranteed to exist and to hold the roles
   * needed to work the ticket. Falls back to a lookup of `SYSTEM_USER_EMAIL`.
   */
  private async systemUserCandidate(): Promise<{ userId: string; email: string } | null> {
    const ctxUser: any = (this.context as any)?.user;
    if (ctxUser?._id) {
      return {
        userId: ctxUser._id.toString(),
        email: String(ctxUser.email || '').toLowerCase(),
      };
    }

    const email = process.env.SYSTEM_USER_EMAIL;
    if (!email) return null;
    try {
      const user: any = await UserModel.findOne({ email }).select({ email: 1 }).lean().exec();
      if (!user) return null;
      return {
        userId: user._id?.toString?.() ?? String(user._id),
        email: String(email).toLowerCase(),
      };
    } catch {
      return null;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Writes
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Apply an AI triage decision to a ticket: assignment, priority, requestType,
   * canonical status, `triaged` tag and the first-class `triage` bookkeeping.
   * Idempotent — callers guard on `triage.triagedAt` before invoking.
   */
  @roles(['ADMIN', 'SUPPORT_ADMIN', 'SUPPORT'])
  async applyTriage(params: IApplyTriageParams): Promise<any> {
    const ticketId = cleanArg(params?.ticketId);
    const { decision = {}, triagedBy = 'support' } = params || {};
    if (!ticketId) throw new Error('applyTriage: ticketId is required');

    const ticket: any = await ReactorySupportTicketModel.findById(ticketId).exec();
    if (!ticket) throw new Error(`applyTriage: ticket ${ticketId} not found`);

    const set: Record<string, any> = { updatedDate: new Date() };

    // RECONCILE, don't clobber. The AI triage turn runs with tools enabled, so
    // the agent has usually already applied the assignment / priority / status
    // via `updateSupportTicket`. This step is the deterministic safety net and
    // bookkeeping pass: it only fills gaps the agent left behind.

    // Assignment — only ever an internal user id (never an agent), and only when
    // the ticket is still unassigned.
    if (!ticket.assignedTo && decision.assignedToUserId) {
      set.assignedTo = new ObjectId(decision.assignedToUserId);
    }
    // Priority — only when the agent did not set one (still at the model default).
    if (decision.priority && (!ticket.priority || String(ticket.priority).toLowerCase() === 'medium')) {
      set.priority = String(decision.priority).trim().toLowerCase();
    }
    // Request type — only when still at the default.
    if (decision.requestType && (!ticket.requestType || String(ticket.requestType).toLowerCase() === 'general')) {
      set.requestType = String(decision.requestType).trim().toLowerCase();
    }

    // Status: canonical snake_case. Only advance out of `new`; never downgrade a
    // status the agent (or a human) already set.
    if (!ticket.status || canonicalEnum(ticket.status) === 'new') {
      set.status = decision.status ? canonicalEnum(decision.status) : 'open';
    }

    // Tag the ticket as triaged (idempotent — avoid duplicates).
    const tags: string[] = Array.isArray(ticket.tags) ? [...ticket.tags] : [];
    if (!tags.includes('triaged')) tags.push('triaged');
    set.tags = tags;

    // Audit trail — the first-class `triage` subdocument.
    set.triage = {
      triagedAt: new Date(),
      triagedBy,
      category: decision.category ?? decision.requestType ?? null,
      priority: decision.priority ?? null,
      assignedToUserId: decision.assignedToUserId ?? null,
      ownerEmail: decision.ownerEmail ?? null,
      ownerRationale: decision.ownerRationale ?? null,
      followUpRequired: decision.followUpRequired ?? false,
      delegatedPersona: decision.delegatedPersona ?? null,
      confidence: typeof decision.confidence === 'number' ? decision.confidence : null,
      summary: decision.summary ?? null,
    };

    // `triage` is a declared schema path — a normal mongoose update persists it.
    // No native-driver bypass and no strict-mode stripping needed.
    await ReactorySupportTicketModel.updateOne({ _id: ticket._id }, { $set: set }).exec();

    // Optional triage note as a ticket comment.
    if (decision.summary || params.comment) {
      await this.appendComment(ticket._id.toString(), params.comment || decision.summary);
    }

    const updated = await ReactorySupportTicketModel.findById(ticketId).lean().exec();
    this.log('info', `applyTriage: ticket ${ticketId} triaged`, { status: set.status ?? ticket.status, priority: set.priority });

    return this.serializeTicket(updated);
  }

  /**
   * Apply an escalation level's deterministic side effects (tag, priority bump,
   * reassignment) and stamp the first-class `escalation` subdocument. Comments/notifications are handled
   * by the caller so they can be composed per the escalation policy.
   */
  @roles(['ADMIN', 'SUPPORT_ADMIN', 'SUPPORT'])
  async applyEscalation(params: IEscalationApplyParams): Promise<any> {
    const ticketId = cleanArg(params?.ticketId);
    const level = Number(cleanArg(params?.level) ?? 0) || 0;
    if (!ticketId) throw new Error('applyEscalation: ticketId is required');

    const ticket: any = await ReactorySupportTicketModel.findById(ticketId).exec();
    if (!ticket) throw new Error(`applyEscalation: ticket ${ticketId} not found`);

    const config = loadSupportRoutingConfig();
    // Derive the ladder actions from policy when the caller does not pass a
    // concrete array (a `${...}` reference to an array arrives as JSON text).
    const ladderLevel = (config?.escalation?.ladder || []).find(
      (l: any) => Number(l.level) === level,
    );
    const actions: string[] = Array.isArray(params?.actions)
      ? (params.actions as string[])
      : ((ladderLevel?.actions as string[]) || ['comment', 'notify', 'tag']);

    const set: Record<string, any> = { updatedDate: new Date() };

    const tags: string[] = Array.isArray(ticket.tags) ? [...ticket.tags] : [];
    if (!tags.includes('sla-breach')) tags.push('sla-breach');
    set.tags = tags;

    if (actions.includes('bumpPriority')) {
      const order = ['low', 'medium', 'high', 'critical'];
      const current = String(ticket.priority || 'medium').toLowerCase();
      const idx = order.indexOf(current);
      if (idx >= 0 && idx < order.length - 1) set.priority = order[idx + 1];
    }

    // L3 — reassign to the configured escalation owner. Ownership must remain a
    // real user account, so we resolve the configured email (falling back to the
    // run's execution identity) rather than leaving the stale owner in place.
    if (actions.includes('reassign')) {
      const owner = await this.resolveEscalationOwner(config);
      if (owner?.userId) set.assignedTo = new ObjectId(owner.userId);
    }

    // Escalation bookkeeping — the first-class `escalation` subdocument. Only the
    // fields this run owns are set, so an explicit `holdUntil` (written
    // out-of-band to pause escalation) survives; the trail is appended.
    set['escalation.level'] = level;
    set['escalation.lastEscalatedAt'] = new Date();
    set['escalation.actions'] = actions;
    set['escalation.policy'] = config?.escalation?.baseline ?? null;

    await ReactorySupportTicketModel.updateOne(
      { _id: ticket._id },
      {
        $set: set,
        $push: { 'escalation.history': { level, at: new Date(), actions } },
      },
    ).exec();

    // An escalation touch counts as an update: record a comment so the ticket's
    // audit trail explains why it was escalated.
    if (actions.includes('comment')) {
      await this.appendComment(
        ticketId,
        `Escalated to L${level} — SLA update interval missed (${actions.join(', ')}).`,
      );
    }

    const updated = await ReactorySupportTicketModel.findById(ticketId).lean().exec();
    this.log('info', `applyEscalation: ticket ${ticketId} escalated to L${level}`, { actions });
    return this.serializeTicket(updated);
  }

  /** Append a comment to a ticket (supports the triage note + escalation notes). */
  @roles(['ADMIN', 'SUPPORT_ADMIN', 'SUPPORT'])
  async appendComment(ticketId: string, comment: string): Promise<any> {
    if (!ticketId || !comment) return null;
    try {
      const supportService: any = this.context.getService(SUPPORT_SERVICE_ID);
      // The core service enforces its own permissions; run it under the current
      // (support) identity when available, else fall back to a direct write.
      if (supportService?.addComment) {
        return await supportService.addComment(ticketId, comment);
      }
    } catch (e: any) {
      this.log('warn', `appendComment via service failed, falling back to direct write: ${e?.message}`);
    }

    // Direct fallback: create a comment document and attach it to the ticket.
    try {
      const CommentModel = require('../models/Comment').default;
      const userId = (this.context as any)?.user?._id;
      const commentDoc = await CommentModel.create({
        text: comment,
        user: userId,
        context: 'ReactorySupportTicket',
        contextId: new ObjectId(ticketId),
        createdAt: new Date(),
      });
      await ReactorySupportTicketModel.updateOne(
        { _id: new ObjectId(ticketId) },
        { $push: { comments: commentDoc._id }, $set: { updatedDate: new Date() } },
      ).exec();
      return { id: commentDoc._id?.toString?.() ?? String(commentDoc._id), text: comment };
    } catch (e: any) {
      this.log('error', `appendComment failed: ${e?.message}`);
      return null;
    }
  }

  /**
   * Find ACTIVE tickets that have breached their update-interval SLA.
   *
   * The interval is resolved PER TICKET from the priority matrix in
   * `support-routing.yaml` (`updateIntervalTarget.minutes`; baseline 24h for the
   * default/medium priority). The escalation level is derived from how many whole
   * intervals have elapsed, using the configured ladder (`afterMissedIntervals`).
   * Terminal statuses and tickets held via `escalation.holdUntil` (in the
   * future) are excluded.
   */
  @roles(['ADMIN', 'SUPPORT_ADMIN', 'SUPPORT'])
  async findSlaBreaches(params: IFindSlaBreachesParams = {}): Promise<{ breaches: any[]; count: number }> {
    const config = loadSupportRoutingConfig();
    const { limit = 50 } = params || {};

    const levels = config?.priorityMatrix?.levels || {};
    const defaultPriority = String(config?.priorityMatrix?.default || 'medium').toLowerCase();
    const ladder = (config?.escalation?.ladder || [])
      .slice()
      .sort((a: any, b: any) => Number(a.level) - Number(b.level));
    const active = activeStatuses(config);

    const intervalMinutesFor = (priority?: string): number => {
      const key = String(priority || defaultPriority).toLowerCase();
      const lvl: any = (levels as any)[key] || (levels as any)[defaultPriority] || {};
      const minutes = lvl?.updateIntervalTarget?.minutes;
      return typeof minutes === 'number' && minutes > 0 ? minutes : 1440;
    };

    // Narrow the scan to tickets older than the SMALLEST configured interval.
    const allIntervals = Object.values(levels)
      .map((l: any) => l?.updateIntervalTarget?.minutes)
      .filter((m: any) => typeof m === 'number' && m > 0) as number[];
    const minInterval = allIntervals.length ? Math.min(...allIntervals) : 1440;
    const staleBefore = new Date(Date.now() - minInterval * 60 * 1000);

    const rows = await ReactorySupportTicketModel.find({
      status: { $in: enumVariants(active) },
      updatedDate: { $lt: staleBefore },
    })
      .populate('assignedTo')
      .sort({ updatedDate: 1 })
      .limit(Math.max(1, Math.min(limit, 200)))
      .lean()
      .exec();

    const now = Date.now();
    const breaches: any[] = [];
    for (const t of rows as any[]) {
      const holdUntil = t?.escalation?.holdUntil;
      if (holdUntil && Date.parse(holdUntil) > now) continue;

      const intervalMinutes = intervalMinutesFor(t.priority);
      const lastActivity = new Date(t.updatedDate || t.createdDate).getTime();
      const elapsedMinutes = (now - lastActivity) / 60000;
      const missedIntervals = Math.floor(elapsedMinutes / intervalMinutes);
      if (missedIntervals < 1) continue;

      // Highest ladder level whose threshold is met.
      let level = 1;
      for (const l of ladder as any[]) {
        if (missedIntervals >= Number(l.afterMissedIntervals ?? l.level)) level = Number(l.level);
      }
      const ladderEntry = (ladder as any[]).find((l: any) => Number(l.level) === level);

      breaches.push({
        id: t._id?.toString?.() ?? String(t._id),
        reference: t.reference,
        request: t.request,
        status: t.status,
        priority: t.priority,
        assignedTo: t.assignedTo?._id?.toString?.() ?? (t.assignedTo ? String(t.assignedTo) : null),
        assignedToEmail: t.assignedTo?.email ?? null,
        updatedDate: t.updatedDate,
        intervalMinutes,
        elapsedMinutes: Math.round(elapsedMinutes),
        hoursSinceUpdate: Math.round(elapsedMinutes / 60),
        missedIntervals,
        level,
        actions: ladderEntry?.actions || ['comment', 'notify', 'tag'],
      });
    }

    this.log('info', `findSlaBreaches: ${breaches.length} breach(es)`, { minInterval, limit });
    return { breaches, count: breaches.length };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Notifications — routed via the reactory-communicator queue
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Notify per the `notifications` routing rules in `support-routing.yaml`.
   * The FIRST matching rule by ascending `priority` wins. Delivery is delegated
   * to the reactory-communicator module by placing a message on its queue —
   * nothing is sent inline. Degrades gracefully (returns `queued:false`) when the
   * communicator is unavailable, so a workflow step never fails on notification.
   */
  @roles(['ADMIN', 'SUPPORT_ADMIN', 'SUPPORT'])
  async notify(params: INotifyParams): Promise<{ queued: boolean; ruleId?: string; messageId?: string; to?: string[]; reason?: string }> {
    const event = cleanArg(params?.event);
    const ticketId = cleanArg(params?.ticketId);
    const { level, to: toOverride } = params || {};
    if (!event) return { queued: false, reason: 'no event supplied' };

    const config = loadSupportRoutingConfig();
    const rules = (config?.notifications?.rules || []).slice().sort((a, b) => a.priority - b.priority);

    const ticket = ticketId ? await this.loadTicket({ id: ticketId }) : null;

    const rule = this.matchRule(rules, event, level, ticket);
    if (!rule) return { queued: false, reason: `no notification rule matched event '${event}'` };

    const transport = config?.notifications?.transport || {};
    const priorityMap: Record<string, string> = {
      '1': 'critical',
      '2': 'high',
      '3': 'normal',
      '4': 'normal',
      '5': 'low',
      ...(transport.priorityMap || {}),
    };
    const communicatorPriority = priorityMap[String(rule.priority)] || 'normal';
    const channel = rule.channel || 'email';

    const recipients = this.resolveRecipients(
      toOverride || rule.to || [],
      ticket,
      config?.notifications?.recipients || {},
    );

    if (recipients.length === 0) {
      return { queued: false, ruleId: rule.id, reason: 'no recipients resolved' };
    }

    const subject = `${rule.template || 'support/notification'} — ${ticket?.reference || ticketId || ''}`.trim();
    const content = this.renderNotification(rule, ticket, level, params.extra);

    try {
      const queueService: any = this.context.getService(COMMUNICATOR_QUEUE_SERVICE_ID);
      if (!queueService?.enqueueMessage) {
        return { queued: false, ruleId: rule.id, reason: 'communicator queue service unavailable' };
      }

      const partner = (this.context as any)?.partner;
      const partnerId = partner?._id?.toString?.() || partner?.id || partner?.key;
      const userId = (this.context as any)?.user?._id?.toString?.();

      // Create the message via the communicator's OWN Message model, then enqueue —
      // exactly what the `communicatorSendMessage` GraphQL resolver does.
      //
      // We deliberately do NOT use `communicator.MessageService.createMessage`: it
      // audits via `auditService.log(...)`, but `ReactoryAuditService` exposes
      // `logAuditEvent` (no `log`), so that path throws
      // "this.auditService.log is not a function". The model+enqueue path is the
      // supported, working route.
      //
      // The schema also requires a unique `id`, which nothing generates for us.
      const message = await CommunicatorMessageModel.create({
        id: randomUUID(),
        partnerId,
        userId,
        channel,
        to: recipients.join(','),
        subject,
        content,
        priority: communicatorPriority,
        status: 'pending',
        maxRetries: transport.maxRetries ?? 5,
        metadata: {
          source: 'support-workflow',
          event,
          ruleId: rule.id,
          ticketId: ticketId || null,
          ticketReference: ticket?.reference || null,
          level: level ?? null,
        },
      });

      await queueService.enqueueMessage(message?.toObject ? message.toObject() : message, communicatorPriority);

      this.log('info', `notify(${event}) queued via communicator`, {
        ruleId: rule.id,
        priority: communicatorPriority,
        recipients,
      });
      return { queued: true, ruleId: rule.id, messageId: message?.id, to: recipients };
    } catch (e: any) {
      this.log('error', `notify(${event}) failed to enqueue: ${e?.message}`);
      return { queued: false, ruleId: rule.id, reason: e?.message };
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────────────────────────────────

  private matchRule(rules: any[], event: string, level: number | undefined, ticket: any): any | null {
    for (const rule of rules) {
      if (rule.event !== event) continue;
      if (rule.when && !this.evaluateWhen(rule.when, level, ticket)) continue;
      return rule;
    }
    return null;
  }

  /** Minimal, safe evaluator for the small `when` expressions in the config. */
  private evaluateWhen(expr: string, level: number | undefined, ticket: any): boolean {
    try {
      const escalationLevel = level ?? 0;
      // eslint-disable-next-line no-new-func
      const fn = new Function(
        'ticket',
        'escalation',
        'level',
        `"use strict"; try { return (${expr}); } catch (e) { return false; }`,
      );
      return Boolean(fn(ticket || {}, { level: escalationLevel }, escalationLevel));
    } catch {
      return false;
    }
  }

  /**
   * Resolve notification recipient aliases to concrete email addresses.
   *
   * Aliases come from `notifications.<rule>.to` (e.g. `assignee`, `reporter`,
   * `supportTeam`, `supportLead`). The serialized ticket exposes the resolved
   * addresses as `assignedToEmail` / `createdByEmail`; the routing config's
   * `recipients` map may point at those same paths OR hold a literal address.
   *
   * Resolution order for each entry:
   *   1. a literal address (contains '@');
   *   2. a known person alias (assignee / reporter);
   *   3. a team alias from the config's `recipients` (supportTeam / supportLead);
   *   4. `<alias>Email` on the ticket (e.g. assignedToEmail / createdByEmail).
   *   5. an `aliasMap[alias]` whose value is itself a literal address.
   */
  private resolveRecipients(aliases: string[], ticket: any, aliasMap: Record<string, string>): string[] {
    const out = new Set<string>();
    const isEmail = (v: any): v is string => typeof v === 'string' && v.includes('@');

    // Person aliases resolved from the serialized ticket.
    const personAliases: Record<string, any> = {
      assignee: ticket?.assignedToEmail,
      assignedTo: ticket?.assignedToEmail,
      reporter: ticket?.createdByEmail,
      createdBy: ticket?.createdByEmail,
    };

    for (const raw of aliases || []) {
      const alias = String(raw || '').trim();
      if (!alias) continue;

      // 1. literal address
      if (alias.includes('@')) { out.add(alias); continue; }

      // 2. person alias from the ticket
      if (isEmail(personAliases[alias])) { out.add(personAliases[alias]); continue; }

      // 3. team alias from the config recipients map (may be a literal address)
      if (isEmail(aliasMap?.[alias])) { out.add(aliasMap[alias]); continue; }

      // 4. `<alias>Email` on the ticket
      const camel = `${alias}Email`;
      if (isEmail(ticket?.[camel])) { out.add(ticket[camel]); continue; }
      if (isEmail(ticket?.[alias])) { out.add(ticket[alias]); continue; }
    }

    return Array.from(out);
  }

  private renderNotification(rule: any, ticket: any, level: number | undefined, extra?: any): string {
    const lines = [
      `Notification: ${rule.id}`,
      rule.description ? `${rule.description}` : '',
      ticket ? `Ticket: ${ticket.reference || ticket.id} — ${ticket.request}` : '',
      ticket ? `Status: ${ticket.status} | Priority: ${ticket.priority} | Type: ${ticket.requestType}` : '',
      level ? `Escalation level: L${level}` : '',
      extra ? `Context: ${JSON.stringify(extra)}` : '',
      'This is an automated support workflow notification.',
    ];
    return lines.filter(Boolean).join('\n');
  }

  /** Serialize a ticket (possibly a lean doc or a populated doc) to plain JSON. */
  private serializeTicket(ticket: any): any {
    if (!ticket) return null;
    const obj = typeof ticket.toObject === 'function' ? ticket.toObject() : ticket;
    return {
      id: obj._id?.toString?.() ?? (obj.id ? String(obj.id) : null),
      reference: obj.reference,
      request: obj.request,
      description: obj.description,
      requestType: obj.requestType,
      status: obj.status,
      priority: obj.priority,
      tags: Array.isArray(obj.tags) ? obj.tags : [],
      createdDate: obj.createdDate,
      updatedDate: obj.updatedDate,
      slaDeadline: obj.slaDeadline,
      meta: obj.meta || {},
      triage: obj.triage ?? null,
      escalation: obj.escalation ?? null,
      createdBy: obj.createdBy?._id?.toString?.() ?? (obj.createdBy ? String(obj.createdBy) : null),
      createdByEmail: obj.createdBy?.email ?? null,
      assignedTo: obj.assignedTo?._id?.toString?.() ?? (obj.assignedTo ? String(obj.assignedTo) : null),
      assignedToEmail: obj.assignedTo?.email ?? null,
    };
  }

  // ── Service lifecycle ──────────────────────────────────────────────────────

  async onStartup(): Promise<any> {
    return Promise.resolve(true);
  }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
  }

  setExecutionContext(context: Reactory.Server.IReactoryContext): boolean {
    this.context = context;
    return true;
  }
}


export default ReactorySupportWorkflowService;
