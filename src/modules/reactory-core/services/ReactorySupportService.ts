import Reactory from '@reactorynet/reactory-core';
import { HashUnsigned } from '@reactory/server-core/utils/hash';
import { roles } from '@reactory/server-core/authentication/decorators';
import moment from 'moment';
import { QueryWithHelpers } from 'mongoose';
import ReactorySupportTicketModel from '../models/ReactorySupportTicket';
import ReactoryCommentModel from '../models/Comment';
import ReactoryFileModel from '@reactory/server-modules/reactory-core/models/CoreFile';
import { InsufficientPermissions } from '@reactory/server-core/exceptions';
import { ObjectId } from 'mongodb';
import { service } from '@reactory/server-core/application/decorators';
import { safeCDNUrl } from '@reactory/server-core/utils/url/safeUrl';

/**
 * Support tickets are persisted with snake_case enumerations (e.g. `in_progress`)
 * while some UI components were written against kebab-case (`in-progress`).
 * Because the query layer performs an exact `$in` match, a casing mismatch makes
 * filters silently return nothing (observed: the "Open" quick filter matched 0
 * of 3 open tickets).
 *
 * `enumVariants` expands a requested value into every known casing variant so a
 * lookup matches regardless of which convention produced the stored value.
 */
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

/** Canonical storage form for enumeration values: lowercase snake_case. */
const canonicalEnum = (value: string): string =>
  String(value ?? '').trim().toLowerCase().replace(/-/g, '_');

/**
 * Everything a reader needs to interpret a single ticket without a second round
 * trip: the people involved, the conversation (with its authors), and the
 * attachments.
 *
 * Declared once and reused by every single-ticket read so the two lookups can
 * never drift apart. List/paged reads deliberately do NOT use this list: the
 * comment bodies would bloat every grid response (see `pagedRequest`).
 */
const SUPPORT_TICKET_READ_POPULATE: any[] = [
  { path: 'createdBy' },
  { path: 'assignedTo' },
  { path: 'updatedBy' },
  { path: 'documents' },
  {
    path: 'comments',
    // Oldest first: a conversation is read top-to-bottom.
    options: { sort: { createdAt: 1 } },
    // Without this the ticket carries comment documents whose `user` is still
    // an ObjectId, so a reader can only print an id instead of a name.
    populate: { path: 'user' },
  },
];

/** A file (ticket attachment or comment attachment) as exposed to readers. */
export interface IReactorySupportTicketFileView {
  id: string;
  filename: string | null;
  alias: string | null;
  url: string | null;
  size: number | null;
  mimetype: string | null;
}

/** The author of a comment, resolved to something a reader can name. */
export interface IReactorySupportTicketCommentAuthor {
  id: string | null;
  name: string | null;
}

/** A comment as exposed by `getTicketComments`. */
export interface IReactorySupportTicketCommentView {
  id: string;
  text: string;
  createdAt: Date | null;
  author: IReactorySupportTicketCommentAuthor;
  /** Set when this comment is a reply; the parent is the referenced comment. */
  parentId: string | null;
  attachments: IReactorySupportTicketFileView[];
}

const idOf = (value: any): string => {
  if (value === null || value === undefined) return '';
  return String(value._id ?? value.id ?? value);
};

/** ObjectIds for the ids that are well-formed hex strings, ignoring the rest. */
const toObjectIds = (ids: string[]): ObjectId[] => ids
  .filter((id) => /^[a-fA-F0-9]{24}$/.test(id))
  .map((id) => new ObjectId(id));

/** Full display name for a user document, falling back to the handle/email. */
const displayNameOf = (user: any): string | null => {
  if (!user || typeof user !== 'object') return null;
  const fullName = [user.firstName, user.lastName]
    .filter((part: any) => typeof part === 'string' && part.trim().length > 0)
    .join(' ')
    .trim();
  if (fullName.length > 0) return fullName;
  if (typeof user.username === 'string' && user.username.length > 0) return user.username;
  if (typeof user.email === 'string' && user.email.length > 0) return user.email;
  return null;
};

/**
 * Resolve a stored file to a link a caller can actually open.
 *
 * `link` is the canonical, already-absolute CDN URL written at upload/catalog
 * time. Files created by older paths may carry a CDN-relative link or no link at
 * all, in which case the path + alias are used to build one.
 */
