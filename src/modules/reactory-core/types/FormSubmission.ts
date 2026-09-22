/**
 * Types for the generic form submission pipeline.
 *
 * A form opts into the pipeline by declaring a `submission` block on its
 * definition. `Reactory.Forms.IReactoryForm` carries an index signature, so the
 * property is legal on any form definition without requiring a release of
 * `@reactorynet/reactory-core`. Use `getSubmissionConfig()` on the
 * `ReactoryFormSubmissionService` rather than reading the raw property so that
 * defaults are applied consistently.
 */

/** The operators the submission filter DSL understands. */
export type SubmissionFilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'nin'
  | 'exists'
  | 'isNull'
  | 'between';

/**
 * How the value stored at `path` should be interpreted when it is compared.
 *
 * JSONB values come out of Postgres as text, so a comparison has to say what it
 * means. `number` casts both sides to numeric, `boolean` compares the JSONB
 * value against `true` / `false`, and `date` compares ISO-8601 strings
 * lexicographically (which orders correctly for ISO timestamps). `string` is
 * the default.
 */
export type SubmissionFilterValueType = 'string' | 'number' | 'boolean' | 'date';

/** A single predicate against a path inside the submission's formData. */
export interface SubmissionFilterCondition {
  /**
   * Dot / bracket path into the form data document, e.g. `address.country` or
   * `lines[0].sku`. The path is passed to Postgres as a parameterised text
   * array, never interpolated into SQL.
   */
  path: string;
  op: SubmissionFilterOperator;
  value?: unknown;
  valueType?: SubmissionFilterValueType;
}

/** A boolean grouping of predicates. Exactly one key must be set. */
export interface SubmissionFilterGroup {
  and?: SubmissionFilterNode[];
  or?: SubmissionFilterNode[];
  not?: SubmissionFilterNode;
}

export type SubmissionFilterNode = SubmissionFilterCondition | SubmissionFilterGroup;

/** The filter accepted by the submissions query. */
export interface ReactoryFormSubmissionFilter {
  /** Only return submissions created on or after this instant. */
  from?: Date | string;
  /** Only return submissions created on or before this instant. */
  to?: Date | string;
  /** Restrict to a single submitting user (MongoDB ObjectId string). */
  userId?: string;
  /** Only anonymous submissions when true, only authenticated when false. */
  anonymous?: boolean;
  /** Case insensitive substring match over the whole form data document. */
  search?: string;
  /** The structured predicate evaluated inside the form data document. */
  query?: SubmissionFilterNode;
}

export interface ReactoryFormSubmissionPaging {
  page?: number;
  pageSize?: number;
}

export interface ReactoryFormSubmissionSort {
  /** `createdAt`, `updatedAt` or a `formData.<path>` expression. */
  field?: string;
  direction?: 'asc' | 'desc';
}

/**
 * The `submission` block a form declares to join the generic pipeline.
 *
 * @example
 * const ContactForm: Reactory.Forms.IReactoryForm = {
 *   id: 'contact.Form@1.0.0',
 *   schema, uiSchema,
 *   submission: {
 *     enabled: true,
 *     allowAnonymous: true,
 *     readRoles: ['ADMIN'],
 *   },
 * };
 */
export interface ReactoryFormSubmissionConfig {
  /** Must be explicitly true - the pipeline never engages by inference. */
  enabled: boolean;
  /**
   * Allow submissions from users holding only the ANON role. The stored
   * `userId` is null for those submissions.
   */
  allowAnonymous?: boolean;
  /**
   * Roles permitted to submit. Defaults to the form's own `roles`, or
   * `['USER']` when the form declares none.
   */
  submitRoles?: string[];
  /** Roles permitted to read submissions in the explorer. Defaults to `['ADMIN']`. */
  readRoles?: string[];
  /** Roles permitted to delete submissions. Defaults to `readRoles`. */
  deleteRoles?: string[];
  /**
   * Allow a submitter to amend their own submission by passing the submission
   * id back on the mutation. Off by default - the table is append only.
   */
  allowUpdate?: boolean;
  /**
   * Rate limit applied per remote address. Defaults to 20 submissions per
   * minute for anonymous forms; authenticated forms are not limited unless a
   * limit is declared.
   */
  rateLimit?: {
    max: number;
    windowSeconds: number;
  };
  /** Notification title shown by the injected mutation on success. */
  successMessage?: string;
  /** Optional url the form redirects to after a successful submission. */
  onSuccessUrl?: string;
}

/** The shape the service returns for a single submission. */
export interface ReactoryFormSubmissionResult {
  id: string;
  fqn: string;
  clientKey?: string;
  userId?: string;
  formData: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReactoryFormSubmissionListResult {
  paging: {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
  };
  submissions: ReactoryFormSubmissionResult[];
}

export interface ReactoryFormSubmissionStats {
  fqn: string;
  total: number;
  anonymousCount: number;
  uniqueUsers: number;
  firstSubmission?: Date;
  lastSubmission?: Date;
}
