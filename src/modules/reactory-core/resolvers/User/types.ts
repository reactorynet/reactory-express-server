import { ObjectId } from 'mongodb';

export type ObjID = string | ObjectId;
export type Any = any;
// GraphQL Date scalar can be a Date object or an ISO string
export type Date = globalThis.Date | string; 

// Base Types (Placeholders for external references)
export type Organization = any;
export type BusinessUnit = any;
export type ReactoryClient = any;
export type AuthProvider = any;
export type PagingResult = any;
export type ReactoryUXMessage = any;
export type PagingRequest = any;
export type CoreSimpleResponse = any;
export type Email = any;


/**
 * Enumeration of peer relationship types.
 * Used to define the hierarchical or functional relationship between users.
 */
export enum PeerType {
  peer = 'peer',
  manager = 'manager',
  report = 'report',
  vendor = 'vendor',
  client = 'client',
  partner = 'partner'
}

/**
 * Represents a user's active or past session.
 * Used for tracking login activity and security.
 */
export interface UserSession {
  id?: ObjID;
  host?: string;
  client?: string;
  started?: Date;
  expires?: Date;
  refresh?: string;
}

/**
 * Represents a single peer relationship for a user.
 */
export interface Peer {
  user?: User;
  relationship?: PeerType;
  isInternal?: boolean;
  inviteSent?: boolean;
  confirmed?: boolean;
  confirmedAt?: Date;
}

/**
 * Container for a user's peer relationships within a specific organization.
 */
export interface UserPeers {
  id?: ObjID;
  organization?: Organization;
  user?: User;
  allowEdit?: boolean;
  peers?: Peer[];
  confirmedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Represents a user's membership within a client, organization, and business unit structure.
 * This defines their access scope and roles.
 */
export interface UserMembership {
  id?: string;
  client?: ReactoryClient;
  organization?: Organization;
  businessUnit?: BusinessUnit;
  roles?: string[];
  enabled?: boolean;
  created?: Date;
  lastLogin?: Date;
}

/**
 * Stores authentication details for external providers or API keys.
 */
export interface UserAuthentication {
  id?: ObjID;
  provider?: string;
  props?: Any;
  lastLogin?: Date;
}

/**
 * System metadata for the user record.
 */
export interface UserMeta {
  id?: ObjID;
  lastSync?: Date;
  nextSync?: Date;
  mustSync?: boolean;
  reference?: string;
  owner?: string;
  source?: Any;
}

/**
 * # User
 * The core Reactory user entity. Represents a person or system account in the platform.
 */
export interface User extends Reactory.Models.IUserDocument {
  __typename: 'User';
}

/**
 * Result type for paginated user queries.
 */
export interface PagedUserResults {
  paging?: PagingResult;
  users?: Partial<Reactory.Models.IUserDocument>[];
}

/**
 * Result of a profile refresh operation.
 */
export interface ProfileRefreshResult {
  user?: User;
  messages?: ReactoryUXMessage[];
}

/**
 * Standard failure response for user queries.
 */
export interface ReactoryUserQueryFailed {
  message?: string;
  code?: string;
}

export type ReactoryUserQueryResult = ReactoryUserQueryFailed | PagedUserResults;

/**
 * Input filters for querying users via `ReactoryUsers`.
 */
export interface ReactoryUserFilterInput {
  organizationId?: string;
  businessUnitId?: string;
  searchString?: string;
  roles?: string[];
  includeDeleted?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
  firstName?: string;
  lastName?: string;
  email?: string;
  customFilters?: Any;
}

/**
 * Input payload for creating a new user.
 */
export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  mobileNumber?: string;
  avatar?: string;
  businessUnit?: string;
  authProvider?: AuthProvider;
  providerId?: string;
}

/**
 * Input for inviting a peer.
 */
export interface InvitePeer {
  email?: string;
}

/**
 * Input payload for updating basic user information.
 */
export interface UpdateUserInput {
  id?: string;
  email?: string;
  avatar?: string;
  firstName?: string;
  lastName?: string;
  mobileNumber?: string;
  authProvider?: string;
  businessUnit?: string;
  providerId?: string;
  lastLogin?: Date;
  deleted?: boolean;
}

/**
 * Input payload for password change operations.
 */
export interface UpdatePasswordInput {
  password?: string;
  confirmPassword?: string;
  authToken?: string;
}

/**
 * Input for defining a peer relationship.
 */
export interface PeerInput {
  user?: string;
  relationship?: PeerType;
  isInternal?: boolean;
}

/**
 * Structure for sending emails via GraphQL.
 */
export interface SendMailInput {
  id: string;
  via: string;
  subject: string;
  contentType?: string;
  content: string;
  recipients: string[];
  ccRecipients?: string[];
  bcc?: string[];
  saveToSentItems?: boolean;
}

/**
 * Input for creating a basic task.
 */
export interface CreateTaskInput {
  id: string;
  via: string;
  subject: string;
  startDate: Date;
  dueDate: Date;
  timeZone?: string;
}

/**
 * Input for deleting a task.
 */
export interface DeleteTaskInput {
  via: string;
  taskId: string;
}

/**
 * Result of an email sending operation.
 */
export interface SendMailResult {
  Successful: boolean;
  Message: string;
  TaskId?: string;
}