const fileUrl = (file: any): string | null => {
  const link = typeof file?.link === 'string' ? file.link.trim() : '';
  if (link.length > 0) {
    return /^(https?:)?\/\//i.test(link) ? link : safeCDNUrl(link);
  }
  const route = [file?.path, file?.alias]
    .filter((part: any) => typeof part === 'string' && part.trim().length > 0)
    .map((part: string) => part.replace(/^\/+/, ''))
    .join('/');
  return route.length > 0 ? safeCDNUrl(route) : null;
};

/** Map a `CoreFile`/`ReactoryFile` document to the reader-facing attachment shape. */
const toFileView = (file: any): IReactorySupportTicketFileView => ({
  id: idOf(file),
  filename: file?.filename ?? null,
  alias: file?.alias ?? null,
  url: fileUrl(file),
  size: typeof file?.size === 'number' ? file.size : null,
  // `CoreFile` stores the MIME type as `mimetype` (all lower case).
  mimetype: file?.mimetype ?? null,
});

/**
 * A comment's attachments live in the comment's `metadata` (the Comment schema
 * has no first-class attachment field). Accept every shape the writers use so
 * the read path does not lose them: ids, `{ fileId }` wrappers or file docs.
 */
const commentAttachmentEntries = (comment: any): any[] => {
  const metadata = comment?.metadata ?? {};
  const candidates = [
    comment?.attachments,
    metadata.attachments,
    metadata.files,
    metadata.fileIds,
    metadata.documents,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) return candidate;
  }
  return [];
};

@service({
  id: "core.ReactorySupportService@1.0.0",
  nameSpace: "core",
  name: "ReactorySupportService",
  version: "1.0.0",
  dependencies: [
      { id: 'core.ReactoryFileService@1.0.0', alias: 'fileService' }
    ],
  serviceType: "support",
  secondaryTypes: ["customerManagement", "user"]
})
class ReactorySupportService implements Reactory.Service.TReactorySupportService {

  private context: Reactory.Server.IReactoryContext
  private fileService: Reactory.Service.IReactoryFileService;

  constructor(props: Reactory.Service.IReactoryServiceProps, context: Reactory.Server.IReactoryContext) {
    this.context = context;
   }


  async updateTicket(ticket_id: string, updates: Reactory.Models.IReactorySupportTicketUpdate): Promise<Reactory.Models.IReactorySupportTicket | Reactory.Models.IReactorySupportTicketDocument> {

    const ticket: Reactory.Models.ReactorySupportDocument = await ReactorySupportTicketModel.findById(ticket_id).exec() as Reactory.Models.ReactorySupportDocument;

    if (!ticket) {
      throw new Error('Ticket not found');
     }

     // Check permissions
    const canUpdate = this.isAdminUser(this.context) ||
        ticket.createdBy.toString() === this.context.user._id.toString() ||
        (ticket.assignedTo && ticket.assignedTo.toString() === this.context.user._id.toString());

    if (!canUpdate) {
      throw new InsufficientPermissions('User does not have permission to update this ticket');
     }

     // Apply updates
    if (updates.request) ticket.request = updates.request;
    if (updates.description) ticket.description = updates.description;
    if (updates.status) ticket.status = canonicalEnum(updates.status);
    if (updates.requestType) ticket.requestType = updates.requestType;
    if (updates.assignTo) ticket.assignedTo = new ObjectId(updates.assignTo) as any;
    if (updates.priority) ticket.priority = updates.priority;
    if (updates.tags) ticket.tags = updates.tags;

    ticket.updatedDate = new Date();
    ticket.updatedBy = this.context.user as any;

     // Add comment if provided
    if (updates.comment) {
      const comment = await this.addComment(ticket._id.toString(), updates.comment);
      ticket.comments?.push(comment._id);
     }

    await ticket.save();
    await ticket.populate('createdBy assignedTo comments');

    return ticket;
   }

