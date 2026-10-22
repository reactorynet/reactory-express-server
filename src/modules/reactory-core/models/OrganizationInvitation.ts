import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

/**
 * Lifecycle of an organization membership invitation (ORG-023).
 *
 * `pending`  - the invitation is waiting for the invitee to authenticate.
 * `accepted` - the membership was created/re-activated on the invitee's login.
 * `revoked`  - an administrator withdrew the invitation before acceptance.
 */
export const ORGANIZATION_INVITATION_STATUSES = ['pending', 'accepted', 'revoked'] as const;

export type OrganizationInvitationStatus = typeof ORGANIZATION_INVITATION_STATUSES[number];

/**
 * A pending invitation to join an organization, keyed by email.
 *
 * An invitation is deliberately NOT a `User` document. `User` requires a
 * password and salt (and holds a unique email index), so creating a shell
 * account for an address that has never signed up would both invent a
 * credential and collide with the real self-registration path. The invitation
 * therefore records who was invited, for which organization, with which roles,
 * and is converted into a `User.memberships` entry by
 * `OrganizationService.acceptPendingInvitations` on the invitee's first login
 * (the same login-provisioning path that applies
 * `login_partner_keys` / `add_default_membership`).
 *
 * `organizationId` is required: this collection exists only for org-scoped
 * membership. Client-wide memberships (`organizationId: null`) are a separate
 * concept and are never represented here.
 */
export interface IOrganizationInvitation {
  clientId: any;
  organizationId: any;
  email: string;
  roles?: string[];
  /** Optional business unit the invitee should be associated with. */
  businessUnitId?: any;
  status: OrganizationInvitationStatus;
  invitedBy?: any;
  acceptedAt?: Date;
  acceptedBy?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export type IOrganizationInvitationDocument = mongoose.Document & IOrganizationInvitation;

const OrganizationInvitationSchema = new mongoose.Schema<IOrganizationInvitationDocument>({
  clientId: {
    type: ObjectId,
    ref: 'ReactoryClient',
    required: true,
  },
  organizationId: {
    type: ObjectId,
    ref: 'Organization',
    required: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  roles: [String],
  businessUnitId: {
    type: ObjectId,
    ref: 'BusinessUnit',
  },
  status: {
    type: String,
    enum: ORGANIZATION_INVITATION_STATUSES,
    default: 'pending',
    required: true,
  },
  invitedBy: {
    type: ObjectId,
    ref: 'User',
  },
  acceptedAt: Date,
  acceptedBy: {
    type: ObjectId,
    ref: 'User',
  },
  createdAt: Date,
  updatedAt: Date,
});

// Looking up an invitee's pending invitations happens on every authenticated
// login provisioning pass, so it must be indexed by email within the client.
OrganizationInvitationSchema.index({ clientId: 1, email: 1, status: 1 });

// Listing an organization's pending invitations (People tab) is org-scoped.
OrganizationInvitationSchema.index({ clientId: 1, organizationId: 1, status: 1 });

const OrganizationInvitationModel = mongoose.model<IOrganizationInvitationDocument>(
  'OrganizationInvitation',
  OrganizationInvitationSchema,
  'reactory_organization_invitations',
);

export default OrganizationInvitationModel;