  async addComment(ticketId: string, commentText: string, parentId?: string, attachmentIds?: string[]): Promise<Reactory.Models.ICommentDocument> {
    const ticket = await ReactorySupportTicketModel.findById(ticketId).exec();

    if (!ticket) {
      throw new Error('Ticket not found');
     }

     // Check permissions
    const canComment = this.isAdminUser(this.context) ||
        ticket.createdBy.toString() === this.context.user._id.toString() ||
        (ticket.assignedTo && ticket.assignedTo.toString() === this.context.user._id.toString());

    if (!canComment) {
      throw new InsufficientPermissions('User does not have permission to comment on this ticket');
     }

     // Create comment
    const CommentModel = ReactoryCommentModel;
    const comment = new CommentModel({
      text: commentText,
      user: this.context.user._id,
      context: 'ReactorySupportTicket',
      contextId: ticket._id,
      createdAt: new Date(),
      parent: parentId ? new ObjectId(parentId) : undefined,
     });

    await comment.save();

     // Add to ticket
    ticket.comments.push(comment._id);
    ticket.updatedDate = new Date();
    await ticket.save();

    await comment.populate('user');

    return comment;
   }

  async attachDocument(ticket_id: string, fileIds: string[]): Promise<Reactory.Models.IReactorySupportTicket | Reactory.Models.IReactorySupportTicketDocument> {
    const ticket = await ReactorySupportTicketModel.findById(ticket_id).exec();

    if (!ticket) {
      throw new Error('Ticket not found');
     }

     // Check permissions
    const canAttach = this.isAdminUser(this.context) ||
        ticket.createdBy.toString() === this.context.user._id.toString() ||
        (ticket.assignedTo && ticket.assignedTo.toString() === this.context.user._id.toString());

    if (!canAttach) {
      throw new InsufficientPermissions('User does not have permission to attach files to this ticket');
     }

     // Add files to ticket
    for (const fileId of fileIds) {
      const file = await ReactoryFileModel.findById(fileId).exec();
      if (file && !ticket.documents.some((d: any) => d.toString() === fileId)) {
        ticket.documents.push(new ObjectId(fileId) as any);
       }
     }

    ticket.updatedDate = new Date();
    await ticket.save();
    await ticket.populate('documents');

    return ticket as Reactory.Models.IReactorySupportTicket;
   }

  isAdminUser(context: Reactory.Server.IReactoryContext): boolean {
    return context.hasRole("ADMIN") === true ||
        context.hasRole("SUPPORT_ADMIN") === true ||
        context.hasRole("SUPPORT") === true;
   }

  @roles(["USER", "ADMIN", "SUPPORT_ADMIN", "SUPPORT"])
  async pagedRequest(filter: Partial<Reactory.Models.IReactorySupportTicketFilter>,
    pagingRequest: Reactory.Models.IPagingRequest): Promise<Reactory.Models.IPagedReactorySupportTickets> {

    const result: Reactory.Models.IPagedReactorySupportTickets = {
      paging: {
        page: pagingRequest && pagingRequest.page ? pagingRequest.page : 1,
        pageSize: pagingRequest && pagingRequest.pageSize ? pagingRequest.pageSize : 10,
        total: 0,
        hasNext: false,
       },
      tickets: []
     };

    let params: any = {};

    if (!this.isAdminUser(this.context)) {
      params.createdBy = this.context.user._id;
     }

    if (filter) {
      if (filter.status && filter.status.length > 0) {
        params.status = { $in: enumVariants(filter.status) };
      }

      if (filter.priority && filter.priority.length > 0) {
        params.priority = { $in: enumVariants(filter.priority) };
      }

      if (filter.requestType && filter.requestType.length > 0) {
        params.requestType = { $in: enumVariants(filter.requestType) };
      }

      if (filter.reference && filter.reference.length > 0) {
        params.reference = { $in: filter.reference };
      }

      if (filter.tags && filter.tags.length > 0) {
        params.tags = { $in: filter.tags };
      }

      if (filter.assignedTo && filter.assignedTo.length > 0) {
        params.assignedTo = { $in: filter.assignedTo.map((id: string) => new ObjectId(id)) };
      }

      if (filter.showOverdueOnly === true) {
        // `isOverdue` is a Mongoose VIRTUAL derived from slaDeadline, so it cannot be used
        // as a query predicate - filtering on it matched nothing. Query the underlying
        // stored field instead.
        params.slaDeadline = { $ne: null, $lt: new Date() };
      }

      // The toolbar's "Unassigned" quick filter had no server representation, so it
      // silently returned every ticket. Matches both an explicit null and a missing field.
      if ((filter as any).unassignedOnly === true) {
        params.assignedTo = null;
      }

      // startDate / endDate / dateFields are declared on ReactorySupportTicketFilter but
      // were never applied, so date-scoped filters (e.g. "Resolved Today") could not
      // narrow the result set at all.
      const rawFilter: any = filter as any;
      const dateRange: any = {};
      if (rawFilter.startDate) dateRange.$gte = new Date(rawFilter.startDate);
      if (rawFilter.endDate) dateRange.$lte = new Date(rawFilter.endDate);
      if (Object.keys(dateRange).length > 0) {
        const dateFields: string[] =
          Array.isArray(rawFilter.dateFields) && rawFilter.dateFields.length > 0
            ? rawFilter.dateFields
            : ['updatedDate'];
        params.$and = (params.$and || []).concat(
          dateFields.map((field) => ({ [field]: dateRange })),
        );
      }


      if (filter?.searchString && filter.searchString.trim().length > 0) {
        const regex = { $regex: filter.searchString.trim(), $options: "i" };
        params.$or = [
          { request: regex },
          { description: regex },
          { reference: regex }
        ];
      }
    }

    let query: QueryWithHelpers<Reactory.Models.IReactorySupportTicketDocument[],
      Reactory.Models.IReactorySupportTicketDocument> = ReactorySupportTicketModel.find(params);

    if (pagingRequest) {
      try {
        result.paging.total = await query.count();
        result.tickets = await ReactorySupportTicketModel.find(params)
           .populate('createdBy')
           .populate('assignedTo')
           .skip((pagingRequest.page - 1) * pagingRequest.pageSize)
           .limit(pagingRequest.pageSize)
           .exec();
       } catch (e) {
        this.context.log(`Error: ${e.message}`, { e }, 'error');
       }
     }

    return result;
   }

  async createRequest(
    request: string,
    description: string,
    requestType?: string,
    meta?: any,
    formId?: string,
    /**
     * Ticket priority (critical | high | medium | low). Optional and trailing so
     * existing 5-arg callers keep working. When omitted we fall back to
     * `meta.priority` (callers such as the createSupportTicket tool carry it
     * through `meta`), then to the model default ('medium').
     *
     * Previously this argument did not exist and `priority` was never applied —
     * every ticket was created with the schema default 'medium'.
     */
    priority?: string,
  ): Promise<Reactory.Models.IReactorySupportTicket> {
    this.context.log('Creating new Support Request', { request, description, priority }, 'debug', 'core.ReactorySupportService@1.0.0');

    // Normalise priority to the canonical set; anything unrecognised (or absent)
    // is left undefined so the model default applies.
    const VALID_PRIORITIES = ['critical', 'high', 'medium', 'low'];
    const requestedPriority = String(
      priority ?? (meta && (meta as any).priority) ?? '',
    ).trim().toLowerCase();
    const resolvedPriority = VALID_PRIORITIES.includes(requestedPriority)
      ? requestedPriority
      : undefined;

    const ticket = new ReactorySupportTicketModel({
      request,
      description,
      requestType,
      meta,
      formId,
      status: "new",
      ...(resolvedPriority ? { priority: resolvedPriority } : {}),
      // HashUnsigned guarantees a non-negative numeric segment. String(user._id)
      // is used so the hash input is stable (hashing a raw ObjectId previously
      // produced 0, yielding the meaningless "REACTORY-0" prefix).
      reference: `${this.context.partner.key}-${HashUnsigned(String(this.context.user._id))}/${moment().format('YYYYMMDD')}/${HashUnsigned(request)}`.toUpperCase(),
      createdBy: this.context.user,
      updatedBy: this.context.user,
      comments: [],
      documents: []
     });

    await ticket.save();

    return ticket;
   }

  /**
   * Read authorisation shared by every single-ticket lookup.
   *
   * Support staff see the whole tenant; everybody else may only read a ticket
   * they created or are assigned to. `createdBy`/`assignedTo` may be a raw
   * ObjectId or a populated document depending on how the caller loaded the
   * ticket, so both shapes are handled.
   */
  private assertCanViewTicket(ticket: Reactory.Models.ReactorySupportDocument): void {
    if (this.isAdminUser(this.context)) return;

    const userId = String(this.context.user._id);
    const idOf = (value: any): string => {
      if (value === null || value === undefined) return '';
      return String(value._id ?? value);
    };

    const isCreator = idOf(ticket.createdBy) === userId;
    const isAssignee = idOf(ticket.assignedTo) === userId;

    if (!isCreator && !isAssignee) {
      throw new InsufficientPermissions('User does not have permission to view ticket');
     }
   }

  @roles(["USER", "ADMIN", "SUPPORT_ADMIN", "SUPPORT"])
  async getTicket(id: string): Promise<Reactory.Models.ReactorySupportDocument> {

    const ticket = await ReactorySupportTicketModel.findById(id)
        .populate(SUPPORT_TICKET_READ_POPULATE)
        .exec() as Reactory.Models.ReactorySupportDocument;

    if (!ticket) {
      throw new Error('Ticket not found');
     }

    this.assertCanViewTicket(ticket);

    return ticket;
   }

  /**
   * Load a single ticket by its reference.
   *
   * The reference is the ticket's shareable identifier and the key the details
   * page is addressed by. It is matched exactly (references are stored
   * upper-case) after stripping the whitespace/slashes a URL can introduce.
   *
   * Returns `null` when nothing matches so the details page can render a
   * "ticket not found" state; a ticket that exists but belongs to somebody else
   * throws `InsufficientPermissions`, exactly like `getTicket`.
   */
  @roles(["USER", "ADMIN", "SUPPORT_ADMIN", "SUPPORT"])
  async getTicketByReference(reference: string): Promise<Reactory.Models.ReactorySupportDocument | null> {
    // A URL may arrive with surrounding whitespace or with the trailing slash a
    // copied link can pick up (the splat captures `/REF/` verbatim). Neither is
    // part of the stored reference.
    const normalisedReference = String(reference ?? '').trim().replace(/^\/+|\/+$/g, '');
    if (normalisedReference.length === 0) return null;

    const ticket = await ReactorySupportTicketModel.findOne({ reference: normalisedReference })
        .populate(SUPPORT_TICKET_READ_POPULATE)
        .exec() as Reactory.Models.ReactorySupportDocument;

    if (!ticket) return null;

    this.assertCanViewTicket(ticket);

    return ticket;
   }

  /**
   * The ticket conversation, oldest comment first.
   *
   * Comments are returned flat with an explicit `parentId` rather than as a
   * nested tree: a caller that wants a thread can build one from `parentId`,
   * and a caller that only wants the transcript does not have to walk it.
   *
   * Moderated comments (`removed: true`) are excluded, matching the platform's
   * default for every other comment surface (`getCommentsByContext` and the
   * ticket details field both hide them unless removal is explicitly opted
   * into). A transcript that showed hidden comments would be a second,
   * inconsistent definition of "the conversation".
   *
   * Goes through `assertCanViewTicket`, so reading the conversation never
   * widens access to the ticket itself.
   */
  @roles(["USER", "ADMIN", "SUPPORT_ADMIN", "SUPPORT"])
  async getTicketComments(ticketId: string): Promise<IReactorySupportTicketCommentView[]> {
    const ticket = await ReactorySupportTicketModel.findById(ticketId)
        .exec() as Reactory.Models.ReactorySupportDocument;

    if (!ticket) {
      throw new Error('Ticket not found');
     }

    this.assertCanViewTicket(ticket);

    // `comments` is the ticket's authoritative, ordered membership list. A
    // comment is only part of the conversation if the ticket references it.
    const commentIds = ((ticket.comments || []) as any[])
      .map((comment: any) => idOf(comment))
      .filter((id: string) => id.length > 0);

    if (commentIds.length === 0) return [];

    const comments = await ReactoryCommentModel.find({
      _id: { $in: commentIds },
      removed: { $ne: true },
    })
      .sort({ createdAt: 1, _id: 1 })
      .populate({ path: 'user' })
      .exec() as any[];

    // Resolve every attachment id referenced by any comment in one query.
    const attachmentEntriesByComment = new Map<string, any[]>();
    const attachmentIds: string[] = [];
    comments.forEach((comment: any) => {
      const entries = commentAttachmentEntries(comment);
      attachmentEntriesByComment.set(idOf(comment), entries);
      entries.forEach((entry: any) => {
        // Populated file documents carry their own metadata; only unresolved
        // entries need a lookup.
        if (entry && typeof entry === 'object' && (entry.filename || entry.alias || entry.link)) return;
        const id = idOf(entry?.fileId ?? entry?.id ?? entry);
        if (id.length > 0 && !attachmentIds.includes(id)) attachmentIds.push(id);
      });
    });

    const attachmentObjectIds = toObjectIds(attachmentIds);
    const files = attachmentObjectIds.length > 0
      ? await ReactoryFileModel.find({ _id: { $in: attachmentObjectIds } }).exec() as any[]
      : [];
    const filesById = new Map<string, any>();
    files.forEach((file: any) => filesById.set(idOf(file), file));

    return comments.map((comment: any) => {
      const entries = attachmentEntriesByComment.get(idOf(comment)) || [];
      const attachments = entries
        .map((entry: any) => {
          if (entry && typeof entry === 'object' && (entry.filename || entry.alias || entry.link)) {
            return toFileView(entry);
          }
          const id = idOf(entry?.fileId ?? entry?.id ?? entry);
          const file = filesById.get(id);
          return file ? toFileView(file) : null;
        })
        .filter((attachment: IReactorySupportTicketFileView | null): attachment is IReactorySupportTicketFileView => attachment !== null);

      const author = comment.user;
      return {
        id: idOf(comment),
        text: typeof comment.text === 'string' ? comment.text : '',
        createdAt: comment.createdAt ? new Date(comment.createdAt) : null,
        author: {
          // A populate miss leaves the raw ObjectId: keep the id, but never
          // pretend we know the name.
          id: author ? idOf(author) : null,
          name: displayNameOf(author),
        },
        parentId: comment.parent ? idOf(comment.parent) : null,
        attachments,
      };
    });
   }

  /**
   * The ticket's attachments, resolved to reader-facing metadata.
   *
   * Uses the ticket's `documents` list as the source of truth and preserves its
   * order. Permission is the ticket's read permission; there is no separate
   * file-level check to bypass.
   */
  @roles(["USER", "ADMIN", "SUPPORT_ADMIN", "SUPPORT"])
  async listTicketDocuments(ticketId: string): Promise<IReactorySupportTicketFileView[]> {
    const ticket = await ReactorySupportTicketModel.findById(ticketId)
        .exec() as Reactory.Models.ReactorySupportDocument;

    if (!ticket) {
      throw new Error('Ticket not found');
     }

    this.assertCanViewTicket(ticket);

    const documentIds = ((ticket.documents || []) as any[])
      .map((document: any) => idOf(document._id ?? document.id ?? document))
      .filter((id: string) => id.length > 0);

    if (documentIds.length === 0) return [];

    const files = await ReactoryFileModel.find({
      _id: { $in: toObjectIds(documentIds) },
    }).exec() as any[];

    const filesById = new Map<string, any>();
    files.forEach((file: any) => filesById.set(idOf(file), file));

    // Preserve the order in which the files were attached to the ticket and
    // drop ids whose file no longer exists rather than returning a null row.
    return documentIds
      .map((id: string) => filesById.get(id))
      .filter((file: any) => file !== undefined)
      .map((file: any) => toFileView(file));
   }

  onStartup(): Promise<any> {
    return Promise.resolve(true)
   }

  @roles(["USER", "ADMIN", "SUPPORT_ADMIN", "SUPPORT"])
  async deleteRequest(ids: string[], reason: string): Promise<void> {
    if (!ids || ids.length === 0) {
      return;
     }

    const filter = {
      _id: { $in: ids.map(id => new ObjectId(id)) },
     };

     // Soft-delete: mark as removed with reason and timestamp
    const result = await ReactorySupportTicketModel.updateMany(filter, {
      $set: {
        status: 'closed',
        updatedDate: new Date(),
        meta: {
           ...((this as any).meta || {}),
          deletedAt: new Date(),
          deletedBy: this.context.user._id,
          deleteReason: reason || 'No reason provided',
         },
       },
     }).exec();

    this.context.log(`Deleted ${result.modifiedCount} support ticket(s)`, {
      ids,
      reason,
      modifiedCount: result.modifiedCount
    }, 'info', 'core.ReactorySupportService@1.0.0');
   }

  getExecutionContext(): Reactory.Server.IReactoryContext {
    return this.context;
   }
  setExecutionContext(context: Reactory.Server.IReactoryContext): boolean {
    this.context = context
    return true;
   }

  setFileService(fileService: Reactory.Service.IReactoryFileService): void {
    this.fileService = fileService;
   }
}


export default ReactorySupportService;
